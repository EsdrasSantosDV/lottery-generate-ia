import { useEffect, useState, useCallback, useRef } from 'react';
import CaixaSyncWorker from '@/workers/caixa-sync-worker.ts?worker';
import { getCaixaApiBase, getSegmentForMode, SYNC_SUPPORTED_MODE_IDS } from '@/lib/caixa-api-paths';
import type { CaixaSyncWorkerOutgoing } from '@/lib/caixa-sync-messages';
import { syncPayloadToDocument } from '@/lib/caixa-dto';
import { getDatabase } from '@/db/database';
import {
  bulkUpsertDraws,
  getMaxNumeroForMode,
  recomputeAllHistoricalStats,
  recomputeHistoricalStatsForMode,
  upsertSyncMeta,
} from '@/db/lottery-results-service';
import { bidirectionalLotterySupabaseSync } from '@/lib/lottery-supabase-sync';

export type CaixaSyncUiStatus = 'idle' | 'checking' | 'running' | 'done' | 'error';

/** Evita dois workers; em erro libera para nova tentativa após recarregar. */
let syncLock = false;

export function useCaixaSync() {
  const [status, setStatus] = useState<CaixaSyncUiStatus>('idle');
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const runSync = useCallback(async () => {
    try {
      setStatus('checking');
      setErrorMessage(null);
      const db = await getDatabase();

      if (syncLock) return;
      syncLock = true;

      setStatus('running');
      const baseUrl = getCaixaApiBase();

      const modes = await Promise.all(
        SYNC_SUPPORTED_MODE_IDS.map(async (modeId) => {
          const segment = getSegmentForMode(modeId);
          if (!segment) return null;
          const maxNumeroLocal = await getMaxNumeroForMode(db, modeId);
          await upsertSyncMeta(db, {
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

      const worker = new CaixaSyncWorker();
      workerRef.current = worker;

      /** RxDB não deve receber vários bulkUpsert em paralelo no mesmo processo. */
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
            const op = batchWriteQueue.then(() => bulkUpsertDraws(db, docs));
            batchWriteQueue = op.catch(() => {});
            await op;
            return;
          }
          if (msg.type === 'mode-done') {
            await upsertSyncMeta(db, {
              id: msg.modeId,
              lastConcursoNumero: msg.latestRemote,
              totalFetched: msg.fetchedCount,
              status: 'done',
              lastSyncAt: Date.now(),
              errorMessage: '',
            });
            await recomputeHistoricalStatsForMode(db, msg.modeId);
            return;
          }
          if (msg.type === 'mode-error') {
            await upsertSyncMeta(db, {
              id: msg.modeId,
              lastConcursoNumero: await getMaxNumeroForMode(db, msg.modeId),
              totalFetched: 0,
              status: 'error',
              lastSyncAt: Date.now(),
              errorMessage: msg.message,
            });
            return;
          }
          if (msg.type === 'complete') {
            await recomputeAllHistoricalStats(db);
            await bidirectionalLotterySupabaseSync(db);
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
