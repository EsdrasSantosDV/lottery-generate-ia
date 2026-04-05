import { describe, it, expect } from 'vitest';
import {
  chiSquareUniformity,
  observedCountsFromFrequencyMap,
} from '@/lib/randomness-stats';

describe('chiSquareUniformity', () => {
  it('distribuição perfeitamente uniforme tem qui-quadrado 0', () => {
    const observed = [100, 100, 100, 100];
    const r = chiSquareUniformity(observed);
    expect(r.chiSquare).toBe(0);
    expect(r.degreesOfFreedom).toBe(3);
    expect(r.sampleCount).toBe(400);
    expect(r.expectedPerCategory).toBe(100);
  });

  it('desvio forte aumenta o qui-quadrado', () => {
    const flat = chiSquareUniformity([25, 25, 25, 25]).chiSquare;
    const skewed = chiSquareUniformity([100, 0, 0, 0]).chiSquare;
    expect(skewed).toBeGreaterThan(flat);
  });
});

describe('observedCountsFromFrequencyMap', () => {
  it('preserva ordem min..max', () => {
    const freq = { 1: 5, 2: 0, 3: 10 } as Record<number, number>;
    expect(observedCountsFromFrequencyMap(freq, 1, 3)).toEqual([5, 0, 10]);
  });
});
