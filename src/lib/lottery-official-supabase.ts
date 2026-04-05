import type { SupabaseClient } from '@supabase/supabase-js';
import { SYNC_SUPPORTED_MODE_IDS } from '@/lib/caixa-api-paths';
import { buildFrequenciesFromDraws, frequencyMapToRecord } from '@/lib/caixa-stats';
import type {
  LotteryDrawDocument,
  LotteryHistoricalStatsDocument,
  LotterySyncMetaDocument,
} from '@/db/lottery-draw-model';
import { LOTTERY_MODES } from '@/lib/lottery-types';

const UPSERT_CHUNK = 400;
const DRAW_PAGE = 1000;

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') return parseInt(v, 10);
  return Number(v);
}

function numOpt(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parseRateioPremio(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x));
}

function rowToDraw(row: Record<string, unknown>): LotteryDrawDocument {
  const doc: LotteryDrawDocument = {
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
    rateioPremio: parseRateioPremio(row.rateio_premio),
  };
  const dp = row.data_proximo_concurso;
  if (dp != null && String(dp).trim() !== '') doc.dataProximoConcurso = String(dp);
  const va = numOpt(row.valor_arrecadado);
  if (va !== undefined) doc.valorArrecadado = va;
  const ve = numOpt(row.valor_estimado_proximo_concurso);
  if (ve !== undefined) doc.valorEstimadoProximoConcurso = ve;
  const vap = numOpt(row.valor_acumulado_proximo_concurso);
  if (vap !== undefined) doc.valorAcumuladoProximoConcurso = vap;
  const v05 = numOpt(row.valor_acumulado_concurso_0_5);
  if (v05 !== undefined) doc.valorAcumuladoConcurso_0_5 = v05;
  const vesp = numOpt(row.valor_acumulado_concurso_especial);
  if (vesp !== undefined) doc.valorAcumuladoConcursoEspecial = vesp;
  const vsr = numOpt(row.valor_saldo_reserva_garantidora);
  if (vsr !== undefined) doc.valorSaldoReservaGarantidora = vsr;
  const vtf = numOpt(row.valor_total_premio_faixa_um);
  if (vtf !== undefined) doc.valorTotalPremioFaixaUm = vtf;
  return doc;
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
    data_proximo_concurso: d.dataProximoConcurso ?? '',
    valor_arrecadado: d.valorArrecadado ?? null,
    valor_estimado_proximo_concurso: d.valorEstimadoProximoConcurso ?? null,
    valor_acumulado_proximo_concurso: d.valorAcumuladoProximoConcurso ?? null,
    valor_acumulado_concurso_0_5: d.valorAcumuladoConcurso_0_5 ?? null,
    valor_acumulado_concurso_especial: d.valorAcumuladoConcursoEspecial ?? null,
    valor_saldo_reserva_garantidora: d.valorSaldoReservaGarantidora ?? null,
    valor_total_premio_faixa_um: d.valorTotalPremioFaixaUm ?? null,
    rateio_premio: d.rateioPremio,
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function getMaxNumeroForMode(sb: SupabaseClient, modeId: string): Promise<number> {
  const { data, error } = await sb
    .from('lottery_draws')
    .select('numero')
    .eq('mode_id', modeId)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || typeof data !== 'object' || !('numero' in data)) return 0;
  return num((data as { numero: unknown }).numero);
}

/** Todos os `numero` já salvos até `upToInclusive` (para detectar lacunas e só buscar o que falta). */
export async function fetchNumerosPresentUpTo(
  sb: SupabaseClient,
  modeId: string,
  upToInclusive: number
): Promise<Set<number>> {
  const set = new Set<number>();
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('lottery_draws')
      .select('numero')
      .eq('mode_id', modeId)
      .lte('numero', upToInclusive)
      .order('numero', { ascending: true })
      .range(from, from + DRAW_PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      set.add(num((row as { numero: unknown }).numero));
    }
    if (rows.length < DRAW_PAGE) break;
    from += DRAW_PAGE;
  }
  return set;
}

export async function bulkUpsertDraws(sb: SupabaseClient, docs: LotteryDrawDocument[]): Promise<void> {
  if (docs.length === 0) return;
  for (const part of chunk(docs, UPSERT_CHUNK)) {
    const rows = part.map(drawToRow);
    const { error } = await sb.from('lottery_draws').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
}

export async function upsertSyncMeta(
  sb: SupabaseClient,
  partial: Omit<LotterySyncMetaDocument, 'id'> & { id: string }
): Promise<void> {
  const row = syncMetaToRow({
    id: partial.id,
    lastConcursoNumero: partial.lastConcursoNumero,
    totalFetched: partial.totalFetched,
    status: partial.status,
    lastSyncAt: partial.lastSyncAt,
    errorMessage: partial.errorMessage ?? '',
  });
  const { error } = await sb.from('lottery_sync_meta').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

async function fetchDrawsForMode(sb: SupabaseClient, modeId: string): Promise<LotteryDrawDocument[]> {
  const out: LotteryDrawDocument[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('lottery_draws')
      .select('*')
      .eq('mode_id', modeId)
      .order('numero')
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

export async function recomputeHistoricalStatsForMode(sb: SupabaseClient, modeId: string): Promise<void> {
  const mode = LOTTERY_MODES.find((m) => m.id === modeId);
  if (!mode) return;

  const draws = await fetchDrawsForMode(sb, modeId);
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
  const { error } = await sb.from('lottery_historical_stats').upsert(statsToRow(row), { onConflict: 'id' });
  if (error) throw error;
}

export async function recomputeAllHistoricalStats(sb: SupabaseClient): Promise<void> {
  for (const modeId of SYNC_SUPPORTED_MODE_IDS) {
    await recomputeHistoricalStatsForMode(sb, modeId);
  }
}
