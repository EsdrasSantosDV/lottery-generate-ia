/**
 * Game Intelligence Analyzer — backtest retrospectivo contra sorteios reais.
 * Não altera probabilidade de sorteios futuros.
 */

import type { LotteryMode } from '@/lib/lottery-types';
import {
  cdleModeFromLotteryMode,
  hitCount,
  randomDraw,
  filterDrawsForCdleMode,
  entropyScore,
  type CdleMode,
} from '@/lib/cdle-engine';
import { buildFrequenciesFromDraws, frequencyMapToRecord } from '@/lib/caixa-stats';
import type { FrequencyMap } from '@/lib/lottery-types';

/** Uma linha de sorteio com identificação do concurso (Dupla pode ter 2 linhas por concurso). */
export type GiaDrawRow = {
  numero: number;
  dezenas: number[];
};

/** Contagem de quantas vezes o jogo teve exatamente `k` acertos contra cada sorteio do histórico. */
export type HitHistogram = Record<number, number>;

export type GiaClosestHit = {
  numeroConcurso: number;
  acertos: number;
};

export type GiaBacktestResult = {
  histogram: HitHistogram;
  totalSorteios: number;
  /** Mega-Sena: rótulos quando numbersPerGame === 6 */
  megaLabels?: {
    sena: number;
    quina: number;
    quadra: number;
    terno: number;
  };
};

/** Pesos para os 4 níveis mais altos de acertos (k, k-1, k-2, k-3). */
export const GIA_SCORE_WEIGHTS = [1, 0.6, 0.3, 0.1] as const;

export type GiaMonteCarloResult = {
  simulationCount: number;
  rawScores: number[];
  meanRawScore: number;
};

/** Versão persistível (sem array grande de MC). */
export type GiaAnalysisStored = Omit<GiaAnalysisResult, 'monteCarlo' | 'numberFrequencies'> & {
  monteCarlo: Pick<GiaMonteCarloResult, 'simulationCount' | 'meanRawScore'>;
  numberFrequencies: Record<string, number>;
};

export function compactGiaForStorage(r: GiaAnalysisResult): GiaAnalysisStored {
  return {
    modeId: r.modeId,
    game: r.game,
    backtest: r.backtest,
    rawScore: r.rawScore,
    percentileVsRandom: r.percentileVsRandom,
    displayScore: r.displayScore,
    topPercentLabel: r.topPercentLabel,
    monteCarlo: {
      simulationCount: r.monteCarlo.simulationCount,
      meanRawScore: r.monteCarlo.meanRawScore,
    },
    closestHit: r.closestHit,
    numberFrequencies: frequencyMapToRecord(r.numberFrequencies),
  };
}

export type GiaAnalysisResult = {
  modeId: string;
  game: number[];
  backtest: GiaBacktestResult;
  rawScore: number;
  /** Posição do rawScore na distribuição MC (0–1). */
  percentileVsRandom: number;
  /** Score exibido 0–100 derivado do percentil. */
  displayScore: number;
  /** "Top X%" = (1 - percentile) * 100 */
  topPercentLabel: number;
  monteCarlo: GiaMonteCarloResult;
  closestHit: GiaClosestHit | null;
  /** Frequência de cada dezena no histórico (para insights). */
  numberFrequencies: FrequencyMap;
};

export function percentileRank(value: number, sortedAscending: number[]): number {
  if (sortedAscending.length === 0) return 0.5;
  let below = 0;
  for (const v of sortedAscending) {
    if (v <= value) below++;
    else break;
  }
  return below / sortedAscending.length;
}

/** Percentil em relação a uma amostra não ordenada (cópia ordenada internamente). */
export function percentile(value: number, sample: number[]): number {
  if (sample.length === 0) return 0.5;
  const sorted = [...sample].sort((a, b) => a - b);
  return percentileRank(value, sorted);
}

export function buildHistogram(numbersPerGame: number): HitHistogram {
  const h: HitHistogram = {};
  for (let k = 0; k <= numbersPerGame; k++) h[k] = 0;
  return h;
}

export function evaluateGameAgainstHistory(game: number[], draws: number[][]): HitHistogram {
  const n = game.length;
  const histogram = buildHistogram(n);
  for (const draw of draws) {
    const hits = hitCount(game, draw);
    histogram[hits] = (histogram[hits] ?? 0) + 1;
  }
  return histogram;
}

/** Soma ponderada das contagens nos 4 níveis mais altos (como no plano: sena→terno na Mega). */
export function historicalRawScore(histogram: HitHistogram, numbersPerGame: number): number {
  let s = 0;
  for (let i = 0; i < GIA_SCORE_WEIGHTS.length; i++) {
    const k = numbersPerGame - i;
    if (k < 0) break;
    s += (histogram[k] ?? 0) * GIA_SCORE_WEIGHTS[i]!;
  }
  return s;
}

