export type LotteryDrawDocument = {
  id: string;
  modeId: string;
  numero: number;
  dataApuracao: string;
  dezenas: number[];
  dezenasSegundoSorteio: number[];
  tipoJogo: string;
  ultimoConcurso: boolean;
  fetchedAt: number;
  dataProximoConcurso?: string;
  valorArrecadado?: number;
  valorEstimadoProximoConcurso?: number;
  valorAcumuladoProximoConcurso?: number;
  valorAcumuladoConcurso_0_5?: number;
  valorAcumuladoConcursoEspecial?: number;
  valorSaldoReservaGarantidora?: number;
  valorTotalPremioFaixaUm?: number;
  /** Faixas de premiação (listaRateioPremio da API). */
  rateioPremio: Record<string, unknown>[];
};

export function drawDocumentId(modeId: string, numero: number): string {
  return `${modeId}:${numero}`;
}

export type LotterySyncMetaDocument = {
  id: string;
  lastConcursoNumero: number;
  totalFetched: number;
  status: 'idle' | 'running' | 'done' | 'error';
  lastSyncAt: number;
  errorMessage: string;
};

export type LotteryHistoricalStatsDocument = {
  id: string;
  updatedAt: number;
  totalConcursos: number;
  frequencies: Record<string, number>;
};
