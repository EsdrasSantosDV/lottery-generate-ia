-- Bancos que rodaram a migration antiga: tabelas viviam em `loteria`. Move para `public` sem perder dados.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'loteria') THEN
    IF to_regclass('public.lottery_draws') IS NULL AND to_regclass('loteria.lottery_draws') IS NOT NULL THEN
      ALTER TABLE loteria.lottery_draws SET SCHEMA public;
    END IF;

    IF to_regclass('public.lottery_sync_meta') IS NULL AND to_regclass('loteria.lottery_sync_meta') IS NOT NULL THEN
      ALTER TABLE loteria.lottery_sync_meta SET SCHEMA public;
    END IF;

    IF to_regclass('public.lottery_historical_stats') IS NULL AND to_regclass('loteria.lottery_historical_stats') IS NOT NULL THEN
      ALTER TABLE loteria.lottery_historical_stats SET SCHEMA public;
    END IF;

    DROP SCHEMA IF EXISTS loteria CASCADE;
  END IF;
END $$;
