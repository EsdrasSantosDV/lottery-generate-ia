/** `combination` = sorteio sem ordem (único por jogo, ordenado). `positional` = uma dezena por posição, ordem importa (ex.: Super Sete). */
export type LotteryGameKind = 'combination' | 'positional';

export interface LotteryMode {
  id: string;
  name: string;
  description: string;
  minNumber: number;
  maxNumber: number;
  /** Números sorteados em cada jogo (ex.: 6 na Mega e na Dupla). */
  numbersPerGame: number;
  /** Quantos jogos independentes por aposta (Dupla Sena = 2). */
  gamesPerBet: number;
  color: string;
  /** Padrão: combinação clássica. */
  gameKind?: LotteryGameKind;
}

export const LOTTERY_MODES: LotteryMode[] = [
  {
    id: 'mega-sena',
    name: 'Mega-Sena',
    description: '6 números de 1 a 60',
    minNumber: 1,
    maxNumber: 60,
    numbersPerGame: 6,
    gamesPerBet: 1,
    color: 'hsl(145, 70%, 40%)',
  },
  {
    id: 'lotofacil',
    name: 'Lotofácil',
    description: '15 números de 1 a 25',
    minNumber: 1,
    maxNumber: 25,
    numbersPerGame: 15,
    gamesPerBet: 1,
    color: 'hsl(280, 70%, 50%)',
  },
  {
    id: 'lotomania',
    name: 'Lotomania',
    description: '50 números de 0 a 99',
    minNumber: 0,
    maxNumber: 99,
    numbersPerGame: 50,
    gamesPerBet: 1,
    color: 'hsl(25, 90%, 55%)',
  },
  {
    id: 'dupla-sena',
    name: 'Dupla Sena',
    description: '2 jogos de 6 números de 1 a 50 por aposta',
    minNumber: 1,
    maxNumber: 50,
    numbersPerGame: 6,
    gamesPerBet: 2,
    color: 'hsl(340, 75%, 50%)',
  },
  {
    id: 'super-sete',
    name: 'Super Sete',
    description: '7 colunas: 1 dezena 0–9 por posição (a ordem importa)',
    minNumber: 0,
    maxNumber: 9,
    numbersPerGame: 7,
    gamesPerBet: 1,
    gameKind: 'positional',
    color: 'hsl(48, 90%, 42%)',
  },
  {
    id: 'timemania',
    name: 'Timemania',
    description: '10 números de 1 a 80 (o time do coração você escolhe à parte)',
    minNumber: 1,
    maxNumber: 80,
    numbersPerGame: 10,
    gamesPerBet: 1,
    color: 'hsl(200, 85%, 42%)',
  },
];

export interface FrequencyMap {
  [number: number]: number;
}

export interface WorkerMessage {
  type: 'start';
  workerId: number;
  modeId: string;
  minNumber: number;
  maxNumber: number;
  numbersPerGame: number;
  gamesPerBet: number;
  totalGames: number;
  batchSize: number;
  gameKind?: LotteryGameKind;
}

export interface WorkerProgress {
  type: 'progress';
  workerId: number;
  processed: number;
  total: number;
}

export interface WorkerResult {
  type: 'result';
  workerId: number;
  frequencies: FrequencyMap;
  totalGenerated: number;
  sampleGames: number[][];
  elapsedMs: number;
}

export type WorkerResponse = WorkerProgress | WorkerResult;

export type WorkerStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface WorkerState {
  id: number;
  status: WorkerStatus;
  progress: number;
  processed: number;
  total: number;
}

export interface GenerationResult {
  modeId: string;
  modeName: string;
  totalGames: number;
  workerCount: number;
  frequencies: FrequencyMap;
  sampleGames: number[][];
  elapsedMs: number;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  modeId: string;
  modeName: string;
  totalGames: number;
  workerCount: number;
  elapsedMs: number;
  timestamp: number;
  topNumbers: { number: number; count: number }[];
  bottomNumbers: { number: number; count: number }[];
  frequencies: FrequencyMap;
  sampleGames: number[][];
}

export type ProcessingStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';
