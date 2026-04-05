/// <reference lib="webworker" />

import type { WorkerMessage, FrequencyMap } from '../lib/lottery-types';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function generateGame(min: number, max: number, count: number): number[] {
  const range = max - min + 1;
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(min + Math.floor(Math.random() * range));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { workerId, minNumber, maxNumber, numbersPerGame, totalGames, batchSize } = e.data;

  const frequencies: FrequencyMap = {};
  for (let n = minNumber; n <= maxNumber; n++) {
    frequencies[n] = 0;
  }

  const maxSamples = 20;
  const sampleGames: number[][] = [];
  let processed = 0;

  while (processed < totalGames) {
    const batch = Math.min(batchSize, totalGames - processed);
    for (let i = 0; i < batch; i++) {
      const game = generateGame(minNumber, maxNumber, numbersPerGame);
      for (const n of game) {
        frequencies[n]++;
      }
      if (sampleGames.length < maxSamples) {
        sampleGames.push(game);
      }
    }
    processed += batch;

    ctx.postMessage({
      type: 'progress',
      workerId,
      processed,
      total: totalGames,
    });
  }

  ctx.postMessage({
    type: 'result',
    workerId,
    frequencies,
    totalGenerated: processed,
    sampleGames,
    elapsedMs: 0, // calculated by main thread
  });
};
