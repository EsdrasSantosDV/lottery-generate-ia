/**
 * Opções de fetch para a API pública da Caixa.
 * Sem Referer/Accept típicos do portal, o WAF costuma responder 403 (Forbidden).
 */
export const caixaFetchInit: RequestInit = {
  headers: {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  },
  referrer: 'https://loterias.caixa.gov.br/',
  referrerPolicy: 'strict-origin-when-cross-origin',
};

/**
 * GET JSON da API da Caixa com headers alinhados ao uso no site oficial.
 */
export async function fetchCaixaJson(url: string): Promise<unknown> {
  const res = await fetch(url, caixaFetchInit);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`JSON inválido: ${url}`);
  }
}
