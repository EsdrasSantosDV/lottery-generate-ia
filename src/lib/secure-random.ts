/**
 * Aleatoriedade no browser (estudo / referência):
 *
 * - **CSPRNG:** `crypto.getRandomValues` alimenta um gerador adequado para amostragem
 *   uniforme; não há fonte “mais forte” no front-end sem hardware extra.
 * - **PRNG:** `Math.random` (fallback) não é criptográfico — só usado se `crypto` não existir.
 * - **Uniformidade:** rejection sampling abaixo evita viés de módulo ao reduzir 32 bits a [min,max].
 * - **Independência:** cada chamada é independente; combinações sem reposição usam Fisher–Yates.
 */

/**
 * Inteiro uniforme em [min, max] sem viés de módulo.
 * Prioriza Web Crypto API (CSPRNG); fallback com Math.random + rejection sampling.
 */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  if (range <= 0) {
    throw new RangeError('secureRandomInt: intervalo inválido');
  }
  if (range === 1) return min;

  const limit = Math.floor(0x1_0000_0000 / range) * range;

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    for (;;) {
      crypto.getRandomValues(buf);
      const x = buf[0];
      if (x < limit) return min + (x % range);
    }
  }

  for (;;) {
    const x = Math.floor(Math.random() * 0x1_0000_0000);
    if (x < limit) return min + (x % range);
  }
}

/**
 * Escolhe `k` elementos distintos com probabilidade uniforme sobre todos os subconjuntos
 * de tamanho k (Fisher–Yates parcial sobre uma cópia).
 */
export function pickRandomSubset<T>(items: readonly T[], k: number): T[] {
  if (k < 0) throw new RangeError('pickRandomSubset: k inválido');
  if (k === 0) return [];
  if (k > items.length) {
    throw new RangeError('pickRandomSubset: k maior que o tamanho do pool');
  }

  const pool = [...items];
  const n = pool.length;
  for (let i = 0; i < k; i++) {
    const j = secureRandomInt(i, n - 1);
    const t = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = t;
  }
  return pool.slice(0, k);
}
