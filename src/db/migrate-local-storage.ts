import type { HistoryEntry } from '@/lib/lottery-types';
import type { LotteryLabDatabase } from './database';
import { sanitizeHistoryEntry } from './sanitize-doc';

const LEGACY_HISTORY_KEY = 'lottery-generator-history';

function parseLegacyHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Migra dados da chave antiga do localStorage para RxDB e remove a chave. */
export async function migrateLegacyHistoryIfNeeded(db: LotteryLabDatabase): Promise<void> {
  if (typeof localStorage === 'undefined') return;

  const raw = localStorage.getItem(LEGACY_HISTORY_KEY);
  if (!raw) return;

  const entries = parseLegacyHistory(raw);
  if (entries.length === 0) {
    localStorage.removeItem(LEGACY_HISTORY_KEY);
    return;
  }

  await db.generations.bulkInsert(entries.map(sanitizeHistoryEntry));
  localStorage.removeItem(LEGACY_HISTORY_KEY);
}
