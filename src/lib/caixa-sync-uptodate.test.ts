import { describe, expect, it } from 'vitest';
import { contestRangeInclusive, missingContestNumbers } from './caixa-sync-uptodate';

describe('missingContestNumbers', () => {
  it('retorna lacunas e cauda', () => {
    const present = new Set([1, 2, 4, 10]);
    expect(missingContestNumbers(10, present)).toEqual([3, 5, 6, 7, 8, 9]);
  });

  it('vazio quando tudo presente', () => {
    const present = new Set([1, 2, 3]);
    expect(missingContestNumbers(3, present)).toEqual([]);
  });
});

describe('contestRangeInclusive', () => {
  it('inclui extremos', () => {
    expect(contestRangeInclusive(2, 4)).toEqual([2, 3, 4]);
  });

  it('vazio se start > latest', () => {
    expect(contestRangeInclusive(5, 3)).toEqual([]);
  });
});
