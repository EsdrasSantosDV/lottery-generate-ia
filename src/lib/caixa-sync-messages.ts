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
}

export type CaixaSyncWorkerIncoming =
  | {
      type: 'start';
      baseUrl: string;
      requestDelayMs: number;
      batchSize: number;
      /** Por modalidade: maior concurso já persistido (0 = vazio). */
      modes: { modeId: string; segment: string; maxNumeroLocal: number }[];
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
