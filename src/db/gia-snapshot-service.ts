import { map } from 'rxjs/operators';
import type { Subscription } from 'rxjs';
import type { LotteryMode } from '@/lib/lottery-types';
import type { GiaAnalysisResult, GiaAnalysisStored } from '@/lib/gia-engine';
import { compactGiaForStorage } from '@/lib/gia-engine';
import { getDatabase, type LotteryLabDatabase } from './database';
import type { GiaSnapshotDocument } from './schema';

const MAX_SNAPSHOTS = 50;

export type GiaSnapshotEntry = GiaSnapshotDocument & {
  analysis: GiaAnalysisStored;
};

function parseEntry(doc: GiaSnapshotDocument): GiaSnapshotEntry {
  const analysis = JSON.parse(doc.analysisJson) as GiaAnalysisStored;
  return { ...doc, analysis };
}

async function trimOld(db: LotteryLabDatabase): Promise<void> {
  const docs = await db.gia_snapshots.find().sort({ createdAt: 'asc' }).exec();
  const excess = docs.length - MAX_SNAPSHOTS;
  if (excess <= 0) return;
  for (let i = 0; i < excess; i++) {
    await docs[i].remove();
  }
}

export async function saveGiaSnapshot(
  mode: LotteryMode,
  result: GiaAnalysisResult
): Promise<GiaSnapshotEntry> {
  const stored = compactGiaForStorage(result);
  const doc: GiaSnapshotDocument = {
    id: crypto.randomUUID(),
    modeId: mode.id,
    modeName: mode.name,
    game: stored.game,
    createdAt: Date.now(),
    analysisJson: JSON.stringify(stored),
  };
  const db = await getDatabase();
  await db.gia_snapshots.insert(doc);
  await trimOld(db);
  return parseEntry(doc);
}

export async function listGiaSnapshots(): Promise<GiaSnapshotEntry[]> {
  const db = await getDatabase();
  const docs = await db.gia_snapshots
    .find()
    .sort({ createdAt: 'desc' })
    .limit(MAX_SNAPSHOTS)
    .exec();
  return docs.map((d) => parseEntry(d.toMutableJSON(false) as GiaSnapshotDocument));
}

export async function removeGiaSnapshot(id: string): Promise<void> {
  const db = await getDatabase();
  const doc = await db.gia_snapshots.findOne(id).exec();
  if (doc) await doc.remove();
}

export async function subscribeGiaSnapshots(
  onNext: (entries: GiaSnapshotEntry[]) => void
): Promise<Subscription> {
  const db = await getDatabase();
  return db.gia_snapshots
    .find()
    .sort({ createdAt: 'desc' })
    .limit(MAX_SNAPSHOTS)
    .$.pipe(
      map((docs) =>
        docs.map((d) => parseEntry(d.toMutableJSON(false) as GiaSnapshotDocument))
      )
    )
    .subscribe(onNext);
}
