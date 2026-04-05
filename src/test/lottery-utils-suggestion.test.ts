import { describe, it, expect } from 'vitest';
import { generateSuggestion } from '@/lib/lottery-utils';
import type { LotteryMode } from '@/lib/lottery-types';

const megaMode: LotteryMode = {
  id: 'mega-sena',
  name: 'Mega-Sena',
  description: '',
  minNumber: 1,
  maxNumber: 60,
  numbersPerGame: 6,
  gamesPerBet: 1,
  color: '',
};

function uniformFreq(): Record<number, number> {
  const f: Record<number, number> = {};
  for (let n = 1; n <= 60; n++) f[n] = 1000;
  return f;
}

describe('generateSuggestion random', () => {
  it('retorna 6 dezenas distintas ordenadas (Mega)', () => {
    const freq = uniformFreq();
    for (let t = 0; t < 30; t++) {
      const game = generateSuggestion(freq, megaMode, 'random');
      expect(game).toHaveLength(6);
      expect(new Set(game).size).toBe(6);
      const sorted = [...game].sort((a, b) => a - b);
      expect(game).toEqual(sorted);
      for (const n of game) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(60);
      }
    }
  });
});
