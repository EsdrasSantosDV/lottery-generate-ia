import {
  addRxPlugin,
  createRxDatabase,
  ensureNoStartupErrors,
  type RxCollection,
  type RxDatabase,
} from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { generationSchema, type GenerationDocument } from './schema';
import {
  lotteryDrawSchema,
  lotteryHistoricalStatsSchema,
  lotterySyncMetaSchema,
  type LotteryDrawDocument,
  type LotteryHistoricalStatsDocument,
  type LotterySyncMetaDocument,
} from './lottery-results-schema';
import { migrateLegacyHistoryIfNeeded } from './migrate-local-storage';

export type GenerationsCollection = RxCollection<GenerationDocument>;
export type LotteryDrawsCollection = RxCollection<LotteryDrawDocument>;
export type LotterySyncMetaCollection = RxCollection<LotterySyncMetaDocument>;
export type LotteryHistoricalStatsCollection = RxCollection<LotteryHistoricalStatsDocument>;

export type LotteryLabDatabase = RxDatabase<{
  generations: GenerationsCollection;
  lottery_draws: LotteryDrawsCollection;
  lottery_sync_meta: LotterySyncMetaCollection;
  lottery_historical_stats: LotteryHistoricalStatsCollection;
}>;

let dbPromise: Promise<LotteryLabDatabase> | null = null;

async function createDatabase(): Promise<LotteryLabDatabase> {
  addRxPlugin(RxDBQueryBuilderPlugin);
  if (import.meta.env.DEV) {
    addRxPlugin(RxDBDevModePlugin);
  }

  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageDexie(),
  });

  const db = await createRxDatabase<{
    generations: GenerationsCollection;
    lottery_draws: LotteryDrawsCollection;
    lottery_sync_meta: LotterySyncMetaCollection;
    lottery_historical_stats: LotteryHistoricalStatsCollection;
  }>({
    name: 'lottery-lab',
    storage,
  });

  await db.addCollections({
    generations: {
      schema: generationSchema,
    },
    lottery_draws: {
      schema: lotteryDrawSchema,
    },
    lottery_sync_meta: {
      schema: lotterySyncMetaSchema,
    },
    lottery_historical_stats: {
      schema: lotteryHistoricalStatsSchema,
    },
  });

  await migrateLegacyHistoryIfNeeded(db);
  await ensureNoStartupErrors(db);

  return db;
}

/** Uma única instância do banco (IndexedDB via Dexie). */
export function getDatabase(): Promise<LotteryLabDatabase> {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
}
