import { describe, it, expect } from 'vitest';
import { normalizeCaixaResultado } from '@/lib/caixa-schemas';
import { normalizedToDrawDocument } from '@/lib/caixa-dto';

describe('normalizedToDrawDocument', () => {
  it('inclui valores e rateio quando presentes na API', () => {
    const raw = {
      numero: 100,
      dataApuracao: '01/01/2026',
      listaDezenas: ['01', '02', '03', '04', '05', '06'],
      tipoJogo: 'MEGA_SENA',
      ultimoConcurso: false,
      valorArrecadado: 1_500_000.5,
      valorEstimadoProximoConcurso: 2_000_000,
      listaRateioPremio: [{ faixa: 1, numeroDeGanhadores: 0, valorPremio: 0 }],
    };
    const n = normalizeCaixaResultado(raw);
    expect(n).not.toBeNull();
    const doc = normalizedToDrawDocument('mega-sena', n!, 1);
    expect(doc.id).toBe('mega-sena:100');
    expect(doc.valorArrecadado).toBe(1_500_000.5);
    expect(doc.valorEstimadoProximoConcurso).toBe(2_000_000);
    expect(doc.rateioPremio).toHaveLength(1);
    expect(doc.rateioPremio[0]).toMatchObject({ faixa: 1 });
  });

  it('omite escalares quando a API envia null', () => {
    const raw = {
      numero: 5,
      dataApuracao: '02/01/2026',
      listaDezenas: ['01', '02', '03', '04', '05', '06'],
      valorArrecadado: null,
    };
    const n = normalizeCaixaResultado(raw);
    expect(n).not.toBeNull();
    const doc = normalizedToDrawDocument('mega-sena', n!, 1);
    expect(doc.valorArrecadado).toBeUndefined();
    expect(doc.rateioPremio).toEqual([]);
  });
});
