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
import { generationSchema, giaSnapshotSchema, type GenerationDocument, type GiaSnapshotDocument } from './schema';
import { migrateLegacyHistoryIfNeeded } from './migrate-local-storage';

export type GenerationsCollection = RxCollection<GenerationDocument>;
export type GiaSnapshotsCollection = RxCollection<GiaSnapshotDocument>;

/** Nome novo para não colidir com IndexedDB antigo que tinha coleções de loteria oficial. */
export type LotteryLabDatabase = RxDatabase<{
  generations: GenerationsCollection;
  gia_snapshots: GiaSnapshotsCollection;
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
    gia_snapshots: GiaSnapshotsCollection;
  }>({
    name: 'lottery-lab-gen',
    storage,
  });

  await db.addCollections({
    generations: {
      schema: generationSchema,
    },
    gia_snapshots: {
      schema: giaSnapshotSchema,
    },
  });

  await migrateLegacyHistoryIfNeeded(db);
  await ensureNoStartupErrors(db);

  return db;
}

/** Uma única instância do banco (IndexedDB via Dexie) — gerações e snapshots GIA. */
export function getDatabase(): Promise<LotteryLabDatabase> {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
}
