import type { SupabaseClient } from '@supabase/supabase-js';
import { SYNC_SUPPORTED_MODE_IDS } from '@/lib/caixa-api-paths';
import type { LotteryLabDatabase } from '@/db/database';
import type {
  LotteryDrawDocument,
  LotteryHistoricalStatsDocument,
  LotterySyncMetaDocument,
} from '@/db/lottery-results-schema';
import {
  bulkUpsertDraws,
  recomputeAllHistoricalStats,
  upsertSyncMeta,
} from '@/db/lottery-results-service';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-client';

/** Tabelas em `public` (schema padrão do cliente Supabase). */
const DRAW_PAGE = 1000;
const UPSERT_CHUNK = 400;

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') return parseInt(v, 10);
  return Number(v);
}

function rowToDraw(row: Record<string, unknown>): LotteryDrawDocument {
  return {
    id: String(row.id),
    modeId: String(row.mode_id),
    numero: num(row.numero),
    dataApuracao: String(row.data_apuracao ?? ''),
    dezenas: Array.isArray(row.dezenas) ? (row.dezenas as number[]) : [],
    dezenasSegundoSorteio: Array.isArray(row.dezenas_segundo_sorteio)
      ? (row.dezenas_segundo_sorteio as number[])
      : [],
    tipoJogo: String(row.tipo_jogo ?? ''),
    ultimoConcurso: Boolean(row.ultimo_concurso),
    fetchedAt: num(row.fetched_at),
  };
}

function drawToRow(d: LotteryDrawDocument): Record<string, unknown> {
  return {
    id: d.id,
    mode_id: d.modeId,
    numero: d.numero,
    data_apuracao: d.dataApuracao,
    dezenas: d.dezenas,
    dezenas_segundo_sorteio: d.dezenasSegundoSorteio,
    tipo_jogo: d.tipoJogo,
    ultimo_concurso: d.ultimoConcurso,
    fetched_at: d.fetchedAt,
  };
}

function rowToSyncMeta(row: Record<string, unknown>): LotterySyncMetaDocument {
  const st = row.status;
  const status =
    st === 'idle' || st === 'running' || st === 'done' || st === 'error' ? st : 'idle';
  return {
    id: String(row.id),
    lastConcursoNumero: num(row.last_concurso_numero),
    totalFetched: num(row.total_fetched),
    status,
    lastSyncAt: num(row.last_sync_at),
    errorMessage: String(row.error_message ?? ''),
  };
}

function syncMetaToRow(m: LotterySyncMetaDocument): Record<string, unknown> {
  return {
    id: m.id,
    last_concurso_numero: m.lastConcursoNumero,
    total_fetched: m.totalFetched,
    status: m.status,
    last_sync_at: m.lastSyncAt,
    error_message: m.errorMessage ?? '',
  };
}

function statsToRow(s: LotteryHistoricalStatsDocument): Record<string, unknown> {
  return {
    id: s.id,
    updated_at: s.updatedAt,
    total_concursos: s.totalConcursos,
    frequencies: s.frequencies,
  };
}

function mergeDraw(
  a: LotteryDrawDocument | undefined,
  b: LotteryDrawDocument | undefined
): LotteryDrawDocument | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return a.fetchedAt >= b.fetchedAt ? a : b;
}

function mergeSyncMeta(
  a: LotterySyncMetaDocument | undefined,
  b: LotterySyncMetaDocument | undefined
): LotterySyncMetaDocument | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return a.lastSyncAt >= b.lastSyncAt ? a : b;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchAllDraws(sb: SupabaseClient): Promise<LotteryDrawDocument[]> {
  const out: LotteryDrawDocument[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('lottery_draws')
      .select('*')
      .order('id')
      .range(from, from + DRAW_PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      out.push(rowToDraw(row as Record<string, unknown>));
    }
    if (rows.length < DRAW_PAGE) break;
    from += DRAW_PAGE;
  }
  return out;
}

