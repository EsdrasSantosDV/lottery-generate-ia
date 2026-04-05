/**
 * Órbita Dinâmica — motor de geração (mapa logístico / caos, entropia, anti-padrão, diversidade).
 * Não altera probabilidade de sorteio; foca em cobertura estrutural e portfólio.
 */

import type { LotteryMode } from '@/lib/lottery-types';

export type CdleMode = {
  min: number;
  max: number;
  picks: number;
};

export type ScoreWeights = {
  entropy: number;
  distribution: number;
  antiPattern: number;
  diversity: number;
};

export const DEFAULT_WEIGHTS: ScoreWeights = {
  entropy: 0.3,
  distribution: 0.25,
  antiPattern: 0.2,
  diversity: 0.25,
};

export type CdleCandidate = {
  numbers: number[];
  entropyScore: number;
  distributionScore: number;
  antiPatternScore: number;
  iterations: number;
  seed: number;
};

export type CdleGeneratedGame = CdleCandidate & {
  diversityScore: number;
  finalScore: number;
};

export type CdlePortfolioStats = {
  averageScore: number;
  averageEntropy: number;
  averageOverlap: number;
};

export type CdlePortfolioResult = {
  games: CdleGeneratedGame[];
  stats: CdlePortfolioStats;
};

export type MonteCarloResult = {
  averageHits: number;
  maxHits: number;
  distribution: Record<number, number>;
};

export function cdleModeFromLotteryMode(mode: LotteryMode): CdleMode | null {
  if (mode.gameKind === 'positional') return null;
  return {
    min: mode.minNumber,
    max: mode.maxNumber,
    picks: mode.numbersPerGame,
  };
}

export function normalizeWeights(w: Partial<ScoreWeights>): ScoreWeights {
  const e = w.entropy ?? DEFAULT_WEIGHTS.entropy;
  const d = w.distribution ?? DEFAULT_WEIGHTS.distribution;
  const a = w.antiPattern ?? DEFAULT_WEIGHTS.antiPattern;
  const v = w.diversity ?? DEFAULT_WEIGHTS.diversity;
  const sum = e + d + a + v;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  return { entropy: e / sum, distribution: d / sum, antiPattern: a / sum, diversity: v / sum };
}

/** Seed única em (0,1) a partir de workerId e índice (determinístico). */
export function seedForCandidate(workerId: number, index: number, seedOffset: number): number {
  const t = Math.sin(workerId * 12.9898 + index * 78.233 + seedOffset * 43.758) * 43758.5453;
  const frac = t - Math.floor(t);
  return Math.max(1e-6, Math.min(1 - 1e-6, frac));
}

export class LogisticMap {
  private x: number;
  private readonly r: number;

  constructor(seed: number, r = 3.99) {
    if (seed <= 0 || seed >= 1) {
      throw new Error('Seed deve estar no intervalo (0, 1).');
    }
    this.x = seed;
    this.r = r;
  }

  next(): number {
    this.x = this.r * this.x * (1 - this.x);
    return this.x;
  }
}

export function chaoticNumber(generator: LogisticMap, mode: CdleMode): number {
  const x = generator.next();
  const range = mode.max - mode.min + 1;
  return Math.floor(x * range) + mode.min;
}

export function generateChaoticGame(
  mode: CdleMode,
  seed: number
): { numbers: number[]; iterations: number } {
  const generator = new LogisticMap(seed);
  const selected = new Set<number>();
  let iterations = 0;

  while (selected.size < mode.picks) {
    const n = chaoticNumber(generator, mode);
    selected.add(n);
    iterations++;
  }

  const numbers = Array.from(selected).sort((a, b) => a - b);
  return { numbers, iterations };
}

function createBuckets(mode: CdleMode, bucketCount: number): number[][] {
  const totalRange = mode.max - mode.min + 1;
  const bucketSize = Math.ceil(totalRange / bucketCount);
  const buckets: number[][] = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = mode.min + i * bucketSize;
    const end = Math.min(mode.max, start + bucketSize - 1);
    const bucket: number[] = [];
    for (let n = start; n <= end; n++) {
      bucket.push(n);
    }
    buckets.push(bucket);
  }

  return buckets;
}

function shannonEntropy(probabilities: number[]): number {
  return probabilities.reduce((acc, p) => {
    if (p <= 0) return acc;
    return acc - p * Math.log2(p);
  }, 0);
}

export function entropyScore(numbers: number[], mode: CdleMode, bucketCount = 6): number {
  const buckets = createBuckets(mode, bucketCount);
  const counts = buckets.map((bucket) => numbers.filter((n) => bucket.includes(n)).length);

  const total = numbers.length;
  const probabilities = counts.map((count) => count / total);

  const entropy = shannonEntropy(probabilities);
  const maxEntropy = Math.log2(bucketCount);

  return maxEntropy === 0 ? 0 : entropy / maxEntropy;
}

