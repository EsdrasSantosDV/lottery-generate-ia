import type { FrequencyMap, HistoryEntry } from '@/lib/lottery-types';

export function sanitizeFrequencies(freq: FrequencyMap): FrequencyMap {
  const out: FrequencyMap = {};
  for (const [k, v] of Object.entries(freq)) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      out[Number(k)] = n;
    }
  }
  return out;
}

export function sanitizeSampleGames(games: number[][]): number[][] {
  return games.map((row) => row.map((n) => (Number.isFinite(n) ? n : 0)));
}

function sanitizeRanked(items: { number: number; count: number }[]): { number: number; count: number }[] {
  return items.map((i) => ({
    number: Number.isFinite(i.number) ? i.number : 0,
    count: Number.isFinite(i.count) ? i.count : 0,
  }));
}

export function sanitizeHistoryEntry(entry: HistoryEntry): HistoryEntry {
  return {
    ...entry,
    timestamp: Math.round(entry.timestamp),
    topNumbers: sanitizeRanked(entry.topNumbers),
    bottomNumbers: sanitizeRanked(entry.bottomNumbers),
    frequencies: sanitizeFrequencies(entry.frequencies),
    sampleGames: sanitizeSampleGames(entry.sampleGames),
  };
}
