/// <reference lib="webworker" />

import { caixaFetchInit } from '@/lib/caixa-fetch';
import { buildCaixaContestUrl } from '@/lib/caixa-api-paths';
import { normalizedToDrawDocument } from '@/lib/caixa-dto';
import { normalizeCaixaResultado } from '@/lib/caixa-schemas';
import type {
  CaixaSyncWorkerIncoming,
  CaixaSyncWorkerOutgoing,
  LotteryDrawSyncPayload,
} from '@/lib/caixa-sync-messages';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let cancelled = false;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithRetry(url: string, requestDelayMs: number): Promise<unknown> {
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (cancelled) throw new Error('cancelado');
    try {
      const res = await fetch(url, caixaFetchInit);
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        await delay(requestDelayMs + 200 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      return JSON.parse(text) as unknown;
    } catch (e) {
      if (attempt === maxAttempts - 1) throw e;
      await delay(requestDelayMs + 150 * (attempt + 1));
    }
  }
  throw new Error('fetch falhou');
}

function post(o: CaixaSyncWorkerOutgoing): void {
  ctx.postMessage(o);
}

function sendBatch(draws: LotteryDrawSyncPayload[]): void {
  if (draws.length === 0) return;
  post({ type: 'batch', draws: [...draws] });
}

ctx.onmessage = (e: MessageEvent<CaixaSyncWorkerIncoming>) => {
  const data = e.data;
  if (data.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (data.type !== 'start') return;

  void (async () => {
    const { baseUrl, requestDelayMs, batchSize, modes, backfillFromConcurso } = data;
    cancelled = false;
    post({ type: 'ready' });

    try {
      for (const { modeId, segment, maxNumeroLocal } of modes) {
        if (cancelled) break;

        await delay(requestDelayMs);
        let latestJson: unknown;
        try {
          latestJson = await fetchJsonWithRetry(buildCaixaContestUrl(baseUrl, segment), requestDelayMs);
        } catch (err) {
          post({
            type: 'mode-error',
            modeId,
            message: err instanceof Error ? err.message : String(err),
          });
          continue;
        }

        const latestNorm = normalizeCaixaResultado(latestJson);
        if (!latestNorm) {
          post({ type: 'mode-error', modeId, message: 'Resposta inválida (último concurso)' });
          continue;
        }

        const latestNum = latestNorm.numero;
        const start = Math.max(
          1,
          backfillFromConcurso != null && Number.isFinite(backfillFromConcurso)
            ? backfillFromConcurso
            : maxNumeroLocal + 1
        );
        if (start > latestNum) {
          post({
            type: 'mode-done',
            modeId,
            latestRemote: latestNum,
            fetchedCount: 0,
          });
          continue;
        }

        const total = latestNum - start + 1;
        let pending: LotteryDrawSyncPayload[] = [];
        let fetchedCount = 0;

        for (let n = start; n <= latestNum; n++) {
          if (cancelled) break;
          await delay(requestDelayMs);
          post({
            type: 'progress',
            modeId,
            phase: 'fetch',
            current: n - start + 1,
            total,
          });

          const url = buildCaixaContestUrl(baseUrl, segment, n);
          let json: unknown;
          try {
            json = await fetchJsonWithRetry(url, requestDelayMs);
          } catch {
            continue;
          }

          const norm = normalizeCaixaResultado(json);
          if (!norm) continue;

          const fetchedAt = Date.now();
          const doc = normalizedToDrawDocument(modeId, norm, fetchedAt);
          const payload: LotteryDrawSyncPayload = {
            id: doc.id,
            modeId: doc.modeId,
            numero: doc.numero,
            dataApuracao: doc.dataApuracao,
            dezenas: doc.dezenas,
            dezenasSegundoSorteio: doc.dezenasSegundoSorteio,
            tipoJogo: doc.tipoJogo,
            ultimoConcurso: doc.ultimoConcurso,
            fetchedAt: doc.fetchedAt,
            dataProximoConcurso: doc.dataProximoConcurso,
            valorArrecadado: doc.valorArrecadado,
            valorEstimadoProximoConcurso: doc.valorEstimadoProximoConcurso,
            valorAcumuladoProximoConcurso: doc.valorAcumuladoProximoConcurso,
            valorAcumuladoConcurso_0_5: doc.valorAcumuladoConcurso_0_5,
            valorAcumuladoConcursoEspecial: doc.valorAcumuladoConcursoEspecial,
            valorSaldoReservaGarantidora: doc.valorSaldoReservaGarantidora,
            valorTotalPremioFaixaUm: doc.valorTotalPremioFaixaUm,
            rateioPremio: doc.rateioPremio,
          };
          pending.push(payload);
          fetchedCount++;
          if (pending.length >= batchSize) {
            sendBatch(pending);
            pending = [];
          }
        }

        sendBatch(pending);

        post({
          type: 'mode-done',
          modeId,
          latestRemote: latestNum,
          fetchedCount,
        });
      }

      if (!cancelled) {
        post({ type: 'complete' });
      }
    } catch (err) {
      post({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  })();
};
