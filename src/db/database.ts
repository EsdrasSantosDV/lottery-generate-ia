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
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { generationSchema, type GenerationDocument } from './schema';
import { migrateLegacyHistoryIfNeeded } from './migrate-local-storage';

export type GenerationsCollection = RxCollection<GenerationDocument>;

/** Nome novo para não colidir com IndexedDB antigo que tinha coleções de loteria oficial. */
export type LotteryLabDatabase = RxDatabase<{
  generations: GenerationsCollection;
}>;

let dbPromise: Promise<LotteryLabDatabase> | null = null;

async function createDatabase(): Promise<LotteryLabDatabase> {
  addRxPlugin(RxDBQueryBuilderPlugin);
  addRxPlugin(RxDBMigrationSchemaPlugin);
  if (import.meta.env.DEV) {
    addRxPlugin(RxDBDevModePlugin);
  }

  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageDexie(),
  });

  const db = await createRxDatabase<{
    generations: GenerationsCollection;
  }>({
    name: 'lottery-lab-gen',
    storage,
  });

  await db.addCollections({
    generations: {
      schema: generationSchema,
    },
  });

  await migrateLegacyHistoryIfNeeded(db);
  await ensureNoStartupErrors(db);

  return db;
}

/** Uma única instância do banco (IndexedDB via Dexie) — só histórico de gerações. */
export function getDatabase(): Promise<LotteryLabDatabase> {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
}
