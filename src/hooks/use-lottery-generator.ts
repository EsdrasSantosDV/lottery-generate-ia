import { useState, useCallback, useRef } from 'react';
import type {
  LotteryMode,
  FrequencyMap,
  WorkerState,
  WorkerResponse,
  GenerationResult,
  ProcessingStatus,
} from '../lib/lottery-types';
import LotteryWorker from '../workers/lottery-worker.ts?worker';

interface GeneratorConfig {
  mode: LotteryMode;
  totalGames: number;
  workerCount: number;
}

export function useLotteryGenerator() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const workersRef = useRef<Worker[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  /** Incrementado em start/stop para ignorar mensagens de workers terminados ou cancelados. */
  const generationIdRef = useRef(0);

  const cleanup = useCallback(() => {
    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    generationIdRef.current += 1;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedMs(performance.now() - startTimeRef.current);
    workersRef.current.forEach((w) => w.terminate());
    workersRef.current = [];
    setWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        status: w.status === 'done' ? 'done' : ('cancelled' as const),
      }))
    );
    setStatus('cancelled');
  }, []);

  const start = useCallback(
    (config: GeneratorConfig) => {
      cleanup();
      generationIdRef.current += 1;
      const genId = generationIdRef.current;
      setStatus('running');
      setResult(null);
      setElapsedMs(0);

      const { mode, totalGames, workerCount } = config;
      const gamesPerWorker = Math.floor(totalGames / workerCount);
      const remainder = totalGames % workerCount;

      const initialWorkerStates: WorkerState[] = Array.from({ length: workerCount }, (_, i) => ({
        id: i,
        status: 'idle' as const,
        progress: 0,
        processed: 0,
        total: gamesPerWorker + (i < remainder ? 1 : 0),
      }));

      setWorkers(initialWorkerStates);

      const mergedFreq: FrequencyMap = {};
      for (let n = mode.minNumber; n <= mode.maxNumber; n++) {
        mergedFreq[n] = 0;
      }

      let completedCount = 0;
      let allSamples: number[][] = [];
      const workerStatesLocal = [...initialWorkerStates];

      startTimeRef.current = performance.now();
      timerRef.current = window.setInterval(() => {
        setElapsedMs(performance.now() - startTimeRef.current);
      }, 100);

      const batchSize = Math.max(1000, Math.min(50000, Math.floor(totalGames / workerCount / 20)));

      for (let i = 0; i < workerCount; i++) {
        const worker = new LotteryWorker();
        workersRef.current.push(worker);

        const assignedGames = gamesPerWorker + (i < remainder ? 1 : 0);

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (generationIdRef.current !== genId) return;
          const msg = e.data;
          if (msg.type === 'progress') {
            workerStatesLocal[msg.workerId] = {
              ...workerStatesLocal[msg.workerId],
              status: 'running',
              processed: msg.processed,
              progress: (msg.processed / msg.total) * 100,
            };
            setWorkers([...workerStatesLocal]);
          } else if (msg.type === 'result') {
            const freq = msg.frequencies;
            for (const key of Object.keys(freq)) {
              mergedFreq[Number(key)] += freq[Number(key)];
            }
            allSamples = [...allSamples, ...msg.sampleGames];

            workerStatesLocal[msg.workerId] = {
              ...workerStatesLocal[msg.workerId],
              status: 'done',
              progress: 100,
              processed: msg.totalGenerated,
            };
            setWorkers([...workerStatesLocal]);

            completedCount++;
            if (completedCount === workerCount) {
              if (generationIdRef.current !== genId) return;
              const totalElapsed = performance.now() - startTimeRef.current;
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              setElapsedMs(totalElapsed);

              const genResult: GenerationResult = {
                modeId: mode.id,
                modeName: mode.name,
                totalGames,
                workerCount,
                frequencies: mergedFreq,
                sampleGames: allSamples.slice(0, 50),
                elapsedMs: totalElapsed,
                timestamp: Date.now(),
              };
              setResult(genResult);
              setStatus('done');
              cleanup();
            }
          }
        };

        worker.onerror = () => {
          if (generationIdRef.current !== genId) return;
          workerStatesLocal[i] = { ...workerStatesLocal[i], status: 'error' };
          setWorkers([...workerStatesLocal]);
          setStatus('error');
          cleanup();
        };

        worker.postMessage({
          type: 'start',
          workerId: i,
          modeId: mode.id,
          minNumber: mode.minNumber,
          maxNumber: mode.maxNumber,
          numbersPerGame: mode.numbersPerGame,
          gamesPerBet: mode.gamesPerBet,
          totalGames: assignedGames,
          batchSize,
          gameKind: mode.gameKind ?? 'combination',
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
    setElapsedMs(0);
  }, [cleanup]);

  const totalProcessed = workers.reduce((sum, w) => sum + w.processed, 0);
  const totalTarget = workers.reduce((sum, w) => sum + w.total, 0);
  const overallProgress = totalTarget > 0 ? (totalProcessed / totalTarget) * 100 : 0;

  return {
    status,
    workers,
    result,
    elapsedMs,
    overallProgress,
    totalProcessed,
    totalTarget,
    start,
    stop,
    reset,
  };
}
