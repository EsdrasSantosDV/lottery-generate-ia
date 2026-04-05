import { map } from 'rxjs/operators';
import type { Subscription } from 'rxjs';
import { LOTTERY_MODES, type GenerationResult, type HistoryEntry } from '@/lib/lottery-types';
import { getRankedFrequencies } from '@/lib/lottery-utils';
import { getDatabase, type LotteryLabDatabase } from './database';
import { sanitizeHistoryEntry } from './sanitize-doc';

const MAX_HISTORY = 50;

async function trimOldGenerations(db: LotteryLabDatabase): Promise<void> {
  const docs = await db.generations.find().sort({ timestamp: 'asc' }).exec();
  const excess = docs.length - MAX_HISTORY;
  if (excess <= 0) return;
  for (let i = 0; i < excess; i++) {
    await docs[i].remove();
  }
}

export async function saveToHistory(result: GenerationResult): Promise<HistoryEntry> {
  const ranked = getRankedFrequencies(result.frequencies);
  const mode = LOTTERY_MODES.find((m) => m.id === result.modeId) ?? LOTTERY_MODES[0];
  const k = Math.min(mode.numbersPerGame, ranked.length);
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    modeId: result.modeId,
    modeName: result.modeName,
    totalGames: result.totalGames,
    workerCount: result.workerCount,
    elapsedMs: result.elapsedMs,
    timestamp: result.timestamp,
    topNumbers: ranked.slice(0, k),
    bottomNumbers: ranked.slice(-k).reverse(),
    frequencies: result.frequencies,
    sampleGames: result.sampleGames,
  };

  const safe = sanitizeHistoryEntry(entry);
  const db = await getDatabase();
  await db.generations.insert(safe);
  await trimOldGenerations(db);
  return safe;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const db = await getDatabase();
  const docs = await db.generations.find().sort({ timestamp: 'desc' }).limit(MAX_HISTORY).exec();
  return docs.map((d) => d.toMutableJSON(false) as HistoryEntry);
}

export async function clearHistory(): Promise<void> {
  const db = await getDatabase();
  await db.generations.find().remove();
}

/** Lista reativa ordenada por `timestamp` desc (máx. 50). */
export async function subscribeHistory(
  onNext: (entries: HistoryEntry[]) => void
): Promise<Subscription> {
  const db = await getDatabase();
  return db.generations
    .find()
    .sort({ timestamp: 'desc' })
    .limit(MAX_HISTORY)
    .$.pipe(
      map((docs) => docs.map((d) => d.toMutableJSON(false) as HistoryEntry))
    )
    .subscribe(onNext);
}
