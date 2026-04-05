import type { FrequencyMap, LotteryMode, HistoryEntry, GenerationResult } from './lottery-types';

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

export function generateSuggestion(
  freq: FrequencyMap,
  mode: LotteryMode,
  type: 'top' | 'bottom' | 'mixed' | 'random'
): number[] {
  const ranked = getRankedFrequencies(freq);
  const count = mode.numbersPerGame;

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
  // random shuffle from top pool
  const pool = ranked.slice(0, Math.min(count * 2, ranked.length));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled
    .slice(0, count)
    .map((r) => r.number)
    .sort((a, b) => a - b);
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

const HISTORY_KEY = 'lottery-generator-history';

export function saveToHistory(result: GenerationResult): HistoryEntry {
  const ranked = getRankedFrequencies(result.frequencies);
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    modeId: result.modeId,
    modeName: result.modeName,
    totalGames: result.totalGames,
    workerCount: result.workerCount,
    elapsedMs: result.elapsedMs,
    timestamp: result.timestamp,
    topNumbers: ranked.slice(0, 10),
    bottomNumbers: ranked.slice(-10).reverse(),
    frequencies: result.frequencies,
    sampleGames: result.sampleGames,
  };
  const history = getHistory();
  history.unshift(entry);
  if (history.length > 50) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return entry;
}

export function getHistory(): HistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
