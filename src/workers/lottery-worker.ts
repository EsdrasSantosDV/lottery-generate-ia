/// <reference lib="webworker" />

import type { WorkerMessage, FrequencyMap, LotteryGameKind } from '../lib/lottery-types';
import { secureRandomInt } from '../lib/secure-random';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Um jogo: combinação aleatória uniforme entre todas as C(n,k) possíveis
 * (Fisher–Yates parcial + ordenação para exibição).
 * O método antigo (sortear até o Set encher) NÃO é uniforme nas combinações.
 */
function generateGame(min: number, max: number, count: number): number[] {
  const n = max - min + 1;
  if (count > n) {
    throw new RangeError('generateGame: count maior que o universo');
  }

  const pool: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    pool[i] = min + i;
  }

  for (let i = 0; i < count; i++) {
    const j = secureRandomInt(i, n - 1);
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }

  return pool.slice(0, count).sort((a, b) => a - b);
}

/** Uma dezena por posição (ordem preservada), ex.: Super Sete — 7 colunas 0–9. */
function generatePositionalGame(min: number, max: number, positions: number): number[] {
  const out: number[] = [];
  for (let p = 0; p < positions; p++) {
    out.push(secureRandomInt(min, max));
  }
  return out;
}

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { workerId, minNumber, maxNumber, numbersPerGame, gamesPerBet, totalGames, batchSize } = e.data;
  const gameKind: LotteryGameKind = e.data.gameKind ?? 'combination';
  const betsPerRound = Math.max(1, gamesPerBet);

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
      for (let g = 0; g < betsPerRound; g++) {
        const game =
          gameKind === 'positional'
            ? generatePositionalGame(minNumber, maxNumber, numbersPerGame)
            : generateGame(minNumber, maxNumber, numbersPerGame);
        for (const n of game) {
          frequencies[n]++;
        }
        if (sampleGames.length < maxSamples) {
          sampleGames.push(game);
        }
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
