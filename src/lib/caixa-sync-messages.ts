/** Payload de sorteio enviado do worker para a thread principal (espelha `LotteryDrawDocument`). */
export interface LotteryDrawSyncPayload {
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
  valorArrecadado?: number | null;
  valorEstimadoProximoConcurso?: number | null;
  valorAcumuladoProximoConcurso?: number | null;
  valorAcumuladoConcurso_0_5?: number | null;
  valorAcumuladoConcursoEspecial?: number | null;
  valorSaldoReservaGarantidora?: number | null;
  valorTotalPremioFaixaUm?: number | null;
  rateioPremio?: Record<string, unknown>[];
}

export type CaixaSyncWorkerIncoming =
  | {
      type: 'start';
      baseUrl: string;
      requestDelayMs: number;
      batchSize: number;
      /**
       * Por modalidade: lista explícita de concursos a buscar (já calculada no main:
       * faltantes no Supabase + cauda até o último publicado). Evita chamadas duplicadas
       * ao endpoint "último concurso" e permite só o necessário.
       */
      modes: {
        modeId: string;
        segment: string;
        contestNumbers: number[];
        latestRemote: number;
      }[];
    }
  | { type: 'cancel' };

export type CaixaSyncWorkerOutgoing =
  | { type: 'ready' }
  | {
      type: 'progress';
      modeId: string;
      phase: 'fetch' | 'persist';
      current: number;
      total: number;
    }
  | { type: 'batch'; draws: LotteryDrawSyncPayload[] }
  | { type: 'mode-done'; modeId: string; latestRemote: number; fetchedCount: number }
  | { type: 'mode-error'; modeId: string; message: string }
  | { type: 'complete' }
  | { type: 'error'; message: string };
