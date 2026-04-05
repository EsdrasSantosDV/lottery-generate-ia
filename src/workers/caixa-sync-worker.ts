/// <reference lib="webworker" />

import { fetchCaixaJsonWithBackoff, jitterMs } from '@/lib/caixa-fetch';
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
    const { baseUrl, requestDelayMs, batchSize, modes } = data;
    cancelled = false;
    post({ type: 'ready' });

    try {
      for (const { modeId, segment, contestNumbers, latestRemote } of modes) {
        if (cancelled) break;

        await delay(requestDelayMs + jitterMs(0, 200));

        if (contestNumbers.length === 0) {
          post({
            type: 'mode-done',
            modeId,
            latestRemote,
            fetchedCount: 0,
          });
          continue;
        }

        const total = contestNumbers.length;
        let pending: LotteryDrawSyncPayload[] = [];
        let fetchedCount = 0;

        for (let i = 0; i < contestNumbers.length; i++) {
          if (cancelled) break;
          const n = contestNumbers[i]!;
          await delay(requestDelayMs + jitterMs(0, 250));
          post({
            type: 'progress',
            modeId,
            phase: 'fetch',
            current: i + 1,
            total,
          });

          const url = buildCaixaContestUrl(baseUrl, segment, n);
          let json: unknown;
          try {
            json = await fetchCaixaJsonWithBackoff(url, {
              minDelayMs: requestDelayMs,
              maxAttempts: 12,
              isCancelled: () => cancelled,
            });
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
          latestRemote,
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