export function histogramToEmpiricalProb(
  histogram: HitHistogram,
  totalSorteios: number
): Record<number, number> {
  const out: Record<number, number> = {};
  if (totalSorteios <= 0) return out;
  for (const [k, c] of Object.entries(histogram)) {
    out[Number(k)] = c / totalSorteios;
  }
  return out;
}

export function backtestFromDrawRows(game: number[], rows: GiaDrawRow[]): GiaBacktestResult {
  const draws = rows.map((r) => r.dezenas);
  const histogram = evaluateGameAgainstHistory(game, draws);
  const totalSorteios = draws.length;
  const npg = game.length;
  const megaLabels =
    npg === 6
      ? {
          sena: histogram[6] ?? 0,
          quina: histogram[5] ?? 0,
          quadra: histogram[4] ?? 0,
          terno: histogram[3] ?? 0,
        }
      : undefined;
  return { histogram, totalSorteios, megaLabels };
}

export function findClosestHit(game: number[], rows: GiaDrawRow[]): GiaClosestHit | null {
  if (rows.length === 0) return null;
  let bestNumero = rows[0]!.numero;
  let bestHits = -1;
  for (const row of rows) {
    const h = hitCount(game, row.dezenas);
    if (h > bestHits) {
      bestHits = h;
      bestNumero = row.numero;
    }
  }
  return { numeroConcurso: bestNumero, acertos: bestHits };
}

function cdleOrThrow(mode: LotteryMode): CdleMode {
  const c = cdleModeFromLotteryMode(mode);
  if (!c) throw new Error('Modalidade não suportada pelo GIA (apenas jogos por combinação).');
  return c;
}

export function simulateRandomRawScores(
  cdle: CdleMode,
  draws: number[][],
  simulationCount: number
): number[] {
  const scores: number[] = [];
  const picks = cdle.picks;
  for (let i = 0; i < simulationCount; i++) {
    const game = randomDraw(cdle);
    const histogram = evaluateGameAgainstHistory(game, draws);
    scores.push(historicalRawScore(histogram, picks));
  }
  return scores;
}

export function runGiaAnalysis(
  mode: LotteryMode,
  game: number[],
  rows: GiaDrawRow[],
  options?: { monteCarloSimulations?: number }
): GiaAnalysisResult | null {
  if (mode.gameKind === 'positional') return null;
  const cdle = cdleModeFromLotteryMode(mode);
  if (!cdle) return null;
  if (filterDrawsForCdleMode(cdle, [game]).length === 0) return null;

  const rowFiltered = rows.filter(
    (row) => filterDrawsForCdleMode(cdle, [row.dezenas]).length > 0
  );
  if (rowFiltered.length === 0) {
    return null;
  }

  const filteredDraws = rowFiltered.map((r) => r.dezenas);

  const backtest = backtestFromDrawRows(game, rowFiltered);
  const rawScore = historicalRawScore(backtest.histogram, mode.numbersPerGame);

  const sims = options?.monteCarloSimulations ?? 1500;
  const rawScores = simulateRandomRawScores(cdle, filteredDraws, sims);
  const meanRawScore =
    rawScores.length === 0 ? 0 : rawScores.reduce((a, b) => a + b, 0) / rawScores.length;

  const percentileVsRandom = percentile(rawScore, rawScores);
  const displayScore = Math.max(0, Math.min(100, Math.round(percentileVsRandom * 100)));
  const topPercentLabel = Math.round((1 - percentileVsRandom) * 100);

  const drawLikes = rowFiltered.map((r) => ({
    dezenas: r.dezenas,
    dezenasSegundoSorteio: [] as number[],
  }));
  const numberFrequencies = buildFrequenciesFromDraws(drawLikes, mode.minNumber, mode.maxNumber);

  return {
    modeId: mode.id,
    game: [...game].sort((a, b) => a - b),
    backtest,
    rawScore,
    percentileVsRandom,
    displayScore,
    topPercentLabel,
    monteCarlo: {
      simulationCount: sims,
      rawScores,
      meanRawScore,
    },
    closestHit: findClosestHit(game, rowFiltered),
    numberFrequencies,
  };
}

export type GiaClassification = 'excelente' | 'bom' | 'medio' | 'abaixo';

export function classifyDisplayScore(displayScore: number): GiaClassification {
  if (displayScore >= 85) return 'excelente';
  if (displayScore >= 65) return 'bom';
  if (displayScore >= 40) return 'medio';
  return 'abaixo';
}

/** Interpreta texto (vírgula, espaço, ponto e vírgula) em dezenas únicas ordenadas. */
export function parseCombinationGame(raw: string, mode: LotteryMode): number[] | null {
  if (mode.gameKind === 'positional') return null;
  const parts = raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const nums = parts.map((p) => parseInt(p, 10)).filter((n) => Number.isFinite(n));
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  if (unique.length !== mode.numbersPerGame) return null;
  const { minNumber: min, maxNumber: max } = mode;
  if (!unique.every((n) => n >= min && n <= max)) return null;
  return unique;
}

