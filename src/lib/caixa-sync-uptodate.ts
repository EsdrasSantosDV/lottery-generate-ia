import { buildCaixaContestUrl } from '@/lib/caixa-api-paths';
import { fetchCaixaJsonWithBackoff } from '@/lib/caixa-fetch';
import { getCaixaMainThreadGapMs } from '@/lib/caixa-rate-limit-config';
import { normalizeCaixaResultado } from '@/lib/caixa-schemas';

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Último número de concurso publicado na API (endpoint sem número = último sorteio).
 * Usa backoff (429/403/5xx + Retry-After).
 */
export async function fetchLatestContestNumber(baseUrl: string, segment: string): Promise<number> {
  const url = buildCaixaContestUrl(baseUrl, segment);
  const gap = getCaixaMainThreadGapMs();
  const json = await fetchCaixaJsonWithBackoff(url, {
    minDelayMs: gap,
    maxAttempts: 12,
  });
  const norm = normalizeCaixaResultado(json);
  if (!norm) throw new Error('Resposta inválida');
  return norm.numero;
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
