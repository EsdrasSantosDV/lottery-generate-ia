import { buildCaixaContestUrl } from '@/lib/caixa-api-paths';
import { fetchCaixaJson } from '@/lib/caixa-fetch';
import { normalizeCaixaResultado } from '@/lib/caixa-schemas';

export type ModePayload = { modeId: string; segment: string; maxNumeroLocal: number };

/**
 * Consulta o último concurso publicado por modalidade e compara com o máximo já armazenado (Supabase).
 * Se já estiver tudo trazido (`maxNumeroLocal + 1` > último na API), evita o worker.
 */
export async function checkModesUpToDate(
  baseUrl: string,
  modes: ModePayload[]
): Promise<
  | { allUpToDate: true; latestByModeId: Map<string, number> }
  | { allUpToDate: false }
> {
  if (modes.length === 0) {
    return { allUpToDate: true, latestByModeId: new Map() };
  }

  const latestByModeId = new Map<string, number>();

  const results = await Promise.all(
    modes.map(async ({ modeId, segment, maxNumeroLocal }) => {
      try {
        const url = buildCaixaContestUrl(baseUrl, segment);
        const json = await fetchCaixaJson(url);
        const norm = normalizeCaixaResultado(json);
        if (!norm) return { ok: false as const };
        latestByModeId.set(modeId, norm.numero);
        const start = Math.max(1, maxNumeroLocal + 1);
        return { ok: true as const, upToDate: start > norm.numero };
      } catch {
        return { ok: false as const };
      }
    })
  );

  for (const r of results) {
    if (!r.ok) return { allUpToDate: false };
    if (!r.upToDate) return { allUpToDate: false };
  }

  return { allUpToDate: true, latestByModeId };
}
