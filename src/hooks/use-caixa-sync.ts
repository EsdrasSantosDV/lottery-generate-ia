import { useEffect, useState, useCallback, useRef } from 'react';
import CaixaSyncWorker from '@/workers/caixa-sync-worker.ts?worker';
import { getCaixaApiBase, getSegmentForMode, SYNC_SUPPORTED_MODE_IDS } from '@/lib/caixa-api-paths';
import type { CaixaSyncWorkerOutgoing } from '@/lib/caixa-sync-messages';
import { syncPayloadToDocument } from '@/lib/caixa-dto';
import {
  bulkUpsertDraws,
  getMaxNumeroForMode,
  recomputeAllHistoricalStats,
  recomputeHistoricalStatsForMode,
  upsertSyncMeta,
} from '@/lib/lottery-official-supabase';
import { checkModesUpToDate } from '@/lib/caixa-sync-uptodate';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-client';

export type CaixaSyncUiStatus = 'idle' | 'checking' | 'running' | 'done' | 'error';

/** Evita dois workers; em erro libera para nova tentativa após recarregar. */
let syncLock = false;

export function useCaixaSync() {
  const [status, setStatus] = useState<CaixaSyncUiStatus>('idle');
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fetchedThisRunRef = useRef(0);

  const runSync = useCallback(async () => {
    try {
      setStatus('checking');
      setErrorMessage(null);

      if (!isSupabaseConfigured()) {
        setErrorMessage('Configure VITE_SUPABASE_URL e chave no .env para sincronizar sorteios oficiais.');
        setStatus('error');
        return;
      }

      const sb = getSupabaseClient();
      if (!sb) {
        setErrorMessage('Cliente Supabase indisponível.');
        setStatus('error');
        return;
      }

      if (syncLock) return;
      syncLock = true;
      fetchedThisRunRef.current = 0;

      setStatus('running');
      const baseUrl = getCaixaApiBase();

      const modes = await Promise.all(
        SYNC_SUPPORTED_MODE_IDS.map(async (modeId) => {
          const segment = getSegmentForMode(modeId);
          if (!segment) return null;
          const maxNumeroLocal = await getMaxNumeroForMode(sb, modeId);
          await upsertSyncMeta(sb, {
            id: modeId,
            lastConcursoNumero: maxNumeroLocal,
            totalFetched: 0,
            status: 'running',
            lastSyncAt: Date.now(),
            errorMessage: '',
          });
          return { modeId, segment, maxNumeroLocal };
        })
      );

      const payload = modes.filter((m): m is NonNullable<typeof m> => m != null);

      const backfillRaw = import.meta.env.VITE_CAIXA_BACKFILL_FROM_CONCURSO as string | undefined;
      const backfillParsed =
        backfillRaw != null && String(backfillRaw).trim() !== ''
          ? parseInt(String(backfillRaw), 10)
          : NaN;
      const backfillFromConcurso = Number.isFinite(backfillParsed) ? backfillParsed : undefined;

      /** Sem backfill: se já há todos os concursos até o último publicado, não inicia o worker. */
      if (!backfillFromConcurso) {
        const check = await checkModesUpToDate(baseUrl, payload);
        if (check.allUpToDate) {
          for (const m of payload) {
            const latest = check.latestByModeId.get(m.modeId) ?? m.maxNumeroLocal;
            await upsertSyncMeta(sb, {
              id: m.modeId,
              lastConcursoNumero: latest,
              totalFetched: 0,
              status: 'done',
              lastSyncAt: Date.now(),
              errorMessage: '',
            });
          }
          syncLock = false;
          setProgressLabel('');
          setStatus('done');
          return;
        }
      }

      const worker = new CaixaSyncWorker();
      workerRef.current = worker;

      /** Evita vários upserts em paralelo no mesmo fluxo. */
      let batchWriteQueue = Promise.resolve();

      worker.onmessage = async (ev: MessageEvent<CaixaSyncWorkerOutgoing>) => {
        try {
          const msg = ev.data;
          if (msg.type === 'ready') {
            return;
          }
          if (msg.type === 'progress') {
            setProgressLabel(`${msg.modeId}: ${msg.current}/${msg.total}`);
            return;
          }
          if (msg.type === 'batch') {
            const docs = msg.draws.map(syncPayloadToDocument);
            const op = batchWriteQueue.then(() => bulkUpsertDraws(sb, docs));
            batchWriteQueue = op.catch(() => {});
            await op;
            return;
          }
          if (msg.type === 'mode-done') {
            fetchedThisRunRef.current += msg.fetchedCount;
            await upsertSyncMeta(sb, {
              id: msg.modeId,
              lastConcursoNumero: msg.latestRemote,
              totalFetched: msg.fetchedCount,
              status: 'done',
              lastSyncAt: Date.now(),
              errorMessage: '',
            });
            if (msg.fetchedCount > 0) {
              await recomputeHistoricalStatsForMode(sb, msg.modeId);
            }
            return;
          }
          if (msg.type === 'mode-error') {
            await upsertSyncMeta(sb, {
              id: msg.modeId,
              lastConcursoNumero: await getMaxNumeroForMode(sb, msg.modeId),
              totalFetched: 0,
              status: 'error',
              lastSyncAt: Date.now(),
              errorMessage: msg.message,
            });
            return;
          }
          if (msg.type === 'complete') {
            if (fetchedThisRunRef.current > 0) {
              await recomputeAllHistoricalStats(sb);
            }
            syncLock = false;
            setProgressLabel('');
            setStatus('done');
            worker.terminate();
            workerRef.current = null;
            return;
          }
          if (msg.type === 'error') {
            syncLock = false;
            setErrorMessage(msg.message);
            setStatus('error');
            worker.terminate();
            workerRef.current = null;
          }
        } catch (err) {
          syncLock = false;
          setErrorMessage(err instanceof Error ? err.message : String(err));
          setStatus('error');
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.onerror = (err) => {
        syncLock = false;
        setErrorMessage(err.message);
        setStatus('error');
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({
        type: 'start',
        baseUrl,
        requestDelayMs: 80,
        batchSize: 40,
        modes: payload,
        backfillFromConcurso,
      });
    } catch (err) {
      syncLock = false;
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void runSync();
  }, [runSync]);

  return { status, progressLabel, errorMessage };
}
