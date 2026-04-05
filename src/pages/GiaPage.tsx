import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAppState } from '@/contexts/AppContext';
import { useGiaAnalysis } from '@/hooks/use-gia-analysis';
import { saveGiaSnapshot, subscribeGiaSnapshots, removeGiaSnapshot, type GiaSnapshotEntry } from '@/db/gia-snapshot-service';
import { isSupabaseConfigured } from '@/lib/supabase-client';
import {
  classifyDisplayScore,
  computeGiaAlerts,
  validateSlotsForCombinationGame,
  describeGiaSlotsIssues,
  type GiaClassification,
  type GiaSlotStatus,
} from '@/lib/gia-engine';
import { LOTTERY_MODES, type LotteryMode } from '@/lib/lottery-types';
import { formatLotteryDigitLabel } from '@/lib/lottery-utils';
import { LotterySelector } from '@/components/LotterySelector';
import { NumberBadge } from '@/components/NumberBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrainCircuit, Loader2, LineChart, ShieldAlert, Save, Trash2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

function classificationLabel(c: GiaClassification): string {
  switch (c) {
    case 'excelente':
      return 'Excelente';
    case 'bom':
      return 'Bom';
    case 'medio':
      return 'Médio';
    case 'abaixo':
      return 'Abaixo da média';
    default:
      return '';
  }
}

function createEmptySlots(mode: LotteryMode): string[] {
  if (mode.gameKind === 'positional') return [];
  return Array.from({ length: mode.numbersPerGame }, () => '');
}

/** Só dígitos, tamanho máximo coerente com `maxNumber`. */
function sanitizeSlotInput(raw: string, mode: LotteryMode): string {
  const digits = raw.replace(/\D/g, '');
  const maxLen = Math.max(1, String(mode.maxNumber).length);
  return digits.slice(0, maxLen);
}

function slotGridClass(n: number): string {
  if (n <= 6) return 'grid grid-cols-3 gap-3 sm:grid-cols-6';
  if (n <= 10) return 'grid grid-cols-3 gap-2.5 sm:grid-cols-5';
  if (n <= 15) return 'grid grid-cols-3 gap-2.5 sm:grid-cols-5';
  if (n <= 25) return 'grid grid-cols-4 gap-2 sm:grid-cols-5';
  return 'grid max-h-[min(52vh,30rem)] grid-cols-5 gap-1.5 overflow-y-auto overflow-x-hidden pr-1 sm:grid-cols-8 md:grid-cols-10';
}

function slotInputClass(status: GiaSlotStatus): string {
  switch (status) {
    case 'ok':
      return 'border-emerald-600/45 bg-emerald-500/[0.06] focus-visible:ring-emerald-500/35 dark:border-emerald-500/40';
    case 'empty':
      return 'border-border/90 bg-background/80';
    case 'invalid':
    case 'out_of_range':
    case 'duplicate':
      return 'border-destructive/80 bg-destructive/[0.06] focus-visible:ring-destructive/40';
    default:
      return '';
  }
}

function slotLabel(status: GiaSlotStatus): string | undefined {
  switch (status) {
    case 'invalid':
      return 'Número inválido';
    case 'out_of_range':
      return 'Fora da faixa';
    case 'duplicate':
      return 'Repetido';
    default:
      return undefined;
  }
}

