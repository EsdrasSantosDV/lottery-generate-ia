import { buildCaixaContestUrl } from '@/lib/caixa-api-paths';
import { fetchCaixaJson } from '@/lib/caixa-fetch';
import { normalizeCaixaResultado } from '@/lib/caixa-schemas';

/** Intervalo mínimo entre chamadas à API da Caixa (main thread / planejamento do sync). */
export const CAIXA_MAIN_THREAD_GAP_MS = 400;

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Último número de concurso publicado na API (endpoint sem número = último sorteio).
 * Com retries leves para 403/429.
 */
export async function fetchLatestContestNumber(baseUrl: string, segment: string): Promise<number> {
  const url = buildCaixaContestUrl(baseUrl, segment);
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const json = await fetchCaixaJson(url);
      const norm = normalizeCaixaResultado(json);
      if (!norm) throw new Error('Resposta inválida');
      return norm.numero;
    } catch {
      if (attempt === maxAttempts - 1) throw new Error(`Não foi possível obter o último concurso (${segment})`);
      await delay(CAIXA_MAIN_THREAD_GAP_MS + 120 * (attempt + 1));
    }
  }
  throw new Error('fetchLatestContestNumber');
}

/** Concursos a buscar no backfill: [start..latest] inclusive. */
export function contestRangeInclusive(start: number, latest: number): number[] {
  if (start > latest) return [];
  const out: number[] = [];
  for (let n = start; n <= latest; n++) out.push(n);
  return out;
}

/**
 * Concursos em [1..latest] que ainda não existem no banco (lacunas + cauda).
 */
export function missingContestNumbers(latest: number, present: ReadonlySet<number>): number[] {
  if (latest < 1) return [];
  const out: number[] = [];
  for (let n = 1; n <= latest; n++) {
    if (!present.has(n)) out.push(n);
  }
  return out;
}
