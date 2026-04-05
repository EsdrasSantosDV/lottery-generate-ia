import type { FrequencyMap } from '@/lib/lottery-types';

/** Documento mínimo para agregar frequências (compatível com lottery_draws). */
export type DrawLike = {
  dezenas: number[];
  dezenasSegundoSorteio?: number[];
};

/**
 * Incrementa frequências para cada dezena sorteada (inclui segundo sorteio da Dupla Sena).
 */
export function addDrawToFrequencies(freq: FrequencyMap, draw: DrawLike, min: number, max: number): void {
  const all = [...draw.dezenas, ...(draw.dezenasSegundoSorteio ?? [])];
  for (let n = min; n <= max; n++) {
    if (freq[n] === undefined) freq[n] = 0;
  }
  for (const n of all) {
    if (Number.isFinite(n) && n >= min && n <= max) {
      freq[n] = (freq[n] ?? 0) + 1;
    }
  }
}

/** Constrói mapa de frequências a partir de uma lista de sorteios. */
export function buildFrequenciesFromDraws(
  draws: DrawLike[],
  min: number,
  max: number
): FrequencyMap {
  const freq: FrequencyMap = {};
  for (let n = min; n <= max; n++) {
    freq[n] = 0;
  }
  for (const d of draws) {
    addDrawToFrequencies(freq, d, min, max);
  }
  return freq;
}

/** Serializa FrequencyMap para objeto com chaves string (RxDB). */
export function frequencyMapToRecord(freq: FrequencyMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(freq)) {
    out[String(k)] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

/** Converte record RxDB de volta para FrequencyMap. */
export function recordToFrequencyMap(rec: Record<string, number> | undefined): FrequencyMap {
  const out: FrequencyMap = {};
  if (!rec) return out;
  for (const [k, v] of Object.entries(rec)) {
    const n = Number(k);
    if (Number.isFinite(n) && Number.isFinite(v)) {
      out[n] = v;
    }
  }
  return out;
}
