-- Reparo: migrations antigas já constam como aplicadas, mas tabelas podem ter sido
-- removidas manualmente (ex.: DROP no DBeaver). Esta migration é NOVA no histórico e
-- roda de novo; DDL idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS).

CREATE TABLE IF NOT EXISTS public.lottery_draws (
  id text PRIMARY KEY,
  mode_id text NOT NULL,
  numero integer NOT NULL,
  data_apuracao text NOT NULL,
  dezenas integer[] NOT NULL DEFAULT '{}',
  dezenas_segundo_sorteio integer[] NOT NULL DEFAULT '{}',
  tipo_jogo text NOT NULL,
  ultimo_concurso boolean NOT NULL,
  fetched_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lottery_draws_mode_numero ON public.lottery_draws (mode_id, numero DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_fetched_at ON public.lottery_draws (fetched_at DESC);

CREATE TABLE IF NOT EXISTS public.lottery_sync_meta (
  id text PRIMARY KEY,
  last_concurso_numero integer NOT NULL,
  total_fetched integer NOT NULL,
  status text NOT NULL,
  last_sync_at bigint NOT NULL,
  error_message text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.lottery_historical_stats (
  id text PRIMARY KEY,
  updated_at bigint NOT NULL,
  total_concursos integer NOT NULL,
  frequencies jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.lottery_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_sync_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_historical_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lottery_draws_anon_all" ON public.lottery_draws;
DROP POLICY IF EXISTS "loteria_draws_anon_all" ON public.lottery_draws;
CREATE POLICY "lottery_draws_anon_all" ON public.lottery_draws
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "lottery_sync_meta_anon_all" ON public.lottery_sync_meta;
DROP POLICY IF EXISTS "loteria_sync_meta_anon_all" ON public.lottery_sync_meta;
CREATE POLICY "lottery_sync_meta_anon_all" ON public.lottery_sync_meta
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "lottery_historical_stats_anon_all" ON public.lottery_historical_stats;
DROP POLICY IF EXISTS "loteria_historical_stats_anon_all" ON public.lottery_historical_stats;
CREATE POLICY "lottery_historical_stats_anon_all" ON public.lottery_historical_stats
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "lottery_draws_authenticated_all" ON public.lottery_draws;
DROP POLICY IF EXISTS "loteria_draws_authenticated_all" ON public.lottery_draws;
CREATE POLICY "lottery_draws_authenticated_all" ON public.lottery_draws
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "lottery_sync_meta_authenticated_all" ON public.lottery_sync_meta;
DROP POLICY IF EXISTS "loteria_sync_meta_authenticated_all" ON public.lottery_sync_meta;
CREATE POLICY "lottery_sync_meta_authenticated_all" ON public.lottery_sync_meta
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "lottery_historical_stats_authenticated_all" ON public.lottery_historical_stats;
DROP POLICY IF EXISTS "loteria_historical_stats_authenticated_all" ON public.lottery_historical_stats;
CREATE POLICY "lottery_historical_stats_authenticated_all" ON public.lottery_historical_stats
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
