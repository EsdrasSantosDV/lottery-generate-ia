/// <reference lib="webworker" />

import type { CdleCandidate } from '@/lib/cdle-engine';
import { generateCandidatesBatch } from '@/lib/cdle-engine';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

export type CdleWorkerStartMessage = {
  type: 'start';
  workerId: number;
  min: number;
  max: number;
  picks: number;
  totalCandidates: number;
  seedOffset: number;
  batchSize: number;
};

export type CdleWorkerProgress = {
  type: 'progress';
  workerId: number;
  processed: number;
  total: number;
};

export type CdleWorkerResult = {
  type: 'result';
  workerId: number;
  candidates: CdleCandidate[];
  totalGenerated: number;
};

export type CdleWorkerResponse = CdleWorkerProgress | CdleWorkerResult;

ctx.onmessage = (e: MessageEvent<CdleWorkerStartMessage>) => {
  const { workerId, min, max, picks, totalCandidates, seedOffset, batchSize } = e.data;
  const mode = { min, max, picks };

  const candidates: CdleCandidate[] = [];
  let processed = 0;

  while (processed < totalCandidates) {
    const batch = Math.min(batchSize, totalCandidates - processed);
    const chunk = generateCandidatesBatch(mode, workerId, batch, seedOffset + processed);
    candidates.push(...chunk);
    processed += batch;

    ctx.postMessage({
      type: 'progress',
      workerId,
      processed,
      total: totalCandidates,
    } satisfies CdleWorkerProgress);
  }

  ctx.postMessage({
    type: 'result',
    workerId,
    candidates,
    totalGenerated: processed,
  } satisfies CdleWorkerResult);
};
