import { describe, it, expect } from 'vitest';
import {
  entropyScore,
  generateChaoticGame,
  overlap,
  selectPortfolioGreedy,
  buildCandidate,
  filterDrawsForCdleMode,
  evaluateAgainstHistoricalDraws,
  DEFAULT_WEIGHTS,
  type CdleMode,
  type CdleCandidate,
} from '@/lib/cdle-engine';

const mega: CdleMode = { min: 1, max: 60, picks: 6 };

describe('cdle-engine', () => {
  it('entropia baixa para sequência concentrada e maior para espalhada', () => {
    const low = entropyScore([1, 2, 3, 4, 5, 6], mega);
    const high = entropyScore([4, 15, 26, 37, 48, 59], mega);
    expect(low).toBeLessThan(high);
  });

  it('generateChaoticGame produz picks únicos ordenados', () => {
    const { numbers, iterations } = generateChaoticGame(mega, 0.314159);
    expect(numbers).toHaveLength(6);
    expect(new Set(numbers).size).toBe(6);
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
    expect(iterations).toBeGreaterThanOrEqual(6);
  });

  it('overlap conta interseção', () => {
    expect(overlap([1, 2, 3], [2, 3, 4])).toBe(2);
  });

  it('selectPortfolioGreedy respeita tamanho máximo', () => {
    const candidates: CdleCandidate[] = [];
    for (let i = 0; i < 50; i++) {
      const seed = 0.01 + ((i + 1) * 0.015 % 0.98);
      const { candidate, seed: s } = buildCandidate(mega, seed);
      candidates.push({ ...candidate, seed: s });
    }
    const portfolio = selectPortfolioGreedy(candidates, mega, 8, DEFAULT_WEIGHTS, 0.7);
    expect(portfolio.games.length).toBeLessThanOrEqual(8);
  });

  it('filterDrawsForCdleMode remove tamanho ou faixa inválidos', () => {
    const raw = [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3],
      [1, 1, 2, 3, 4, 5],
      [61, 1, 2, 3, 4, 5],
    ];
    const ok = filterDrawsForCdleMode(mega, raw);
    expect(ok).toHaveLength(1);
    expect(ok[0]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('evaluateAgainstHistoricalDraws agrega pares sorteio × jogo', () => {
    const games = [
      [1, 2, 3, 4, 5, 6],
      [10, 20, 30, 40, 50, 60],
    ];
    const draws = [
      [1, 2, 3, 7, 8, 9],
      [10, 11, 12, 13, 14, 15],
    ];
    const r = evaluateAgainstHistoricalDraws(games, draws);
    expect(r.averageHits).toBe(1);
    expect(r.maxHits).toBe(3);
    expect(r.distribution[3]).toBe(1);
    expect(r.distribution[1]).toBe(1);
    expect(r.distribution[0]).toBe(2);
  });
});
