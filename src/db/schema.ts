import type { RxJsonSchema } from 'rxdb/plugins/core';
import type { HistoryEntry } from '@/lib/lottery-types';

/** Documento persistido na coleção `generations` (espelha `HistoryEntry`). */
export type GenerationDocument = HistoryEntry;

const numberCountItem = {
  type: 'object',
  properties: {
    count: { type: 'number' },
    number: { type: 'number' },
  },
  required: ['number', 'count'],
} as const;

export const generationSchema: RxJsonSchema<GenerationDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  keyCompression: false,
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    modeId: { type: 'string', maxLength: 100 },
    modeName: { type: 'string', maxLength: 200 },
    totalGames: { type: 'number' },
    workerCount: { type: 'number' },
    elapsedMs: { type: 'number' },
    timestamp: {
      type: 'number',
      minimum: 0,
      maximum: 9007199254740991,
      multipleOf: 1,
    },
    topNumbers: {
      type: 'array',
      items: numberCountItem,
    },
    bottomNumbers: {
      type: 'array',
      items: numberCountItem,
    },
    frequencies: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
    sampleGames: {
      type: 'array',
      items: {
        type: 'array',
        items: { type: 'number' },
      },
    },
  },
  required: [
    'id',
    'modeId',
    'modeName',
    'totalGames',
    'workerCount',
    'elapsedMs',
    'timestamp',
    'topNumbers',
    'bottomNumbers',
    'frequencies',
    'sampleGames',
  ],
  indexes: ['timestamp'],
};

/** Snapshot de análise GIA persistido localmente (JSON em `analysisJson`). */
export type GiaSnapshotDocument = {
  id: string;
  modeId: string;
  modeName: string;
  game: number[];
  createdAt: number;
  analysisJson: string;
};

export const giaSnapshotSchema: RxJsonSchema<GiaSnapshotDocument> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  keyCompression: false,
  additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 100 },
    modeId: { type: 'string', maxLength: 100 },
    modeName: { type: 'string', maxLength: 200 },
    game: {
      type: 'array',
      items: { type: 'number' },
    },
    createdAt: {
      type: 'number',
      minimum: 0,
      maximum: 9007199254740991,
      multipleOf: 1,
    },
    analysisJson: { type: 'string', maxLength: 2_000_000 },
  },
  required: ['id', 'modeId', 'modeName', 'game', 'createdAt', 'analysisJson'],
  indexes: ['createdAt'],
};
