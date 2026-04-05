/** Máximo de Web Workers paralelos que o utilizador pode escolher (não depende do número de cores). */
export const MAX_PARALLEL_WORKERS = 15;

/** Acima deste número pedimos confirmação: muitos workers isolados aumentam o uso de RAM no browser. */
export const HIGH_RAM_WORKER_THRESHOLD = 4;
