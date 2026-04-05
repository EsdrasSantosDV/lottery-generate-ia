import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCaixaJson } from '@/lib/caixa-fetch';

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
