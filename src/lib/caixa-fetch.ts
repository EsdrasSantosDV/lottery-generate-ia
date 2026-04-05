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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Lê `Retry-After` (segundos ou data HTTP). */
export function parseRetryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get('retry-after');
  if (!raw) return undefined;
  const sec = parseInt(raw.trim(), 10);
  if (!Number.isNaN(sec) && sec >= 0) return sec * 1000;
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return Math.max(0, t - Date.now());
  return undefined;
}

export function jitterMs(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * GET JSON com espera entre tentativas: respeita rate limit (429/403/408/5xx), `Retry-After` e backoff exponencial.
 * Não substitui um IP bloqueado — só reduz a chance de bloqueio por volume.
 */
export async function fetchCaixaJsonWithBackoff(
  url: string,
  options: {
    minDelayMs: number;
    maxAttempts?: number;
    maxDelayMs?: number;
    isCancelled?: () => boolean;
    /** Chamado antes de esperar quando a API sinaliza limite / indisponibilidade (429, 403, 408, 5xx). Útil para aumentar intervalo no worker. */
    onRateLimitHit?: (status: number, attempt: number) => void;
  }
): Promise<unknown> {
  const maxAttempts = options.maxAttempts ?? 12;
  const maxDelayMs = options.maxDelayMs ?? 180_000;
  const minDelayMs = options.minDelayMs;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (options.isCancelled?.()) throw new Error('cancelado');

    const res = await fetch(url, caixaFetchInit);

    if (res.ok) {
      const text = await res.text();
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new Error(`JSON inválido: ${url}`);
      }
    }

    await res.text().catch(() => {});

    const isRateLimitedOrUnavailable =
      res.status === 429 ||
      res.status === 403 ||
      res.status === 408 ||
      res.status >= 500;

    if (isRateLimitedOrUnavailable) {
      options.onRateLimitHit?.(res.status, attempt);
      const ra = parseRetryAfterMs(res) ?? 0;
      const exp = minDelayMs * Math.pow(2, attempt) + jitterMs(0, 800);
      /** 403 costuma ser WAF / limite: espera extra antes de tentar de novo (não é “burlar”, é respeitar o bloqueio temporário). */
      const extra403 = res.status === 403 ? 1200 + jitterMs(0, 400) : 0;
      const wait = Math.min(maxDelayMs, Math.max(ra, exp + extra403));
      if (options.isCancelled?.()) throw new Error('cancelado');
      await sleep(wait);
      continue;
    }

    throw new Error(`HTTP ${res.status}: ${url}`);
  }

  throw new Error(`HTTP após ${maxAttempts} tentativas: ${url}`);
}

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
