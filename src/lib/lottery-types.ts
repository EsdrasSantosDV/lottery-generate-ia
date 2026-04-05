export interface LotteryMode {
  id: string;
  name: string;
  description: string;
  minNumber: number;
  maxNumber: number;
  numbersPerGame: number;
  color: string;
}

export const LOTTERY_MODES: LotteryMode[] = [
  {
    id: 'mega-sena',
    name: 'Mega-Sena',
    description: '6 números de 1 a 60',
    minNumber: 1,
    maxNumber: 60,
    numbersPerGame: 6,
    color: 'hsl(145, 70%, 40%)',
  },
  {
    id: 'lotofacil',
    name: 'Lotofácil',
    description: '15 números de 1 a 25',
    minNumber: 1,
    maxNumber: 25,
    numbersPerGame: 15,
    color: 'hsl(280, 70%, 50%)',
  },
  {
    id: 'lotomania',
    name: 'Lotomania',
    description: '50 números de 0 a 99',
    minNumber: 0,
    maxNumber: 99,
    numbersPerGame: 50,
    color: 'hsl(25, 90%, 55%)',
  },
  {
    id: 'dupla-sena',
    name: 'Dupla Sena',
    description: '6 números de 1 a 50',
    minNumber: 1,
    maxNumber: 50,
    numbersPerGame: 6,
    color: 'hsl(340, 75%, 50%)',
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
  totalGames: number;
  batchSize: number;
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

export type WorkerStatus = 'idle' | 'running' | 'done' | 'error';

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

export type ProcessingStatus = 'idle' | 'running' | 'done' | 'error';
