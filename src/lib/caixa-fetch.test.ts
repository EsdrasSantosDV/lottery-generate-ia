import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCaixaJson, fetchCaixaJsonWithBackoff, parseRetryAfterMs } from '@/lib/caixa-fetch';

describe('fetchCaixaJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retorna JSON parseado em sucesso', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => '{"a":1}',
    } as Response);

    await expect(fetchCaixaJson('https://example.com/x')).resolves.toEqual({ a: 1 });
    expect(fetch).toHaveBeenCalledWith('https://example.com/x', expect.any(Object));
  });

  it('lança em HTTP erro', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchCaixaJson('https://example.com/x')).rejects.toThrow('HTTP 404');
  });

  it('lança em JSON inválido', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => 'not json',
    } as Response);

    await expect(fetchCaixaJson('https://example.com/x')).rejects.toThrow('JSON inválido');
  });
});

describe('parseRetryAfterMs', () => {
  it('interpreta segundos', () => {
    const res = new Response(null, { headers: { 'retry-after': '3' } });
    expect(parseRetryAfterMs(res)).toBe(3000);
  });
});

describe('fetchCaixaJsonWithBackoff', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retenta após 429 e resolve', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '0' }),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '{"x":1}',
      } as Response);

    const p = fetchCaixaJsonWithBackoff('https://example.com/x', { minDelayMs: 100, maxAttempts: 5 });
    await vi.advanceTimersByTimeAsync(5000);
    await expect(p).resolves.toEqual({ x: 1 });
  });
});
