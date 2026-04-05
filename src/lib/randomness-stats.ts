import type { FrequencyMap } from './lottery-types';

/** Vetor de contagens observadas na ordem minNumber..maxNumber (inclusive). */
export function observedCountsFromFrequencyMap(
  freq: FrequencyMap,
  minNumber: number,
  maxNumber: number
): number[] {
  const out: number[] = [];
  for (let n = minNumber; n <= maxNumber; n++) {
    out.push(freq[n] ?? 0);
  }
  return out;
}

/**
 * Qui-quadrado de aderência à distribuição uniforme (categorias com mesma probabilidade).
 * Útil para validar se as frequências marginais por dezena se aproximam do esperado sob sorteio uniforme.
 */
export function chiSquareUniformity(observed: number[]): {
  chiSquare: number;
  degreesOfFreedom: number;
  sampleCount: number;
  expectedPerCategory: number;
} {
  const k = observed.length;
  const sampleCount = observed.reduce((a, b) => a + b, 0);
  if (k === 0) {
    return { chiSquare: 0, degreesOfFreedom: 0, sampleCount: 0, expectedPerCategory: 0 };
  }
  const expectedPerCategory = sampleCount / k;
  if (expectedPerCategory === 0) {
    return { chiSquare: 0, degreesOfFreedom: k - 1, sampleCount, expectedPerCategory: 0 };
  }

  let chiSquare = 0;
  for (const o of observed) {
    const d = o - expectedPerCategory;
    chiSquare += (d * d) / expectedPerCategory;
  }

  return {
    chiSquare,
    degreesOfFreedom: k - 1,
    sampleCount,
    expectedPerCategory,
  };
}
