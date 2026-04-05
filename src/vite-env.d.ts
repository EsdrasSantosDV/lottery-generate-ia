/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base da API Caixa (sem barra final). Ex.: `https://servicebus3.caixa.gov.br/portaldeloterias/api` */
  readonly VITE_CAIXA_API_BASE?: string;
  /** Opcional: primeiro concurso a buscar no sync (ex.: `1` para repreencher premiação no histórico). */
  readonly VITE_CAIXA_BACKFILL_FROM_CONCURSO?: string;

  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  /** Chave anon/public para o client no browser */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Costuma ser a mesma que a anon (publishable) */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
