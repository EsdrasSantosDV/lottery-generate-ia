import { describe, expect, it } from 'vitest';
import {
  evaluateGameAgainstHistory,
  historicalRawScore,
  percentile,
  backtestFromDrawRows,
  runGiaAnalysis,
  validateSlotsForCombinationGame,
  describeGiaSlotsIssues,
  type GiaDrawRow,
} from '@/lib/gia-engine';
import { hitCount } from '@/lib/cdle-engine';
import { LOTTERY_MODES } from '@/lib/lottery-types';

describe('hitCount', () => {
  it('conta interseção', () => {
    expect(hitCount([1, 2, 3, 4, 5, 6], [3, 4, 5, 6, 7, 8])).toBe(4);
  });
});

describe('evaluateGameAgainstHistory', () => {
  it('agrega histograma para Mega-like', () => {
    const game = [1, 2, 3, 4, 5, 6];
    const draws = [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 7],
      [10, 11, 12, 13, 14, 15],
    ];
    const h = evaluateGameAgainstHistory(game, draws);
    expect(h[6]).toBe(1);
    expect(h[5]).toBe(1);
    expect(h[0]).toBe(1);
  });
});

describe('percentile', () => {
  it('retorna fração <= valor', () => {
    const sample = [1, 2, 3, 4, 5];
    expect(percentile(3, sample)).toBe(0.6);
    expect(percentile(1, sample)).toBe(0.2);
  });
});

describe('backtestFromDrawRows / Dupla', () => {
  it('duas colunas no mesmo concurso contam como dois sorteios', () => {
    const game = [1, 2, 3, 4, 5, 6];
    const rows: GiaDrawRow[] = [
      { numero: 100, dezenas: [1, 2, 3, 4, 5, 6] },
      { numero: 100, dezenas: [10, 11, 12, 13, 14, 15] },
    ];
    const bt = backtestFromDrawRows(game, rows);
    expect(bt.totalSorteios).toBe(2);
    expect(bt.histogram[6]).toBe(1);
    expect(bt.histogram[0]).toBe(1);
  });
});

describe('runGiaAnalysis', () => {
  const mega = LOTTERY_MODES.find((m) => m.id === 'mega-sena')!;

  it('retorna null sem sorteios válidos', () => {
    const game = [1, 2, 3, 4, 5, 6];
    const rows: GiaDrawRow[] = [{ numero: 1, dezenas: [1, 2, 3] }];
    expect(runGiaAnalysis(mega, game, rows)).toBeNull();
  });

  it('retorna análise com score e percentil', () => {
    const game = [1, 2, 3, 4, 5, 6];
    const rows: GiaDrawRow[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push({
        numero: i + 1,
        dezenas: [1, 2, 3, 4, 5, 6],
      });
    }
    const r = runGiaAnalysis(mega, game, rows, { monteCarloSimulations: 200 });
    expect(r).not.toBeNull();
    expect(r!.displayScore).toBeGreaterThanOrEqual(0);
    expect(r!.displayScore).toBeLessThanOrEqual(100);
    expect(r!.closestHit).not.toBeNull();
  });
});

describe('historicalRawScore', () => {
  it('aplica pesos aos 4 níveis superiores', () => {
    const h: Record<number, number> = { 6: 1, 5: 2, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    expect(historicalRawScore(h, 6)).toBeCloseTo(1 * 1 + 2 * 0.6);
  });
});

describe('validateSlotsForCombinationGame', () => {
  const mega = LOTTERY_MODES.find((m) => m.id === 'mega-sena')!;

  it('aceita 6 dezenas válidas e únicas', () => {
    const v = validateSlotsForCombinationGame(['3', '11', '18', '27', '42', '59'], mega);
    expect(v.game).toEqual([3, 11, 18, 27, 42, 59]);
    expect(v.statuses.every((s) => s === 'ok')).toBe(true);
  });

  it('marca repetidos', () => {
    const v = validateSlotsForCombinationGame(['10', '10', '11', '12', '13', '14'], mega);
    expect(v.game).toBeNull();
    expect(v.statuses.filter((s) => s === 'duplicate').length).toBeGreaterThan(0);
    expect(describeGiaSlotsIssues(v, mega)).toContain('único');
  });

  it('marca fora da faixa', () => {
    const v = validateSlotsForCombinationGame(['1', '2', '3', '4', '5', '61'], mega);
    expect(v.statuses.some((s) => s === 'out_of_range')).toBe(true);
  });
});
