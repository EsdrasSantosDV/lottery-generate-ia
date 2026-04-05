/** Pausa entre chamadas ao planejar o sync (último concurso por modalidade). Default conservador p/ reduzir 403/429. */
const DEFAULT_MAIN_GAP_MS = 1600;

/** Pausa base entre cada GET de concurso no worker (jitter somado no worker). */
const DEFAULT_WORKER_DELAY_MS = 1500;

/** Pausa extra ao trocar de modalidade no worker (além do delay entre GETs). */
const DEFAULT_MODE_GAP_MS = 800;

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

export function getCaixaWorkerModeGapMs(): number {
  return parseEnvMs(import.meta.env.VITE_CAIXA_MODE_GAP_MS, DEFAULT_MODE_GAP_MS, 0);
}
