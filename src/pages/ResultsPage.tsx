import { useMemo, useEffect, useState, useRef, type ReactNode } from 'react';
import { LOTTERY_MODES, type LotteryMode } from '@/lib/lottery-types';
import { useAppState } from '@/contexts/AppContext';
import { LotterySelector } from '@/components/LotterySelector';
import { useOfficialDraws } from '@/hooks/use-official-draws';
import { isSupabaseConfigured } from '@/lib/supabase-client';
import {
  parseRateioPremio,
  formatBrl,
  displayDezenasForMode,
  digitLabel,
  isAcumulado,
} from '@/lib/lottery-draw-ui';
import type { LotteryDrawDocument } from '@/db/lottery-draw-model';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, Hash, TrendingUp, Trophy } from 'lucide-react';
import { DRAW_LIST_PAGE } from '@/lib/lottery-official-supabase';

function NumberOrb({
  value,
  label,
  accent,
  small,
}: {
  value: string;
  label?: string;
  accent: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {label != null && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground lg:text-[11px]">
          {label}
        </span>
      )}
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-[2.5px] bg-gradient-to-b from-card to-muted/30 font-bold tabular-nums transition-transform md:hover:scale-105',
          'lg:shadow-lg',
          small ? 'h-10 w-10 text-sm md:h-11 md:w-11' : 'h-12 w-12 text-base md:h-14 md:w-14 md:text-lg'
        )}
        style={{
          borderColor: accent,
          color: accent,
          boxShadow: `0 4px 20px -6px color-mix(in srgb, ${accent} 42%, transparent), 0 0 0 1px color-mix(in srgb, ${accent} 20%, transparent)`,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DrawNumbersVisual({ draw, mode }: { draw: LotteryDrawDocument; mode: LotteryMode }) {
  if (!mode) return null;
  const primary = displayDezenasForMode(mode, draw.dezenas);
  const segundo = draw.dezenasSegundoSorteio?.length
    ? displayDezenasForMode(mode, draw.dezenasSegundoSorteio)
    : [];

  if (mode.gameKind === 'positional') {
    return (
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {primary.map((n, i) => (
          <NumberOrb
            key={`p-${i}`}
            label={`Col. ${i + 1}`}
            value={digitLabel(n, mode)}
            accent={mode.color}
          />
        ))}
      </div>
    );
  }

  if (mode.gamesPerBet > 1 && segundo.length > 0) {
    return (
      <div className="space-y-8">
        <div>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mode.name.includes('Dupla') ? '1º sorteio' : 'Jogo 1'}
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
            {primary.map((n, i) => (
              <NumberOrb key={`a-${i}`} value={digitLabel(n, mode)} accent={mode.color} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mode.name.includes('Dupla') ? '2º sorteio' : 'Jogo 2'}
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
            {segundo.map((n, i) => (
              <NumberOrb key={`b-${i}`} value={digitLabel(n, mode)} accent={mode.color} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
      {primary.map((n, i) => (
        <NumberOrb key={i} value={digitLabel(n, mode)} accent={mode.color} small={primary.length > 12} />
      ))}
    </div>
  );
}

export function ResultsPage() {
  const { selectedMode } = useAppState();
  const mode = LOTTERY_MODES.find((m) => m.id === selectedMode.id) ?? selectedMode;

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isFetching } =
    useOfficialDraws(mode.id);

  const flat = useMemo(() => data?.pages.flatMap((p) => p) ?? [], [data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [mode.id]);

  const selected = useMemo(() => {
    if (flat.length === 0) return null;
    const byId = selectedId ? flat.find((d) => d.id === selectedId) : null;
    return byId ?? flat[0];
  }, [flat, selectedId]);

  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected?.id, mode.id]);

  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-6 animate-fade-in">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm',
          'lg:rounded-3xl lg:border-border/40 lg:bg-gradient-to-br lg:from-primary/[0.08] lg:via-card/90 lg:to-cyan-500/[0.07] lg:p-8 lg:shadow-[0_20px_50px_-24px_rgba(15,23,42,0.15)]',
          'dark:lg:from-primary/15 dark:lg:via-card dark:lg:to-cyan-950/20 dark:lg:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]'
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full opacity-40 blur-3xl lg:block"
          style={{ background: `radial-gradient(circle, color-mix(in srgb, ${mode.color} 55%, transparent) 0%, transparent 70%)` }}
          aria-hidden
        />
        <div className="relative">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm lg:mb-2">
            <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden />
            Caixa · histórico
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl lg:tracking-tight">
            Resultados{' '}
            <span className="bg-gradient-to-r from-primary via-cyan-600 to-primary bg-clip-text text-transparent dark:from-primary dark:via-cyan-400 dark:to-primary">
              oficiais
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-[15px]">
            Concursos sincronizados da Caixa — navegue pelo histórico com a mesma base do site oficial.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'rounded-xl border border-border/40 bg-muted/20 p-1.5',
          'lg:rounded-2xl lg:border-border/50 lg:bg-gradient-to-r lg:from-muted/40 lg:via-background lg:to-muted/30 lg:p-2 lg:shadow-inner'
        )}
      >
        <LotterySelector />
      </div>

      {!configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-foreground">
          <p className="font-medium">Supabase não configurado</p>
          <p className="mt-1 text-muted-foreground">
            Defina <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_SUPABASE_URL</code> e{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> no{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code> para carregar os resultados.
          </p>
        </div>
      )}

      {configured && (
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Carregando concursos…
            </div>
          )}

          {isError && (
            <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
              <p className="text-destructive">{error instanceof Error ? error.message : 'Erro ao carregar'}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            </div>
          )}

          {!isLoading && !isError && flat.length === 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
              Nenhum concurso desta modalidade no banco ainda. Rode a sincronização Caixa (banner no topo) para importar
              o histórico.
            </div>
          )}

          {!isLoading && !isError && flat.length > 0 && (
            <>
              {/* Mobile: faixa de chips + detalhe */}
              <div className="space-y-4 lg:hidden">
                <div className="sticky top-0 z-20 -mx-4 border-b border-border/40 bg-gradient-to-b from-background via-background/98 to-background/90 px-4 pb-3 pt-1 backdrop-blur-md">
                  <div className="mb-2 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Concursos
                      </p>
                      <p className="text-xs text-muted-foreground/90">Deslize · mais recentes primeiro</p>
                    </div>
                    <span
                      className="max-w-[40%] truncate rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold"
                      style={{ color: mode.color }}
                    >
                      {mode.name}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide pb-1 pt-0.5 [-webkit-overflow-scrolling:touch]">
                    {flat.map((d) => {
                      const active = selected?.id === d.id;
                      return (
                        <button
                          key={d.id}
                          ref={active ? activeChipRef : undefined}
                          type="button"
                          onClick={() => setSelectedId(d.id)}
                          className={cn(
                            'flex min-w-[5.5rem] shrink-0 snap-center flex-col items-center rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]',
                            active
                              ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                              : 'border-border/60 bg-card/90 text-foreground shadow-sm hover:border-primary/35 hover:bg-muted/50'
                          )}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Nº</span>
                          <span className="text-lg font-bold tabular-nums leading-none">{d.numero}</span>
                          <span
                            className={cn(
                              'mt-1 max-w-[5rem] truncate text-[10px] tabular-nums',
                              active ? 'text-primary-foreground/90' : 'text-muted-foreground'
                            )}
                          >
                            {d.dataApuracao || '—'}
                          </span>
                        </button>
                      );
                    })}
                    {hasNextPage && (
                      <button
                        type="button"
                        disabled={isFetchingNextPage}
                        onClick={() => fetchNextPage()}
                        className="flex min-w-[4.5rem] shrink-0 snap-center flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                      >
                        {isFetchingNextPage ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <span>+</span>
                            <span className="mt-0.5 text-[10px] leading-tight">mais {DRAW_LIST_PAGE}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {selected && (
                  <ResultDetailCard draw={selected} mode={mode} isRefreshing={isFetching && !isLoading} />
                )}
              </div>

              {/* Desktop: lista lateral + detalhe */}
              <div className="hidden min-h-[32rem] grid-cols-1 gap-6 lg:grid lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-8 xl:grid-cols-[minmax(0,18rem)_1fr]">
                <div
                  className={cn(
                    'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-md backdrop-blur-md',
                    'lg:bg-gradient-to-b lg:from-card lg:to-muted/25 lg:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:lg:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
                  )}
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: mode.color,
                    ['--lottery-accent' as string]: mode.color,
                  }}
                >
                  <div
                    className="border-b border-border/50 px-4 py-4"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, ${mode.color} 14%, transparent) 0%, transparent 55%)`,
                    }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Concursos</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/90">Mais recentes primeiro</p>
                  </div>
                  <ScrollArea className="h-[min(60vh,28rem)] lg:h-[min(70vh,36rem)]">
                    <div className="p-2.5 pr-3">
                      <ul className="space-y-1.5">
                        {flat.map((d) => {
                          const active = selected?.id === d.id;
                          return (
                            <li key={d.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(d.id)}
                                className={cn(
                                  'group flex w-full flex-col items-start rounded-xl border border-transparent px-3 py-2.5 text-left text-sm transition-all duration-200',
                                  active
                                    ? 'border-border/50 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                                    : 'border-l-[3px] border-l-transparent text-foreground hover:border-l-[color:var(--lottery-accent)] hover:bg-muted/50 hover:shadow-sm'
                                )}
                              >
                                <span className="flex items-center gap-1.5 font-semibold tabular-nums">
                                  <Hash
                                    className={cn(
                                      'h-3.5 w-3.5 transition-colors',
                                      active ? 'opacity-90' : 'text-muted-foreground group-hover:text-primary'
                                    )}
                                  />
                                  Concurso {d.numero}
                                </span>
                                <span
                                  className={cn(
                                    'mt-0.5 flex items-center gap-1 text-xs tabular-nums',
                                    active ? 'text-primary-foreground/90' : 'text-muted-foreground'
                                  )}
                                >
                                  <Calendar className="h-3 w-3 shrink-0 opacity-80" />
                                  {d.dataApuracao || '—'}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </ScrollArea>
                  {hasNextPage && (
                    <div className="border-t border-border/50 bg-muted/20 p-2.5">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full border-0 bg-gradient-to-r from-muted/80 to-muted/50 font-semibold shadow-sm hover:from-muted hover:to-muted/80"
                        disabled={isFetchingNextPage}
                        onClick={() => fetchNextPage()}
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Carregando…
                          </>
                        ) : (
                          `Carregar mais (${DRAW_LIST_PAGE})`
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="min-h-0">
                  {selected && (
                    <ResultDetailCard draw={selected} mode={mode} isRefreshing={isFetching && !isLoading} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultDetailCard({
  draw,
  mode,
  isRefreshing,
}: {
  draw: LotteryDrawDocument;
  mode: (typeof LOTTERY_MODES)[number];
  isRefreshing: boolean;
}) {
  const faixas = parseRateioPremio(draw.rateioPremio);
  const acumulou = isAcumulado(draw, faixas);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl lg:rounded-3xl lg:border-border/40 lg:shadow-[0_28px_64px_-28px_rgba(15,23,42,0.2)] dark:lg:shadow-[0_32px_70px_-24px_rgba(0,0,0,0.55)]">
      <div
        className="hidden h-1.5 w-full lg:block"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${mode.color} 45%, color-mix(in srgb, ${mode.color} 40%, cyan) 70%, transparent 100%)`,
        }}
        aria-hidden
      />
      <div
        className="relative px-4 pb-5 pt-5 sm:px-5 sm:pb-6 sm:pt-6 md:px-8 md:pb-8 md:pt-8 lg:pt-7"
        style={{
          background: `linear-gradient(165deg, color-mix(in srgb, ${mode.color} 16%, hsl(var(--card))) 0%, hsl(var(--card)) 42%, color-mix(in srgb, ${mode.color} 6%, hsl(var(--card))) 100%)`,
        }}
      >
        {isRefreshing && (
          <div className="absolute right-4 top-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Atualizando
          </div>
        )}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="bg-gradient-to-br from-foreground to-foreground/75 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl lg:text-4xl">
                {mode.name}
              </h2>
              {draw.ultimoConcurso && (
                <Badge variant="secondary" className="font-normal">
                  Último
                </Badge>
              )}
              {acumulou && (
                <Badge className="border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Acumulou
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Concurso <span className="font-semibold tabular-nums text-foreground">{draw.numero}</span>
              {draw.tipoJogo ? (
                <span className="text-muted-foreground"> · {draw.tipoJogo.replace(/_/g, ' ')}</span>
              ) : null}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-foreground">{draw.dataApuracao || '—'}</p>
            {draw.dataProximoConcurso ? (
              <p className="mt-0.5 text-xs text-muted-foreground">Próximo: {draw.dataProximoConcurso}</p>
            ) : null}
          </div>
        </div>

        <div
          className="mb-6 rounded-2xl border border-white/15 bg-background/40 p-3 shadow-inner backdrop-blur-md dark:bg-background/25 sm:p-4 md:mb-8 md:p-6 lg:rounded-3xl lg:border lg:bg-gradient-to-br lg:from-background/60 lg:to-muted/30 lg:p-8 lg:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          style={{
            borderColor: `color-mix(in srgb, ${mode.color} 22%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${mode.color} 12%, transparent), 0 12px 40px -16px color-mix(in srgb, ${mode.color} 18%, transparent)`,
          }}
        >
          <DrawNumbersVisual draw={draw} mode={mode} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {draw.valorEstimadoProximoConcurso != null && (
            <StatPill
              accent={mode.color}
              icon={<Trophy className="h-4 w-4" style={{ color: mode.color }} />}
              label="Estimativa próximo"
              value={formatBrl(draw.valorEstimadoProximoConcurso)}
            />
          )}
          {draw.valorAcumuladoProximoConcurso != null && (
            <StatPill
              accent={mode.color}
              icon={<TrendingUp className="h-4 w-4" style={{ color: mode.color }} />}
              label="Acumulado próximo"
              value={formatBrl(draw.valorAcumuladoProximoConcurso)}
            />
          )}
          {draw.valorArrecadado != null && (
            <StatPill accent={mode.color} label="Arrecadação" value={formatBrl(draw.valorArrecadado)} />
          )}
          {draw.valorTotalPremioFaixaUm != null && draw.valorTotalPremioFaixaUm > 0 && (
            <StatPill accent={mode.color} label="Total 1ª faixa" value={formatBrl(draw.valorTotalPremioFaixaUm)} />
          )}
        </div>
      </div>

      {faixas.length > 0 && (
        <>
          <div className="border-t border-border/60 bg-muted/10 px-4 py-4 md:hidden">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              Premiação
            </h3>
            <div className="space-y-2.5">
              {faixas.map((f) => (
                <div
                  key={f.faixa}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 border-l-[3px] bg-gradient-to-r from-card/90 to-muted/20 px-4 py-3.5 shadow-sm"
                  style={{ borderLeftColor: mode.color }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight text-foreground">{f.descricao}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.ganhadores === 1 ? '1 ganhador' : `${f.ganhadores.toLocaleString('pt-BR')} ganhadores`}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-base font-bold tabular-nums leading-none text-foreground">
                    {formatBrl(f.valorPremio)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden border-t border-border/50 bg-gradient-to-br from-muted/30 to-card/50 px-5 py-6 md:block md:px-8 md:py-8">
            <h3 className="mb-5 flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 shadow-inner"
                style={{
                  background: `linear-gradient(145deg, color-mix(in srgb, ${mode.color} 22%, hsl(var(--card))), color-mix(in srgb, hsl(var(--muted)) 70%, hsl(var(--card))))`,
                  color: mode.color,
                }}
              >
                <Trophy className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
              Premiação por faixa
            </h3>
            <div className="overflow-hidden rounded-xl border border-border/40 shadow-sm">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr
                    className="border-b border-border/50 text-left text-xs font-semibold uppercase tracking-wide text-foreground/90"
                    style={{
                      background: `linear-gradient(90deg, color-mix(in srgb, ${mode.color} 18%, hsl(var(--muted))) 0%, hsl(var(--muted)) 55%, color-mix(in srgb, ${mode.color} 10%, hsl(var(--muted))) 100%)`,
                    }}
                  >
                    <th className="px-5 py-3.5 font-semibold">Faixa</th>
                    <th className="px-5 py-3.5 font-semibold">Ganhadores</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Prêmio</th>
                  </tr>
                </thead>
                <tbody>
                  {faixas.map((f, i) => (
                    <tr
                      key={f.faixa}
                      className={cn(
                        'border-b border-border/35 transition-colors last:border-0',
                        i % 2 === 0 ? 'bg-card/50' : 'bg-muted/25',
                        'hover:bg-primary/[0.06]'
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-foreground">{f.descricao}</span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-muted-foreground">{f.ganhadores.toLocaleString('pt-BR')}</td>
                      <td
                        className="px-5 py-3.5 text-right text-base font-bold tabular-nums"
                        style={{ color: mode.color }}
                      >
                        {formatBrl(f.valorPremio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40 bg-muted/10 px-4 py-3 text-xs text-muted-foreground md:px-8 lg:py-4">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          Dados da sincronização Caixa · importados no app
        </span>
      </div>
    </div>
  );
}

function StatPill({ label, value, icon, accent }: { label: string; value: string; icon?: ReactNode; accent?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-gradient-to-br from-background/90 to-muted/20 px-4 py-3 backdrop-blur-sm',
        'lg:rounded-2xl lg:px-5 lg:py-4 lg:shadow-sm'
      )}
      style={
        accent
          ? {
              borderColor: `color-mix(in srgb, ${accent} 32%, hsl(var(--border)))`,
              boxShadow: `0 8px 28px -12px color-mix(in srgb, ${accent} 28%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.06)`,
            }
          : { borderColor: 'hsl(var(--border) / 0.5)' }
      }
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-lg font-bold tabular-nums tracking-tight text-foreground lg:text-xl">{value}</p>
    </div>
  );
}