export type GiaSlotStatus = 'empty' | 'invalid' | 'out_of_range' | 'duplicate' | 'ok';

export type GiaSlotsValidation = {
  statuses: GiaSlotStatus[];
  parsed: (number | null)[];
  /** Jogo válido (ordenado) quando todos os slots estão corretos e sem repetição. */
  game: number[] | null;
};

/**
 * Valida uma dezena por campo (Mega = 6, Lotofácil = 15, etc.).
 * `rawSlots.length` pode ser menor — faltantes tratados como vazios.
 */
export function validateSlotsForCombinationGame(rawSlots: string[], mode: LotteryMode): GiaSlotsValidation {
  if (mode.gameKind === 'positional') {
    return { statuses: [], parsed: [], game: null };
  }

  const n = mode.numbersPerGame;
  const min = mode.minNumber;
  const max = mode.maxNumber;
  const padded = Array.from({ length: n }, (_, i) => (rawSlots[i] ?? '').trim());

  const parsed: (number | null)[] = [];
  const firstStatus: GiaSlotStatus[] = [];

  for (let i = 0; i < n; i++) {
    const s = padded[i]!;
    if (s === '') {
      parsed.push(null);
      firstStatus.push('empty');
      continue;
    }
    const v = Number.parseInt(s, 10);
    if (!Number.isFinite(v)) {
      parsed.push(null);
      firstStatus.push('invalid');
      continue;
    }
    parsed.push(v);
    if (v < min || v > max) {
      firstStatus.push('out_of_range');
    } else {
      firstStatus.push('ok');
    }
  }

  const statuses: GiaSlotStatus[] = [...firstStatus];
  const indicesByValue = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (firstStatus[i] === 'ok') {
      const v = parsed[i]!;
      const arr = indicesByValue.get(v) ?? [];
      arr.push(i);
      indicesByValue.set(v, arr);
    }
  }
  for (const indices of indicesByValue.values()) {
    if (indices.length > 1) {
      for (const i of indices) {
        statuses[i] = 'duplicate';
      }
    }
  }

  const allOk = statuses.length === n && statuses.every((s) => s === 'ok');
  const game =
    allOk
      ? [...parsed].filter((x): x is number => x != null).sort((a, b) => a - b)
      : null;

  return { statuses, parsed, game };
}

/** Mensagem única para o utilizador quando o jogo ainda não é submetível. */
export function describeGiaSlotsIssues(v: GiaSlotsValidation, mode: LotteryMode): string | null {
  if (mode.gameKind === 'positional') return null;
  if (v.statuses.length === 0) return null;
  if (v.statuses.some((s) => s === 'invalid')) {
    return 'Use apenas números inteiros em cada campo.';
  }
  if (v.statuses.some((s) => s === 'out_of_range')) {
    return `Cada dezena deve estar entre ${mode.minNumber} e ${mode.maxNumber}.`;
  }
  if (v.statuses.some((s) => s === 'duplicate')) {
    return 'Não repita a mesma dezena — cada número deve ser único no jogo.';
  }
  if (v.statuses.some((s) => s === 'empty')) {
    return `Preencha os ${mode.numbersPerGame} campos.`;
  }
  return null;
}

export type GiaAlert = { kind: string; message: string; severity: 'info' | 'warning' };

export function computeGiaAlerts(
  mode: LotteryMode,
  game: number[],
  frequencies: FrequencyMap
): GiaAlert[] {
  const alerts: GiaAlert[] = [];
  if (mode.gameKind === 'positional') return alerts;

  const cdle = cdleModeFromLotteryMode(mode);
  if (cdle) {
    const e = entropyScore(game, cdle);
    if (e >= 0.75) alerts.push({ kind: 'entropy', message: 'Entropia da combinação: alta (boa dispersão).', severity: 'info' });
    else if (e < 0.45) alerts.push({ kind: 'entropy', message: 'Entropia: baixa — dezenas concentradas em poucos “blocos”.', severity: 'warning' });
  }

  const { minNumber: min, maxNumber: max } = mode;
  const span = max - min + 1;
  const lowThirdEnd = min + Math.floor(span / 3) - 1;
  const lowCount = game.filter((n) => n <= lowThirdEnd).length;
  if (lowCount >= Math.ceil(mode.numbersPerGame * 0.5)) {
    alerts.push({
      kind: 'low-band',
      message: 'Alta concentração de dezenas na faixa baixa do volante.',
      severity: 'warning',
    });
  }

  const values = Object.values(frequencies);
  const sum = values.reduce((a, b) => a + b, 0);
  const denom = Math.max(1, max - min + 1);
  const mean = sum / denom;
  if (mean > 0) {
    const hot = game.filter((n) => (frequencies[n] ?? 0) > mean * 1.15);
    if (hot.length > 0) {
      alerts.push({
        kind: 'popular',
        message: `${hot.length} dezena(s) aparecem acima da média histórica (possível padrão “popular”).`,
        severity: 'info',
      });
    }
  }

  return alerts;
}
