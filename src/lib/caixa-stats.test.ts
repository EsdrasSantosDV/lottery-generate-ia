import { describe, it, expect } from 'vitest';
import { buildFrequenciesFromDraws, frequencyMapToRecord, recordToFrequencyMap } from '@/lib/caixa-stats';

describe('buildFrequenciesFromDraws', () => {
  it('agrega primeiro e segundo sorteio', () => {
    const freq = buildFrequenciesFromDraws(
      [
        { dezenas: [1, 2], dezenasSegundoSorteio: [3, 4] },
        { dezenas: [1, 2] },
      ],
      1,
      4
    );
    expect(freq[1]).toBe(2);
    expect(freq[2]).toBe(2);
    expect(freq[3]).toBe(1);
    expect(freq[4]).toBe(1);
  });
});

describe('frequencyMapToRecord / recordToFrequencyMap', () => {
  it('redonda viagem', () => {
    const f = { 1: 5, 2: 10 };
    const r = frequencyMapToRecord(f);
    expect(r['1']).toBe(5);
    expect(recordToFrequencyMap(r)).toEqual(f);
  });
});
