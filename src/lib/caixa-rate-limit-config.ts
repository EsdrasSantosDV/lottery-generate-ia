/** Pausa entre chamadas ao planejar o sync (último concurso por modalidade). Default alto p/ não estourar limite. */
const DEFAULT_MAIN_GAP_MS = 1400;

/** Pausa entre cada GET de concurso no worker. Default alto. */
const DEFAULT_WORKER_DELAY_MS = 1300;

function parseEnvMs(raw: string | undefined, fallback: number, min: number): number {
  if (raw == null || String(raw).trim() === '') return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

export function getCaixaMainThreadGapMs(): number {
  return parseEnvMs(import.meta.env.VITE_CAIXA_MAIN_GAP_MS, DEFAULT_MAIN_GAP_MS, 300);
}

export function getCaixaWorkerRequestDelayMs(): number {
  return parseEnvMs(import.meta.env.VITE_CAIXA_REQUEST_DELAY_MS, DEFAULT_WORKER_DELAY_MS, 250);
}
