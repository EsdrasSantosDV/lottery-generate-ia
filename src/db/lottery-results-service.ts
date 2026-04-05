import { SYNC_SUPPORTED_MODE_IDS } from '@/lib/caixa-api-paths';
import { LOTTERY_MODES } from '@/lib/lottery-types';
import { buildFrequenciesFromDraws, frequencyMapToRecord } from '@/lib/caixa-stats';
import type { LotteryDrawDocument, LotteryHistoricalStatsDocument, LotterySyncMetaDocument } from './lottery-results-schema';
import type { LotteryLabDatabase } from './database';

export async function bulkUpsertDraws(db: LotteryLabDatabase, docs: LotteryDrawDocument[]): Promise<void> {
  if (docs.length === 0) return;
  await db.lottery_draws.bulkUpsert(docs);
}

export async function getMaxNumeroForMode(db: LotteryLabDatabase, modeId: string): Promise<number> {
  const found = await db.lottery_draws.find({ selector: { modeId } }).sort({ numero: 'desc' }).limit(1).exec();
  if (found.length === 0) return 0;
  return found[0].numero;
}

export async function countDrawsForMode(db: LotteryLabDatabase, modeId: string): Promise<number> {
  const docs = await db.lottery_draws.find({ selector: { modeId } }).exec();
  return docs.length;
}

export async function hasAnyDraws(db: LotteryLabDatabase): Promise<boolean> {
  const one = await db.lottery_draws.find().limit(1).exec();
  return one.length > 0;
}

export async function upsertSyncMeta(
  db: LotteryLabDatabase,
  partial: Omit<LotterySyncMetaDocument, 'id'> & { id: string }
): Promise<void> {
  await db.lottery_sync_meta.upsert({
    id: partial.id,
    lastConcursoNumero: partial.lastConcursoNumero,
    totalFetched: partial.totalFetched,
    status: partial.status,
    lastSyncAt: partial.lastSyncAt,
    errorMessage: partial.errorMessage ?? '',
  });
}

export async function getSyncMeta(db: LotteryLabDatabase, modeId: string): Promise<LotterySyncMetaDocument | null> {
  const doc = await db.lottery_sync_meta.findOne(modeId).exec();
  if (!doc) return null;
  return doc.toMutableJSON(false) as LotterySyncMetaDocument;
}

export async function recomputeHistoricalStatsForMode(db: LotteryLabDatabase, modeId: string): Promise<void> {
  const mode = LOTTERY_MODES.find((m) => m.id === modeId);
  if (!mode) return;

  const docs = await db.lottery_draws.find({ selector: { modeId } }).exec();
  const draws = docs.map((d) => d.toMutableJSON(false) as LotteryDrawDocument);
  const freq = buildFrequenciesFromDraws(
    draws.map((d) => ({
      dezenas: d.dezenas,
      dezenasSegundoSorteio: d.dezenasSegundoSorteio,
    })),
    mode.minNumber,
    mode.maxNumber
  );

  const row: LotteryHistoricalStatsDocument = {
    id: modeId,
    updatedAt: Date.now(),
    totalConcursos: draws.length,
    frequencies: frequencyMapToRecord(freq),
  };
  await db.lottery_historical_stats.upsert(row);
}

export async function recomputeAllHistoricalStats(db: LotteryLabDatabase): Promise<void> {
  for (const modeId of SYNC_SUPPORTED_MODE_IDS) {
    await recomputeHistoricalStatsForMode(db, modeId);
  }
}
