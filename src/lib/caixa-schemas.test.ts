import { describe, it, expect } from 'vitest';
import {
  cloneListaRateioPremio,
  normalizeCaixaResultado,
  parseDezenasStrings,
} from '@/lib/caixa-schemas';

describe('parseDezenasStrings', () => {
  it('ignora null e vazio', () => {
    expect(parseDezenasStrings(undefined)).toEqual([]);
    expect(parseDezenasStrings(null)).toEqual([]);
  });

  it('converte e filtra inválidos', () => {
    expect(parseDezenasStrings(['06', '14', 'x', '18'])).toEqual([6, 14, 18]);
  });
});

describe('normalizeCaixaResultado', () => {
  it('normaliza exemplo Mega-Sena', () => {
    const raw = {
      numero: 2990,
      dataApuracao: '28/03/2026',
      listaDezenas: ['06', '14', '18', '29', '30', '44'],
      tipoJogo: 'MEGA_SENA',
      ultimoConcurso: true,
      listaDezenasSegundoSorteio: null,
    };
    const n = normalizeCaixaResultado(raw);
    expect(n).not.toBeNull();
    expect(n!.numero).toBe(2990);
    expect(n!.dezenas).toEqual([6, 14, 18, 29, 30, 44]);
    expect(n!.dezenasSegundoSorteio).toEqual([]);
  });

  it('retorna null se numero inválido', () => {
    expect(normalizeCaixaResultado({ listaDezenas: ['1', '2'] })).toBeNull();
  });

  it('retorna null se sem dezenas', () => {
    expect(normalizeCaixaResultado({ numero: 1, listaDezenas: [] })).toBeNull();
  });

  it('usa dezenasSorteadasOrdemSorteio se listaDezenas vazia', () => {
    const n = normalizeCaixaResultado({
      numero: 10,
      dezenasSorteadasOrdemSorteio: ['01', '02', '03', '04', '05', '06'],
    });
    expect(n?.dezenas).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('sanitiza null bytes no texto', () => {
    const n = normalizeCaixaResultado({
      numero: 1,
      listaDezenas: ['01', '02', '03', '04', '05', '06'],
      nomeTimeCoracaoMesSorte: '\u0000\u0000',
    });
    expect(n).not.toBeNull();
  });

  it('preenche listaRateioPremio e valores financeiros', () => {
    const n = normalizeCaixaResultado({
      numero: 50,
      listaDezenas: ['01', '02', '03', '04', '05', '06'],
      listaRateioPremio: [{ descricao: '6 acertos', ganhadores: 1 }],
      valorArrecadado: 1000,
      dataProximoConcurso: '08/04/2026',
    });
    expect(n).not.toBeNull();
    expect(n!.listaRateioPremio).toHaveLength(1);
    expect(n!.valorArrecadado).toBe(1000);
    expect(n!.dataProximoConcurso).toBe('08/04/2026');
  });

  it('listaRateioPremio vazio quando API não envia', () => {
    const n = normalizeCaixaResultado({
      numero: 51,
      listaDezenas: ['01', '02', '03', '04', '05', '06'],
    });
    expect(n!.listaRateioPremio).toEqual([]);
  });
});

describe('cloneListaRateioPremio', () => {
  it('descarta não-objetos', () => {
    expect(cloneListaRateioPremio([{ a: 1 }, 2, 'x'])).toEqual([{ a: 1 }]);
  });
});