async function fetchAllSyncMeta(sb: SupabaseClient): Promise<LotterySyncMetaDocument[]> {
  const { data, error } = await sb.from('lottery_sync_meta').select('*');
  if (error) throw error;
  return (data ?? []).map((row) => rowToSyncMeta(row as Record<string, unknown>));
}

async function upsertDrawsRemote(sb: SupabaseClient, draws: LotteryDrawDocument[]): Promise<void> {
  for (const part of chunk(draws, UPSERT_CHUNK)) {
    const rows = part.map(drawToRow);
    const { error } = await sb.from('lottery_draws').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
}

async function upsertSyncMetaRemote(sb: SupabaseClient, items: LotterySyncMetaDocument[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map(syncMetaToRow);
  const { error } = await sb.from('lottery_sync_meta').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

async function upsertStatsRemote(sb: SupabaseClient, items: LotteryHistoricalStatsDocument[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map(statsToRow);
  const { error } = await sb.from('lottery_historical_stats').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Mescla RxDB ↔ Supabase por timestamp (`fetchedAt`, `lastSyncAt`, `updatedAt`) e persiste o resultado nos dois lados.
 * Recalcula estatísticas históricas a partir dos sorteios mesclados.
 */
/** Retorna false se o Supabase estiver configurado mas o merge/envio falhar (dados locais já podem estar ok). */
export async function bidirectionalLotterySupabaseSync(db: LotteryLabDatabase): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const sb = getSupabaseClient();
  if (!sb) return true;

  try {
    const localDrawDocs = await db.lottery_draws.find().exec();
    const localDraws = new Map<string, LotteryDrawDocument>();
    for (const d of localDrawDocs) {
      const j = d.toMutableJSON(false) as LotteryDrawDocument;
      localDraws.set(j.id, j);
    }

    const remoteDrawsList = await fetchAllDraws(sb);
    const remoteDraws = new Map(remoteDrawsList.map((d) => [d.id, d]));

    const drawIds = new Set<string>([...localDraws.keys(), ...remoteDraws.keys()]);
    const mergedDraws: LotteryDrawDocument[] = [];
    for (const id of drawIds) {
      const m = mergeDraw(localDraws.get(id), remoteDraws.get(id));
      if (m) mergedDraws.push(m);
    }
    if (mergedDraws.length > 0) {
      await bulkUpsertDraws(db, mergedDraws);
      await upsertDrawsRemote(sb, mergedDraws);
    }

    const localMetaDocs = await db.lottery_sync_meta.find().exec();
    const localMeta = new Map<string, LotterySyncMetaDocument>();
    for (const d of localMetaDocs) {
      const j = d.toMutableJSON(false) as LotterySyncMetaDocument;
      localMeta.set(j.id, j);
    }
    const remoteMetaList = await fetchAllSyncMeta(sb);
    const remoteMeta = new Map(remoteMetaList.map((m) => [m.id, m]));
    const metaIds = new Set<string>([...localMeta.keys(), ...remoteMeta.keys()]);
    const mergedMeta: LotterySyncMetaDocument[] = [];
    for (const id of metaIds) {
      const m = mergeSyncMeta(localMeta.get(id), remoteMeta.get(id));
      if (m) mergedMeta.push(m);
    }
    for (const m of mergedMeta) {
      await upsertSyncMeta(db, m);
    }
    if (mergedMeta.length > 0) await upsertSyncMetaRemote(sb, mergedMeta);

    await recomputeAllHistoricalStats(db);
    const afterRecompute = await db.lottery_historical_stats.find().exec();
    const finalStats: LotteryHistoricalStatsDocument[] = [];
    for (const d of afterRecompute) {
      const j = d.toMutableJSON(false) as LotteryHistoricalStatsDocument;
      if (SYNC_SUPPORTED_MODE_IDS.includes(j.id)) {
        finalStats.push(j);
      }
    }
    if (finalStats.length > 0) await upsertStatsRemote(sb, finalStats);
    return true;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[lottery-supabase-sync]', e);
    }
    return false;
  }
}