export function GiaPage() {
  const { selectedMode } = useAppState();
  const mode = selectedMode;
  const [slots, setSlots] = useState<string[]>(() => createEmptySlots(mode));
  const [submittedGame, setSubmittedGame] = useState<number[] | null>(null);
  const [savedList, setSavedList] = useState<GiaSnapshotEntry[]>([]);

  useEffect(() => {
    const m = LOTTERY_MODES.find((x) => x.id === mode.id) ?? LOTTERY_MODES[0];
    setSlots(createEmptySlots(m));
    setSubmittedGame(null);
  }, [mode.id]);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    void subscribeGiaSnapshots((entries) => setSavedList(entries)).then((s) => {
      sub = s;
    });
    return () => sub?.unsubscribe();
  }, []);

  const validation = useMemo(
    () => validateSlotsForCombinationGame(slots, mode),
    [slots, mode]
  );

  const { result, isLoading, isError, error, hasHistoricalData } = useGiaAnalysis(mode, submittedGame);

  const alerts = useMemo(() => {
    if (!result) return [];
    return computeGiaAlerts(mode, result.game, result.numberFrequencies);
  }, [mode, result]);

  const setSlotAt = useCallback(
    (index: number, raw: string) => {
      const next = sanitizeSlotInput(raw, mode);
      setSlots((prev) => {
        const copy = [...prev];
        copy[index] = next;
        return copy;
      });
    },
    [mode]
  );

  const runAnalyze = useCallback(() => {
    const v = validateSlotsForCombinationGame(slots, mode);
    if (!v.game) {
      const msg = describeGiaSlotsIssues(v, mode) ?? 'Ajuste as dezenas antes de analisar.';
      toast.error(msg);
      return;
    }
    setSubmittedGame(v.game);
  }, [slots, mode]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    try {
      await saveGiaSnapshot(mode, result);
      toast.success('Análise salva neste dispositivo.');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível salvar.');
    }
  }, [mode, result]);

  const supabaseOk = isSupabaseConfigured();
  const positional = mode.gameKind === 'positional';
  const n = mode.numbersPerGame;
  const hintIssue = useMemo(() => {
    if (positional) return null;
    if (validation.game) return null;
    return describeGiaSlotsIssues(validation, mode);
  }, [validation, mode, positional]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Game Intelligence Analyzer (GIA)</h1>
        <p className="text-muted-foreground text-sm">
          Análise estatística do seu jogo com base em dados históricos reais
        </p>
      </div>

      {!supabaseOk && (
        <div className="bg-destructive/10 text-destructive border-destructive/30 rounded-lg border px-4 py-3 text-sm">
          Configure o Supabase (variáveis de ambiente) para carregar o histórico oficial.
        </div>
      )}

      {positional && (
        <div className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100 rounded-lg border px-4 py-3 text-sm">
          O GIA ainda não cobre jogos posicionais (Super Sete). Escolha uma modalidade por combinação.
        </div>
      )}

      <LotterySelector />

      {!positional && (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-border/80 p-5 shadow-sm',
            'bg-gradient-to-br from-card via-card to-primary/[0.07]',
            'dark:to-primary/[0.12]'
          )}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Hash className="text-primary h-5 w-5 shrink-0" />
                  Suas dezenas
                </h2>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  {n} números distintos entre{' '}
                  <span className="font-mono text-foreground">{formatLotteryDigitLabel(mode.minNumber, mode)}</span> e{' '}
                  <span className="font-mono text-foreground">{formatLotteryDigitLabel(mode.maxNumber, mode)}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setSlots(createEmptySlots(mode));
                  setSubmittedGame(null);
                }}
              >
                Limpar
              </Button>
            </div>

            <div className={cn(slotGridClass(n), n > 25 && '[&_input]:h-8 [&_input]:min-h-8 [&_input]:px-1.5 [&_input]:text-center [&_input]:text-xs')}>
              {Array.from({ length: n }, (_, i) => {
                const status = validation.statuses[i] ?? 'empty';
                const label = slotLabel(status);
                const compact = n > 25;
                return (
                  <div key={i} className="flex min-w-0 flex-col gap-1">
                    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">
                      {n <= 20 ? `Nº ${i + 1}` : `#${i + 1}`}
                    </span>
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      aria-invalid={status === 'invalid' || status === 'out_of_range' || status === 'duplicate'}
                      aria-label={`Dezena ${i + 1}`}
                      value={slots[i] ?? ''}
                      onChange={(e) => setSlotAt(i, e.target.value)}
                      placeholder="—"
                      disabled={!supabaseOk}
                      className={cn(
                        'text-center font-mono tabular-nums transition-colors',
                        compact ? 'h-8 text-xs' : 'h-11 text-sm sm:h-10',
                        slotInputClass(status)
                      )}
                    />
                    {label && (
                      <span className="text-destructive min-h-[1rem] text-[10px] leading-tight sm:text-[11px]">{label}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {hintIssue && (
              <p className="text-muted-foreground border-t border-border/60 pt-3 text-xs leading-relaxed">{hintIssue}</p>
            )}

            {validation.game && !hintIssue && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <span className="text-muted-foreground text-xs">Pré-visualização:</span>
                <div className="flex flex-wrap gap-1.5">
                  {validation.game.map((num) => (
                    <span
                      key={num}
                      className="bg-primary/12 text-primary border-primary/20 inline-flex min-w-[1.75rem] items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold"
                    >
                      {formatLotteryDigitLabel(num, mode)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="button" onClick={runAnalyze} disabled={positional || !supabaseOk} className="min-h-[44px]">
                <BrainCircuit className="mr-2 h-4 w-4" />
                Analisar jogo
              </Button>
            </div>
          </div>
        </div>
      )}

      {submittedGame && !positional && supabaseOk && (
        <div className="space-y-4">
          {isLoading && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando histórico oficial…
            </div>
          )}
          {isError && (
            <p className="text-destructive text-sm">{error?.message ?? 'Erro ao carregar dados.'}</p>
          )}
          {!isLoading && !hasHistoricalData && (
            <div className="bg-muted/50 rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum sorteio encontrado para esta modalidade. Sincronize os resultados da Caixa primeiro.
            </div>
          )}
          {!isLoading && hasHistoricalData && result === null && (
            <div className="bg-muted/50 rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
              Não foi possível analisar — verifique as dezenas e o histórico disponível.
            </div>
          )}
          {result && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <LineChart className="text-primary h-5 w-5" />
                    <h2 className="font-semibold text-foreground">Score retrospectivo</h2>
                  </div>
                  <p className="text-5xl font-bold tabular-nums text-foreground">{result.displayScore}</p>
                  <p className="text-muted-foreground mt-1 text-sm">de 100 (percentil vs. jogos aleatórios)</p>
                  <p className="mt-4 text-lg font-medium text-foreground">
                    Top {result.topPercentLabel}% — posição no ranking vs. baseline Monte Carlo (
                    {result.monteCarlo.simulationCount.toLocaleString('pt-BR')} jogos aleatórios)
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Classificação:{' '}
                    <span className="text-foreground font-medium">
                      {classificationLabel(classifyDisplayScore(result.displayScore))}
                    </span>
                  </p>
                </div>

                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                  <h2 className="mb-3 font-semibold text-foreground">Backtest no histórico</h2>
                  <p className="text-muted-foreground mb-4 text-xs">
                    Quantas vezes o mesmo jogo teria atingido cada faixa de acertos em sorteios passados (retrospectivo).
                  </p>
                  <ul className="space-y-2 text-sm">
                    {result.backtest.megaLabels ? (
                      <>
                        <li className="flex justify-between border-b border-border/60 pb-2">
                          <span>Sena (6)</span>
                          <span className="font-mono font-medium">{result.backtest.megaLabels.sena}</span>
                        </li>
                        <li className="flex justify-between border-b border-border/60 pb-2">
                          <span>Quina (5)</span>
                          <span className="font-mono font-medium">{result.backtest.megaLabels.quina}</span>
                        </li>
                        <li className="flex justify-between border-b border-border/60 pb-2">
                          <span>Quadra (4)</span>
                          <span className="font-mono font-medium">{result.backtest.megaLabels.quadra}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Terno (3)</span>
                          <span className="font-mono font-medium">{result.backtest.megaLabels.terno}</span>
                        </li>
                      </>
                    ) : (
                      Object.entries(result.backtest.histogram)
                        .map(([k, v]) => ({ k: Number(k), v }))
                        .filter(({ v }) => v > 0)
                        .sort((a, b) => b.k - a.k)
                        .map(({ k, v }) => (
                          <li key={k} className="flex justify-between border-b border-border/60 py-1 last:border-0">
                            <span>{k} acerto(s)</span>
                            <span className="font-mono font-medium">{v}</span>
                          </li>
                        ))
                    )}
                  </ul>
                  <p className="text-muted-foreground mt-4 text-xs">
                    Base: {result.backtest.totalSorteios.toLocaleString('pt-BR')} linhas de sorteio no histórico.
                  </p>
                </div>
              </div>

              {result.closestHit && (
                <div className="bg-card rounded-lg border border-primary/20 p-4">
                  <h3 className="text-foreground mb-1 text-sm font-semibold">Closest hit</h3>
                  <p className="text-muted-foreground text-sm">
                    Melhor aproximação: <span className="text-foreground font-medium">{result.closestHit.acertos}</span>{' '}
                    acertos no concurso{' '}
                    <span className="font-mono text-foreground">nº {result.closestHit.numeroConcurso}</span>
                  </p>
                </div>
              )}

              {alerts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldAlert className="h-4 w-4" />
                    Alertas e padrões
                  </h3>
                  <ul className="space-y-2">
                    {alerts.map((a) => (
                      <li
                        key={a.kind + a.message.slice(0, 24)}
                        className={cn(
                          'rounded-md border px-3 py-2 text-sm',
                          a.severity === 'warning'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50'
                            : 'border-border bg-muted/40 text-foreground'
                        )}
                      >
                        {a.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <Button type="button" variant="secondary" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar análise
                </Button>
                <span className="text-muted-foreground text-xs">Fica guardado só neste aparelho.</span>
              </div>

              <div className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
                <span className="shrink-0">ℹ️</span>
                <span>
                  Esta análise é <strong>retrospectiva</strong> e comparativa (incluindo baseline por simulação
                  aleatória). Ela <strong>não altera</strong> a probabilidade de sorteios futuros nem constitui
                  recomendação de investimento.
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {submittedGame && submittedGame.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {submittedGame.map((n) => (
            <NumberBadge
              key={n}
              number={n}
              displayValue={formatLotteryDigitLabel(n, mode)}
              size="md"
              highlight="none"
            />
          ))}
        </div>
      )}

      {savedList.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="mb-4 font-semibold text-foreground">Análises salvas neste dispositivo</h2>
          <ul className="space-y-3">
            {savedList.map((entry) => {
              const modeSaved = LOTTERY_MODES.find((m) => m.id === entry.modeId) ?? mode;
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-md border border-border/80 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {entry.modeName} — score {entry.analysis.displayScore}{' '}
                      <span className="text-muted-foreground font-normal">
                        ({format(entry.createdAt, "d MMM yyyy, HH:mm", { locale: ptBR })})
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1 font-mono text-xs">
                      {entry.game.map((n) => formatLotteryDigitLabel(n, modeSaved)).join(' · ')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end sm:self-center"
                    aria-label="Remover"
                    onClick={() => {
                      void removeGiaSnapshot(entry.id).catch(() => toast.error('Erro ao remover.'));
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
