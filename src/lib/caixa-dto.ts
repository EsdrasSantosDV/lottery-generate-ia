import type { CaixaResultadoNormalizado } from '@/lib/caixa-schemas';
import { drawDocumentId, type LotteryDrawDocument } from '@/db/lottery-draw-model';
import type { LotteryDrawSyncPayload } from '@/lib/caixa-sync-messages';

function assignIfNum<K extends keyof LotteryDrawDocument>(
  doc: LotteryDrawDocument,
  key: K,
  v: number | null
): void {
  if (v != null && Number.isFinite(v)) (doc as Record<string, unknown>)[key as string] = v;
}

export function normalizedToDrawDocument(
  modeId: string,
  norm: CaixaResultadoNormalizado,
  fetchedAt: number
): LotteryDrawDocument {
  const doc: LotteryDrawDocument = {
    id: drawDocumentId(modeId, norm.numero),
    modeId,
    numero: norm.numero,
    dataApuracao: norm.dataApuracao,
    dezenas: norm.dezenas,
    dezenasSegundoSorteio: norm.dezenasSegundoSorteio ?? [],
    tipoJogo: norm.tipoJogo ?? '',
    ultimoConcurso: norm.ultimoConcurso,
    fetchedAt,
    rateioPremio: norm.listaRateioPremio,
  };
  if (norm.dataProximoConcurso) doc.dataProximoConcurso = norm.dataProximoConcurso;
  assignIfNum(doc, 'valorArrecadado', norm.valorArrecadado);
  assignIfNum(doc, 'valorEstimadoProximoConcurso', norm.valorEstimadoProximoConcurso);
  assignIfNum(doc, 'valorAcumuladoProximoConcurso', norm.valorAcumuladoProximoConcurso);
  assignIfNum(doc, 'valorAcumuladoConcurso_0_5', norm.valorAcumuladoConcurso_0_5);
  assignIfNum(doc, 'valorAcumuladoConcursoEspecial', norm.valorAcumuladoConcursoEspecial);
  assignIfNum(doc, 'valorSaldoReservaGarantidora', norm.valorSaldoReservaGarantidora);
  assignIfNum(doc, 'valorTotalPremioFaixaUm', norm.valorTotalPremioFaixaUm);
  return doc;
}

export function syncPayloadToDocument(p: LotteryDrawSyncPayload): LotteryDrawDocument {
  const doc: LotteryDrawDocument = {
    id: p.id,
    modeId: p.modeId,
    numero: p.numero,
    dataApuracao: p.dataApuracao,
    dezenas: p.dezenas,
    dezenasSegundoSorteio: p.dezenasSegundoSorteio,
    tipoJogo: p.tipoJogo,
    ultimoConcurso: p.ultimoConcurso,
    fetchedAt: p.fetchedAt,
    rateioPremio: p.rateioPremio ?? [],
  };
  if (p.dataProximoConcurso) doc.dataProximoConcurso = p.dataProximoConcurso;
  assignIfNum(doc, 'valorArrecadado', p.valorArrecadado ?? null);
  assignIfNum(doc, 'valorEstimadoProximoConcurso', p.valorEstimadoProximoConcurso ?? null);
  assignIfNum(doc, 'valorAcumuladoProximoConcurso', p.valorAcumuladoProximoConcurso ?? null);
  assignIfNum(doc, 'valorAcumuladoConcurso_0_5', p.valorAcumuladoConcurso_0_5 ?? null);
  assignIfNum(doc, 'valorAcumuladoConcursoEspecial', p.valorAcumuladoConcursoEspecial ?? null);
  assignIfNum(doc, 'valorSaldoReservaGarantidora', p.valorSaldoReservaGarantidora ?? null);
  assignIfNum(doc, 'valorTotalPremioFaixaUm', p.valorTotalPremioFaixaUm ?? null);
  return doc;
}
