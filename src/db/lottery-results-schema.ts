import type { RxJsonSchema } from 'rxdb/plugins/core';
import type {
  LotteryDrawDocument,
  LotteryHistoricalStatsDocument,
  LotterySyncMetaDocument,
} from './lottery-draw-model';

export type { LotteryDrawDocument, LotteryHistoricalStatsDocument, LotterySyncMetaDocument } from './lottery-draw-model';

/** Limite seguro para timestamps (ms) em índices RxDB (SC37). */
const TS_MAX = 9007199254740991;

const numberArray = {
  type: 'array',
  items: { type: 'number', minimum: 0, maximum: 99 },
} as const;

export const lotteryDrawSchema: RxJsonSchema<LotteryDrawDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  keyCompression: false,
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 200 },
    modeId: { type: 'string', maxLength: 100 },
    numero: { type: 'number', minimum: 0, maximum: 99999999, multipleOf: 1 },
    dataApuracao: { type: 'string', maxLength: 80 },
    dezenas: numberArray,
    dezenasSegundoSorteio: numberArray,
    tipoJogo: { type: 'string', maxLength: 120 },
    ultimoConcurso: { type: 'boolean' },
    fetchedAt: { type: 'number', minimum: 0, maximum: TS_MAX, multipleOf: 1 },
  },
  required: [
    'id',
    'modeId',
    'numero',
    'dataApuracao',
    'dezenas',
    'dezenasSegundoSorteio',
    'tipoJogo',
    'ultimoConcurso',
    'fetchedAt',
  ],
  indexes: ['modeId', 'numero', 'fetchedAt'],
};

export const lotterySyncMetaSchema: RxJsonSchema<LotterySyncMetaDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  keyCompression: false,
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    lastConcursoNumero: { type: 'number', minimum: 0, maximum: 99999999, multipleOf: 1 },
    totalFetched: { type: 'number', minimum: 0, maximum: 999999999, multipleOf: 1 },
    status: {
      type: 'string',
      maxLength: 20,
      enum: ['idle', 'running', 'done', 'error'],
    },
    lastSyncAt: { type: 'number', minimum: 0, maximum: TS_MAX, multipleOf: 1 },
    errorMessage: { type: 'string', maxLength: 2000 },
  },
  required: ['id', 'lastConcursoNumero', 'totalFetched', 'status', 'lastSyncAt', 'errorMessage'],
  indexes: ['lastSyncAt'],
};

export { drawDocumentId } from './lottery-draw-model';

export const lotteryHistoricalStatsSchema: RxJsonSchema<LotteryHistoricalStatsDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  keyCompression: false,
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    updatedAt: { type: 'number', minimum: 0, maximum: TS_MAX, multipleOf: 1 },
    totalConcursos: { type: 'number', minimum: 0, maximum: 999999999, multipleOf: 1 },
    frequencies: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
  },
  required: ['id', 'updatedAt', 'totalConcursos', 'frequencies'],
};
