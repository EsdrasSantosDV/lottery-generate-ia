import { pickRandomSubset, secureRandomInt } from './secure-random';
import type { FrequencyMap, LotteryMode } from './lottery-types';

export function getRankedFrequencies(freq: FrequencyMap) {
  return Object.entries(freq)
    .map(([num, count]) => ({ number: Number(num), count }))
    .sort((a, b) => b.count - a.count);
}

export function getTopNumbers(freq: FrequencyMap, n: number) {
  return getRankedFrequencies(freq).slice(0, n);
}

export function getBottomNumbers(freq: FrequencyMap, n: number) {
  return getRankedFrequencies(freq).slice(-n).reverse();
}

function suggestPositional(
  ranked: { number: number; count: number }[],
  count: number,
  type: 'top' | 'bottom' | 'mixed' | 'random'
): number[] {
  if (ranked.length === 0) return [];

  if (type === 'top') {
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(ranked[i % ranked.length].number);
    }
    return out;
  }
  if (type === 'bottom') {
    const rev = [...ranked].reverse();
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(rev[i % rev.length].number);
    }
    return out;
  }
  if (type === 'mixed') {
    const half = Math.ceil(count / 2);
    const topPart = ranked.slice(0, half);
    const botPart = ranked.slice(-(count - half));
    const pool = [...topPart, ...botPart];
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(pool[i % pool.length].number);
    }
    return out;
  }
  const pool = ranked.slice(0, Math.min(10, ranked.length));
  const out: number[] = [];
  const hi = pool.length - 1;
  for (let i = 0; i < count; i++) {
    out.push(pool[secureRandomInt(0, hi)].number);
  }
  return out;
}

export function generateSuggestion(
  freq: FrequencyMap,
  mode: LotteryMode,
  type: 'top' | 'bottom' | 'mixed' | 'random'
): number[] {
  const ranked = getRankedFrequencies(freq);
  const count = mode.numbersPerGame;

  if (mode.gameKind === 'positional') {
    return suggestPositional(ranked, count, type);
  }

  if (type === 'top') {
    return ranked.slice(0, count).map((r) => r.number).sort((a, b) => a - b);
  }
  if (type === 'bottom') {
    return ranked.slice(-count).map((r) => r.number).sort((a, b) => a - b);
  }
  if (type === 'mixed') {
    const half = Math.ceil(count / 2);
    const rest = count - half;
    const top = ranked.slice(0, half).map((r) => r.number);
    const bottom = ranked.slice(-rest).map((r) => r.number);
    const combined = new Set([...top, ...bottom]);
    // fill if needed
    let idx = 0;
    while (combined.size < count) {
      combined.add(ranked[idx].number);
      idx++;
    }
    return Array.from(combined).sort((a, b) => a - b);
  }
  const pool = ranked.slice(0, Math.min(count * 2, ranked.length));
  const k = Math.min(count, pool.length);
  const picked = pickRandomSubset(pool, k);
  return picked.map((r) => r.number).sort((a, b) => a - b);
}

/** Total de sorteios de números (apostas × jogos por aposta × números por jogo). */
export function totalNumberSlots(totalGames: number, mode: LotteryMode): number {
  return totalGames * mode.gamesPerBet * mode.numbersPerGame;
}

/** Frequência esperada por dezena (aprox. uniforme). */
export function expectedOccurrencesPerNumber(totalGames: number, mode: LotteryMode): number {
  const universe = mode.maxNumber - mode.minNumber + 1;
  return totalNumberSlots(totalGames, mode) / universe;
}

/** Exibição de uma dezena conforme a modalidade (Super Sete: um dígito; demais: duas casas). */
export function formatLotteryDigitLabel(n: number, mode: LotteryMode): string {
  if (mode.gameKind === 'positional' && mode.maxNumber <= 9) {
    return String(n);
  }
  return String(n).padStart(2, '0');
}

export function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

