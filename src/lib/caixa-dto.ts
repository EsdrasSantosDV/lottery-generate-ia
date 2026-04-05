import type { CaixaResultadoNormalizado } from '@/lib/caixa-schemas';
import { drawDocumentId, type LotteryDrawDocument } from '@/db/lottery-draw-model';
import type { LotteryDrawSyncPayload } from '@/lib/caixa-sync-messages';

export function normalizedToDrawDocument(
  modeId: string,
  norm: CaixaResultadoNormalizado,
  fetchedAt: number
): LotteryDrawDocument {
  return {
    id: drawDocumentId(modeId, norm.numero),
    modeId,
    numero: norm.numero,
    dataApuracao: norm.dataApuracao,
    dezenas: norm.dezenas,
    dezenasSegundoSorteio: norm.dezenasSegundoSorteio ?? [],
    tipoJogo: norm.tipoJogo ?? '',
    ultimoConcurso: norm.ultimoConcurso,
    fetchedAt,
  };
}

export function syncPayloadToDocument(p: LotteryDrawSyncPayload): LotteryDrawDocument {
  return {
    id: p.id,
    modeId: p.modeId,
    numero: p.numero,
    dataApuracao: p.dataApuracao,
    dezenas: p.dezenas,
    dezenasSegundoSorteio: p.dezenasSegundoSorteio,
    tipoJogo: p.tipoJogo,
    ultimoConcurso: p.ultimoConcurso,
    fetchedAt: p.fetchedAt,
  };
}
