-- Valores e lista de premiação (API oficial Caixa) em lottery_draws.

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS data_proximo_concurso text NOT NULL DEFAULT '';

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS valor_arrecadado double precision;

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS valor_estimado_proximo_concurso double precision;

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS valor_acumulado_proximo_concurso double precision;

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS valor_acumulado_concurso_0_5 double precision;

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS valor_acumulado_concurso_especial double precision;

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS valor_saldo_reserva_garantidora double precision;

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS valor_total_premio_faixa_um double precision;

ALTER TABLE public.lottery_draws
  ADD COLUMN IF NOT EXISTS rateio_premio jsonb NOT NULL DEFAULT '[]'::jsonb;
