import { useEffect, useState, useCallback, useRef } from 'react';
import CaixaSyncWorker from '@/workers/caixa-sync-worker.ts?worker';
import { getCaixaApiBase, getSegmentForMode, SYNC_SUPPORTED_MODE_IDS } from '@/lib/caixa-api-paths';
import type { CaixaSyncWorkerOutgoing } from '@/lib/caixa-sync-messages';
import { syncPayloadToDocument } from '@/lib/caixa-dto';
import {
  bulkUpsertDraws,
  fetchNumerosPresentUpTo,
  getMaxNumeroForMode,
  recomputeAllHistoricalStats,
  recomputeHistoricalStatsForMode,
  upsertSyncMeta,
} from '@/lib/lottery-official-supabase';
import {
  contestRangeInclusive,
  delay,
  fetchLatestContestNumber,
  missingContestNumbers,
} from '@/lib/caixa-sync-uptodate';
import { getCaixaMainThreadGapMs, getCaixaWorkerRequestDelayMs } from '@/lib/caixa-rate-limit-config';
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

      const backfillRaw = import.meta.env.VITE_CAIXA_BACKFILL_FROM_CONCURSO as string | undefined;
      const backfillParsed =
        backfillRaw != null && String(backfillRaw).trim() !== ''
          ? parseInt(String(backfillRaw), 10)
          : NaN;
      const backfillFromConcurso = Number.isFinite(backfillParsed) ? backfillParsed : undefined;

      const modesForWorker: {
        modeId: string;
        segment: string;
        contestNumbers: number[];
        latestRemote: number;
      }[] = [];

      /** Uma modalidade por vez: Supabase → pausa → API último concurso → lista do que falta. */
      for (const modeId of SYNC_SUPPORTED_MODE_IDS) {
        const segment = getSegmentForMode(modeId);
        if (!segment) continue;

        const maxNumeroLocal = await getMaxNumeroForMode(sb, modeId);
        await upsertSyncMeta(sb, {
          id: modeId,
          lastConcursoNumero: maxNumeroLocal,
          totalFetched: 0,
          status: 'running',
          lastSyncAt: Date.now(),
          errorMessage: '',
        });

        await delay(getCaixaMainThreadGapMs());

        let latestRemote: number;
        try {
          latestRemote = await fetchLatestContestNumber(baseUrl, segment);
        } catch (e) {
          await upsertSyncMeta(sb, {
            id: modeId,
            lastConcursoNumero: await getMaxNumeroForMode(sb, modeId),
            totalFetched: 0,
            status: 'error',
            lastSyncAt: Date.now(),
            errorMessage: e instanceof Error ? e.message : String(e),
          });
          continue;
        }

        let contestNumbers: number[];
        if (backfillFromConcurso != null && Number.isFinite(backfillFromConcurso)) {
          const start = Math.max(1, backfillFromConcurso);
          contestNumbers = contestRangeInclusive(start, latestRemote);
        } else {
          const present = await fetchNumerosPresentUpTo(sb, modeId, latestRemote);
          contestNumbers = missingContestNumbers(latestRemote, present);
        }

        if (contestNumbers.length === 0) {
          await upsertSyncMeta(sb, {
            id: modeId,
            lastConcursoNumero: latestRemote,
            totalFetched: 0,
            status: 'done',
            lastSyncAt: Date.now(),
            errorMessage: '',
          });
          continue;
        }

        modesForWorker.push({ modeId, segment, contestNumbers, latestRemote });
      }

      if (modesForWorker.length === 0) {
        syncLock = false;
        setProgressLabel('');
        setStatus('done');
        return;
      }

      const worker = new CaixaSyncWorker();
      workerRef.current = worker;

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
        requestDelayMs: getCaixaWorkerRequestDelayMs(),
        batchSize: 40,
        modes: modesForWorker,
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
