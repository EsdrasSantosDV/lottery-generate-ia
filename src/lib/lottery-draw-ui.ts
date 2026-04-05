import type { LotteryMode } from '@/lib/lottery-types';
import { formatLotteryDigitLabel } from '@/lib/lottery-utils';
import type { LotteryDrawDocument } from '@/db/lottery-draw-model';

export type RateioFaixaUi = {
  descricao: string;
  faixa: number;
  ganhadores: number;
  valorPremio: number;
};

export function parseRateioPremio(rows: Record<string, unknown>[]): RateioFaixaUi[] {
  if (!rows.length) return [];
  const out: RateioFaixaUi[] = [];
  for (const r of rows) {
    const descricao = String(r.descricaoFaixa ?? r.descricao ?? '').trim();
    const faixa = Number(r.faixa ?? 0);
    const ganhadores = Number(r.numeroDeGanhadores ?? 0);
    const vp = r.valorPremio;
    let valorPremio = 0;
    if (typeof vp === 'number' && Number.isFinite(vp)) valorPremio = vp;
    else if (vp != null) {
      const s = String(vp).trim();
      const normalized =
        s.includes(',') && s.lastIndexOf(',') > s.lastIndexOf('.')
          ? s.replace(/\./g, '').replace(',', '.')
          : s.replace(/[^\d.-]/g, '');
      const n = parseFloat(normalized);
      if (Number.isFinite(n)) valorPremio = n;
    }
    out.push({ descricao: descricao || `Faixa ${faixa}`, faixa, ganhadores, valorPremio });
  }
  return out.sort((a, b) => a.faixa - b.faixa);
}

export function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Para combinações clássicas, ordena; Super Sete e similares mantêm a ordem do sorteio. */
export function displayDezenasForMode(mode: LotteryMode, dezenas: number[]): number[] {
  if (mode.gameKind === 'positional') return [...dezenas];
  return [...dezenas].sort((a, b) => a - b);
}

export function digitLabel(n: number, mode: LotteryMode): string {
  return formatLotteryDigitLabel(n, mode);
}

/** Considera acumulado quando a 1ª faixa não teve ganhadores (prêmio vai acumular). */
export function isAcumulado(_draw: LotteryDrawDocument, faixas: RateioFaixaUi[]): boolean {
  const top = faixas.find((f) => f.faixa === 1);
  return top != null && top.ganhadores === 0;
}