export function evenOddBalanceScore(numbers: number[]): number {
  const evens = numbers.filter((n) => n % 2 === 0).length;
  const odds = numbers.length - evens;
  const diff = Math.abs(evens - odds);

  return 1 - diff / numbers.length;
}

export function gapScore(numbers: number[], mode: CdleMode): number {
  if (numbers.length < 2) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }

  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  const idealGap = (mode.max - mode.min) / (numbers.length - 1);
  const normalized = 1 - Math.min(1, Math.abs(avgGap - idealGap) / idealGap);

  return normalized;
}

export function distributionScore(numbers: number[], mode: CdleMode): number {
  const parity = evenOddBalanceScore(numbers);
  const gaps = gapScore(numbers, mode);
  return (parity + gaps) / 2;
}

export function countSequentialRuns(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  let longestRun = 1;
  let currentRun = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentRun++;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return longestRun;
}

export function lowNumberConcentrationScore(numbers: number[], threshold = 31): number {
  const lowCount = numbers.filter((n) => n <= threshold).length;
  const ratio = lowCount / numbers.length;

  if (ratio <= 0.6) return 1;
  return Math.max(0, 1 - (ratio - 0.6) * 2);
}

export function multipleOfFivePenalty(numbers: number[]): number {
  const count = numbers.filter((n) => n % 5 === 0).length;
  const ratio = count / numbers.length;
  return Math.max(0, 1 - ratio);
}

export function antiPatternScore(numbers: number[]): number {
  const longestRun = countSequentialRuns(numbers);
  const runScore = longestRun <= 2 ? 1 : Math.max(0, 1 - (longestRun - 2) * 0.25);

  const lowConcentration = lowNumberConcentrationScore(numbers);
  const multFive = multipleOfFivePenalty(numbers);

  return (runScore + lowConcentration + multFive) / 3;
}

export function overlap(a: number[], b: number[]): number {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n)).length;
}

export function jaccardSimilarity(a: number[], b: number[]): number {
  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...a, ...b]).size;

  return union === 0 ? 0 : intersection / union;
}

export function diversityScore(candidate: number[], portfolio: number[][]): number {
  if (portfolio.length === 0) return 1;

  const similarities = portfolio.map((game) => jaccardSimilarity(candidate, game));
  const avgSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;

  return 1 - avgSimilarity;
}

export function structuralScore(
  entropy: number,
  distribution: number,
  antiPattern: number,
  w: ScoreWeights
): number {
  return entropy * w.entropy + distribution * w.distribution + antiPattern * w.antiPattern;
}

export function finalGameScore(params: {
  entropy: number;
  distribution: number;
  antiPattern: number;
  diversity: number;
  weights: ScoreWeights;
}): number {
  const { entropy, distribution, antiPattern, diversity, weights } = params;
  return (
    entropy * weights.entropy +
    distribution * weights.distribution +
    antiPattern * weights.antiPattern +
    diversity * weights.diversity
  );
}

export function buildCandidate(
  mode: CdleMode,
  seed: number
): { candidate: Omit<CdleCandidate, 'seed'>; seed: number } {
  const { numbers, iterations } = generateChaoticGame(mode, seed);
  const entropy = entropyScore(numbers, mode);
  const distribution = distributionScore(numbers, mode);
  const anti = antiPatternScore(numbers);

  return {
    seed,
    candidate: {
      numbers,
      entropyScore: entropy,
      distributionScore: distribution,
      antiPatternScore: anti,
      iterations,
    },
  };
}

export function selectPortfolioGreedy(
  rawCandidates: CdleCandidate[],
  mode: CdleMode,
  portfolioSize: number,
  weights: ScoreWeights,
  overlapRatioThreshold = 0.7
): CdlePortfolioResult {
  const w = normalizeWeights(weights);
  const maxOverlap = Math.max(0, Math.floor(mode.picks * overlapRatioThreshold));

  const sorted = [...rawCandidates].sort((a, b) => {
    const sa = structuralScore(a.entropyScore, a.distributionScore, a.antiPatternScore, w);
    const sb = structuralScore(b.entropyScore, b.distributionScore, b.antiPatternScore, w);
    return sb - sa;
  });

  const selected: CdleGeneratedGame[] = [];
  const portfolioNumbers: number[][] = [];

  for (const c of sorted) {
    const tooSimilar = selected.some(
      (g) => overlap(c.numbers, g.numbers) >= maxOverlap
    );
    if (tooSimilar) continue;

    const div = diversityScore(c.numbers, portfolioNumbers);
    const final = finalGameScore({
      entropy: c.entropyScore,
      distribution: c.distributionScore,
      antiPattern: c.antiPatternScore,
      diversity: div,
      weights: w,
    });

    selected.push({
      ...c,
      diversityScore: div,
      finalScore: final,
    });
    portfolioNumbers.push(c.numbers);

    if (selected.length >= portfolioSize) break;
  }

  return buildPortfolioStats(selected, portfolioNumbers);
}

