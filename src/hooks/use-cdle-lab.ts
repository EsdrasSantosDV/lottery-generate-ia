import { useState, useCallback, useRef } from 'react';
import type { LotteryMode } from '@/lib/lottery-types';
import {
  cdleModeFromLotteryMode,
  selectPortfolioGreedy,
  type CdleCandidate,
  type CdlePortfolioResult,
  type ScoreWeights,
  DEFAULT_WEIGHTS,
  normalizeWeights,
} from '@/lib/cdle-engine';
import CdleWorker from '@/workers/cdle-worker.ts?worker';
import type { CdleWorkerResponse } from '@/workers/cdle-worker';

export type CdleLabConfig = {
  mode: LotteryMode;
  totalCandidates: number;
  portfolioSize: number;
  workerCount: number;
  weights: ScoreWeights;
  overlapRatio: number;
};

export type CdleLabProcessingStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export function useCdleLab() {
  const [status, setStatus] = useState<CdleLabProcessingStatus>('idle');
  const [workers, setWorkers] = useState<
    { id: number; progress: number; processed: number; total: number; status: string }[]
  >([]);
  const [result, setResult] = useState<CdlePortfolioResult | null>(null);
  const [rawCount, setRawCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const workersRef = useRef<Worker[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const runIdRef = useRef(0);

  const cleanup = useCallback(() => {
    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];
    setWorkers([]);
    setStatus('cancelled');
    setElapsedMs(performance.now() - startTimeRef.current);
  }, []);

  const start = useCallback(
    (config: CdleLabConfig) => {
      const cdle = cdleModeFromLotteryMode(config.mode);
      if (!cdle) {
        setStatus('error');
        return;
      }

      cleanup();
      runIdRef.current += 1;
      const runId = runIdRef.current;
      setStatus('running');
      setResult(null);
      setRawCount(0);
      setElapsedMs(0);

      const { totalCandidates, portfolioSize, workerCount, weights, overlapRatio } = config;
      const perWorker = Math.floor(totalCandidates / workerCount);
      const remainder = totalCandidates % workerCount;

      const initialStates = Array.from({ length: workerCount }, (_, i) => ({
        id: i,
        progress: 0,
        processed: 0,
        total: perWorker + (i < remainder ? 1 : 0),
        status: 'idle',
      }));
      setWorkers(initialStates);
      const localStates = [...initialStates];

      startTimeRef.current = performance.now();
      timerRef.current = window.setInterval(() => {
        setElapsedMs(performance.now() - startTimeRef.current);
      }, 100);

      const batchSize = Math.max(200, Math.min(10000, Math.floor(totalCandidates / workerCount / 15)));
      let completed = 0;
      const merged: CdleCandidate[] = [];
      const seedBase = Math.random() * 1000;

      for (let i = 0; i < workerCount; i++) {
        const worker = new CdleWorker();
        workersRef.current.push(worker);

        const assigned = perWorker + (i < remainder ? 1 : 0);

        worker.onmessage = (e: MessageEvent<CdleWorkerResponse>) => {
          if (runIdRef.current !== runId) return;
          const msg = e.data;
          if (msg.type === 'progress') {
            localStates[msg.workerId] = {
              ...localStates[msg.workerId],
              processed: msg.processed,
              progress: msg.total > 0 ? (msg.processed / msg.total) * 100 : 0,
              status: 'running',
            };
            setWorkers([...localStates]);
          } else if (msg.type === 'result') {
            merged.push(...msg.candidates);
            localStates[msg.workerId] = {
              ...localStates[msg.workerId],
              progress: 100,
              processed: msg.totalGenerated,
              status: 'done',
            };
            setWorkers([...localStates]);

            completed++;
            if (completed === workerCount) {
              if (runIdRef.current !== runId) return;
              const totalElapsed = performance.now() - startTimeRef.current;
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              setElapsedMs(totalElapsed);
              setRawCount(merged.length);

              const w = normalizeWeights(weights);
              const portfolio = selectPortfolioGreedy(
                merged,
                cdle,
                portfolioSize,
                w,
                overlapRatio
              );
              setResult(portfolio);
              setStatus('done');
              cleanup();
            }
          }
        };

        worker.onerror = () => {
          if (runIdRef.current !== runId) return;
          setStatus('error');
          cleanup();
        };

        worker.postMessage({
          type: 'start',
          workerId: i,
          min: cdle.min,
          max: cdle.max,
          picks: cdle.picks,
          totalCandidates: assigned,
          seedOffset: seedBase + i * 7919,
          batchSize,
        });
      }
    },
    [cleanup]
  );

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setWorkers([]);
    setResult(null);
    setRawCount(0);
    setElapsedMs(0);
  }, [cleanup]);

  const totalProcessed = workers.reduce((s, w) => s + w.processed, 0);
  const totalTarget = workers.reduce((s, w) => s + w.total, 0);
  const overallProgress = totalTarget > 0 ? (totalProcessed / totalTarget) * 100 : 0;

  return {
    status,
    workers,
    result,
    rawCount,
    elapsedMs,
    overallProgress,
    totalProcessed,
    totalTarget,
    start,
    stop,
    reset,
    defaultWeights: DEFAULT_WEIGHTS,
  };
}
