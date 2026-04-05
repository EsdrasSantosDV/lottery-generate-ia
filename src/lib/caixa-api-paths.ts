/** Segmentos da API oficial (path após `/portaldeloterias/api/`). */
export const CAIXA_API_MODE_SEGMENT: Record<string, string> = {
  'mega-sena': 'megasena',
  lotofacil: 'lotofacil',
  lotomania: 'lotomania',
  'dupla-sena': 'duplasena',
  'super-sete': 'supersete',
  timemania: 'timemania',
};

export const SYNC_SUPPORTED_MODE_IDS = Object.keys(CAIXA_API_MODE_SEGMENT);

export function getSegmentForMode(modeId: string): string | undefined {
  return CAIXA_API_MODE_SEGMENT[modeId];
}

/**
 * Base da API (sem barra final).
 * Em dev usa proxy Vite `/api-caixa` para evitar CORS; em produção URL absoluta da Caixa.
 * Sobrescreva com `VITE_CAIXA_API_BASE` se necessário.
 */
export function getCaixaApiBase(): string {
  const fromEnv = import.meta.env.VITE_CAIXA_API_BASE as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '/api-caixa';
  }
  return 'https://servicebus3.caixa.gov.br/portaldeloterias/api';
}

export function buildCaixaContestUrl(base: string, segment: string, contestNumber?: number): string {
  const b = base.replace(/\/$/, '');
  const path = contestNumber != null && Number.isFinite(contestNumber) ? `${segment}/${contestNumber}` : segment;
  return `${b}/${path}`;
}