function buildPortfolioStats(
  games: CdleGeneratedGame[],
  portfolioNumbers: number[][]
): CdlePortfolioResult {
  if (games.length === 0) {
    return {
      games: [],
      stats: { averageScore: 0, averageEntropy: 0, averageOverlap: 0 },
    };
  }

  const averageScore = games.reduce((s, g) => s + g.finalScore, 0) / games.length;
  const averageEntropy = games.reduce((s, g) => s + g.entropyScore, 0) / games.length;

  let overlapSum = 0;
  let overlapCount = 0;
  for (let i = 0; i < portfolioNumbers.length; i++) {
    for (let j = i + 1; j < portfolioNumbers.length; j++) {
      overlapSum += overlap(portfolioNumbers[i], portfolioNumbers[j]);
      overlapCount++;
    }
  }

  const averageOverlap = overlapCount === 0 ? 0 : overlapSum / overlapCount;

  return {
    games,
    stats: {
      averageScore,
      averageEntropy,
      averageOverlap,
    },
  };
}

function secureRandomIntLocal(min: number, max: number): number {
  const range = max - min + 1;
  if (range <= 0) throw new RangeError('intervalo inválido');
  if (range === 1) return min;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    for (;;) {
      crypto.getRandomValues(buf);
      const x = buf[0];
      if (x < limit) return min + (x % range);
    }
  }
  for (;;) {
    const x = Math.floor(Math.random() * 0x1_0000_0000);
    if (x < limit) return min + (x % range);
  }
}

export function randomDraw(mode: CdleMode): number[] {
  const selected = new Set<number>();

  while (selected.size < mode.picks) {
    const n = secureRandomIntLocal(mode.min, mode.max);
    selected.add(n);
  }

  return Array.from(selected).sort((a, b) => a - b);
}

export function hitCount(game: number[], draw: number[]): number {
  const drawSet = new Set(draw);
  return game.filter((n) => drawSet.has(n)).length;
}

export function monteCarloEvaluate(
  mode: CdleMode,
  games: number[][],
  simulations: number
): MonteCarloResult {
  const distribution: Record<number, number> = {};
  let totalHits = 0;
  let maxHits = 0;

  for (let i = 0; i < simulations; i++) {
    const draw = randomDraw(mode);

    for (const game of games) {
      const hits = hitCount(game, draw);
      distribution[hits] = (distribution[hits] ?? 0) + 1;
      totalHits += hits;
      maxHits = Math.max(maxHits, hits);
    }
  }

  const totalEvaluations = simulations * games.length;

  return {
    averageHits: totalEvaluations === 0 ? 0 : totalHits / totalEvaluations,
    maxHits,
    distribution,
  };
}

/** Mantém só sorteios compatíveis com a modalidade (tamanho, faixa, dezenas distintas). */
export function filterDrawsForCdleMode(mode: CdleMode, draws: number[][]): number[][] {
  return draws.filter((d) => {
    if (d.length !== mode.picks) return false;
    if (new Set(d).size !== mode.picks) return false;
    return d.every((n) => Number.isInteger(n) && n >= mode.min && n <= mode.max);
  });
}

/**
 * Acertos de cada jogo contra cada sorteio real (histórico).
 * Mesma forma que `MonteCarloResult`: média sobre pares (sorteio × jogo).
 */
export function evaluateAgainstHistoricalDraws(games: number[][], historicalDraws: number[][]): MonteCarloResult {
  const distribution: Record<number, number> = {};
  let totalHits = 0;
  let maxHits = 0;

  if (historicalDraws.length === 0 || games.length === 0) {
    return { averageHits: 0, maxHits: 0, distribution: {} };
  }

  for (const draw of historicalDraws) {
    for (const game of games) {
      const hits = hitCount(game, draw);
      distribution[hits] = (distribution[hits] ?? 0) + 1;
      totalHits += hits;
      maxHits = Math.max(maxHits, hits);
    }
  }

  const totalEvaluations = historicalDraws.length * games.length;
  return {
    averageHits: totalHits / totalEvaluations,
    maxHits,
    distribution,
  };
}

export function generateCandidatesBatch(
  mode: CdleMode,
  workerId: number,
  count: number,
  seedOffset: number
): CdleCandidate[] {
  const out: CdleCandidate[] = [];
  for (let i = 0; i < count; i++) {
    const seed = seedForCandidate(workerId, i, seedOffset);
    const { candidate } = buildCandidate(mode, seed);
    out.push({ ...candidate, seed });
  }
  return out;
}
