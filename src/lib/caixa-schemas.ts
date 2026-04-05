import { z } from 'zod';

/** Resposta bruta da API (campos opcionais / nulos). */
export const caixaResultadoRawSchema = z
  .object({
    acumulado: z.boolean().nullable().optional(),
    dataApuracao: z.string().nullable().optional(),
    dataProximoConcurso: z.string().nullable().optional(),
    dezenasSorteadasOrdemSorteio: z.array(z.string()).nullable().optional(),
    exibirDetalhamentoPorCidade: z.boolean().nullable().optional(),
    id: z.union([z.string(), z.number(), z.null()]).optional(),
    indicadorConcursoEspecial: z.number().nullable().optional(),
    listaDezenas: z.array(z.string()).nullable().optional(),
    listaDezenasSegundoSorteio: z.array(z.string()).nullable().optional(),
    listaMunicipioUFGanhadores: z.array(z.unknown()).nullable().optional(),
    listaRateioPremio: z.array(z.unknown()).nullable().optional(),
    listaResultadoEquipeEsportiva: z.unknown().nullable().optional(),
    localSorteio: z.string().nullable().optional(),
    nomeMunicipioUFSorteio: z.string().nullable().optional(),
    nomeTimeCoracaoMesSorte: z.string().nullable().optional(),
    numero: z.number().nullable().optional(),
    numeroConcursoAnterior: z.number().nullable().optional(),
    numeroConcursoFinal_0_5: z.number().nullable().optional(),
    numeroConcursoProximo: z.number().nullable().optional(),
    numeroJogo: z.number().nullable().optional(),
    observacao: z.string().nullable().optional(),
    premiacaoContingencia: z.unknown().nullable().optional(),
    tipoJogo: z.string().nullable().optional(),
    tipoPublicacao: z.number().nullable().optional(),
    ultimoConcurso: z.boolean().nullable().optional(),
    valorArrecadado: z.number().nullable().optional(),
    valorAcumuladoConcurso_0_5: z.number().nullable().optional(),
    valorAcumuladoConcursoEspecial: z.number().nullable().optional(),
    valorAcumuladoProximoConcurso: z.number().nullable().optional(),
    valorEstimadoProximoConcurso: z.number().nullable().optional(),
    valorSaldoReservaGarantidora: z.number().nullable().optional(),
    valorTotalPremioFaixaUm: z.number().nullable().optional(),
  })
  .passthrough();

export type CaixaResultadoRaw = z.infer<typeof caixaResultadoRawSchema>;

export type CaixaResultadoNormalizado = {
  numero: number;
  dataApuracao: string;
  dezenas: number[];
  dezenasSegundoSorteio: number[];
  tipoJogo: string | null;
  ultimoConcurso: boolean;
  acumulado: boolean | null;
};

function sanitizeText(s: string | null | undefined): string {
  if (s == null || s === '') return '';
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c !== 0) out += s[i];
  }
  return out.trim();
}

/** Converte lista de strings em dezenas numéricas; descarta inválidos. */
export function parseDezenasStrings(arr: string[] | null | undefined): number[] {
  if (!arr?.length) return [];
  const out: number[] = [];
  for (const x of arr) {
    const n = parseInt(String(x).trim(), 10);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export function normalizeCaixaResultado(raw: unknown): CaixaResultadoNormalizado | null {
  const parsed = caixaResultadoRawSchema.safeParse(raw);
  if (!parsed.success) return null;

  const o = parsed.data;
  const numero = o.numero;
  if (numero == null || !Number.isFinite(numero) || numero < 1) return null;

  const lista = o.listaDezenas?.length ? o.listaDezenas : o.dezenasSorteadasOrdemSorteio;
  const dezenas = parseDezenasStrings(lista ?? []);
  if (dezenas.length === 0) return null;

  const segundo = parseDezenasStrings(o.listaDezenasSegundoSorteio ?? undefined);

  return {
    numero,
    dataApuracao: sanitizeText(o.dataApuracao ?? undefined) || '—',
    dezenas,
    dezenasSegundoSorteio: segundo,
    tipoJogo: o.tipoJogo != null ? sanitizeText(o.tipoJogo) : null,
    ultimoConcurso: o.ultimoConcurso === true,
    acumulado: o.acumulado ?? null,
  };
}
