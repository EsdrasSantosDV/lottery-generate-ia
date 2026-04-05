import { describe, it, expect } from 'vitest';
import { pickRandomSubset, secureRandomInt } from '@/lib/secure-random';

describe('secureRandomInt', () => {
  it('retorna apenas valores no intervalo fechado', () => {
    for (let t = 0; t < 200; t++) {
      const v = secureRandomInt(3, 10);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('intervalo unitário retorna o único valor', () => {
    expect(secureRandomInt(5, 5)).toBe(5);
  });
});

describe('pickRandomSubset', () => {
  it('retorna k elementos distintos do pool', () => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let t = 0; t < 50; t++) {
      const sub = pickRandomSubset(pool, 4);
      expect(sub).toHaveLength(4);
      expect(new Set(sub).size).toBe(4);
      for (const x of sub) {
        expect(pool).toContain(x);
      }
    }
  });

  it('k=0 retorna array vazio', () => {
    expect(pickRandomSubset([1, 2, 3], 0)).toEqual([]);
  });

  it('k igual ao tamanho retorna permutação dos elementos', () => {
    const pool = ['a', 'b', 'c'];
    const sub = pickRandomSubset(pool, 3);
    expect(sub.sort()).toEqual(['a', 'b', 'c']);
  });
});
