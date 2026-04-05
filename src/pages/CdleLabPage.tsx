import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppState } from '@/contexts/AppContext';
import { useCdleLab } from '@/hooks/use-cdle-lab';
import { LotterySelector } from '@/components/LotterySelector';
import { StatCard } from '@/components/StatCard';
import { formatNumber, formatDuration } from '@/lib/lottery-utils';
import {
  cdleModeFromLotteryMode,
  filterDrawsForCdleMode,
  evaluateAgainstHistoricalDraws,
  monteCarloEvaluate,
  type MonteCarloResult,
  type ScoreWeights,
} from '@/lib/cdle-engine';
import { isSupabaseConfigured } from '@/lib/supabase-client';
import { useHistoricalDezenasForMode } from '@/hooks/use-official-draws';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Play, RotateCcw, Square, Sparkles, FlaskConical, AlertTriangle } from 'lucide-react';
import { MAX_PARALLEL_WORKERS } from '@/lib/worker-limits';
import { useWorkerCountWithRamDialog } from '@/hooks/use-worker-count-with-ram-dialog';
import { WorkerRamWarningDialog } from '@/components/WorkerRamWarningDialog';

const CANDIDATE_PRESETS = [
  5_000,
  10_000,
  100_000,
  500_000,
  1_000_000,
  2_000_000,
  5_000_000,
  10_000_000,
  50_000_000,
  200_000_000,
  500_000_000,
];

const MIN_CANDIDATES = 500;
/** Teto pelo campo numérico (centenas de milhões; consome muita RAM). */
const MAX_CANDIDATES = 500_000_000;
/** O slider só cobre até este valor com passo fino; acima disso use o campo ou presets. */
const SLIDER_MAX_CANDIDATES = 20_000_000;

/** Passo fino no slider (até SLIDER_MAX_CANDIDATES). */
const CANDIDATES_SLIDER_STEP = 500;

function clampCandidates(n: number): number {
  if (!Number.isFinite(n)) return MIN_CANDIDATES;
  return Math.min(MAX_CANDIDATES, Math.max(MIN_CANDIDATES, Math.round(n)));
}

export function CdleLabPage() {
  const { selectedMode } = useAppState();
  const cdleOk = useMemo(() => cdleModeFromLotteryMode(selectedMode) !== null, [selectedMode]);

  const [totalCandidates, setTotalCandidates] = useState(10000);
  const [candidatesInputFocused, setCandidatesInputFocused] = useState(false);
  const [candidatesDraft, setCandidatesDraft] = useState(String(10000));
  const [portfolioSize, setPortfolioSize] = useState(20);
  const {
    workerCount,
    onWorkerSliderChange,
    confirmHighWorkerCount,
    dismissRamDialog,
    ramDialogOpen,
    pendingWorkerCount,
  } = useWorkerCountWithRamDialog(4);
  const [overlapRatio, setOverlapRatio] = useState(0.7);
  const [wEntropy, setWEntropy] = useState(30);
  const [wDistribution, setWDistribution] = useState(25);
  const [wAnti, setWAnti] = useState(20);
  const [wDiversity, setWDiversity] = useState(25);

  const [mcSims, setMcSims] = useState(15000);
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [mcRunning, setMcRunning] = useState(false);

  const maxWorkers = MAX_PARALLEL_WORKERS;

  useEffect(() => {
    if (!candidatesInputFocused) {
      setCandidatesDraft(String(totalCandidates));
    }
  }, [totalCandidates, candidatesInputFocused]);

  const weights: ScoreWeights = useMemo(
    () => ({
      entropy: wEntropy / 100,
      distribution: wDistribution / 100,
      antiPattern: wAnti / 100,
      diversity: wDiversity / 100,
    }),
    [wEntropy, wDistribution, wAnti, wDiversity]
  );

  const {
    status,
    workers,
    result,
    rawCount,
    elapsedMs,
    overallProgress,
    totalProcessed,
    totalTarget,
    start,
    stop,
    reset,
  } = useCdleLab();

  const cdleMode = useMemo(() => cdleModeFromLotteryMode(selectedMode), [selectedMode]);
  const { data: rawHistoricalDezenas, isLoading: histLoading, error: histQueryError } =
    useHistoricalDezenasForMode(selectedMode.id, Boolean(cdleOk));

  const validHistoricalDraws = useMemo(() => {
    if (!cdleMode || !rawHistoricalDezenas?.length) return [];
    return filterDrawsForCdleMode(cdleMode, rawHistoricalDezenas);
  }, [cdleMode, rawHistoricalDezenas]);

  const historicalMcResult = useMemo((): MonteCarloResult | null => {
    if (!result?.games.length || !validHistoricalDraws.length) return null;
    const games = result.games.map((g) => g.numbers);
    return evaluateAgainstHistoricalDraws(games, validHistoricalDraws);
  }, [result, validHistoricalDraws]);

  const handleStart = () => {
    if (!cdleOk) return;
    setMcResult(null);
    start({
      mode: selectedMode,
      totalCandidates,
      portfolioSize,
      workerCount,
      weights,
      overlapRatio,
    });
  };

  const runMonteCarlo = useCallback(() => {
    const mode = cdleModeFromLotteryMode(selectedMode);
    if (!mode || !result?.games.length) return;
    setMcRunning(true);
    setMcResult(null);
    const games = result.games.map((g) => g.numbers);
    window.setTimeout(() => {
      try {
        const m = monteCarloEvaluate(mode, games, mcSims);
        setMcResult(m);
      } finally {
        setMcRunning(false);
      }
    }, 0);
  }, [selectedMode, result, mcSims]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
          <Sparkles className="h-7 w-7 text-primary shrink-0" />
          Órbita Dinâmica
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
          Laboratório de cálculo estocástico e sistemas dinâmicos discretos: o mapa logístico gera
          caos determinístico; entropia por faixas, anti-padrão e portfólio com diversidade rodam em
          paralelo (Web Workers). Isto não aumenta a chance de sorteio; organiza amostras e reduz
          redundância entre jogos.
        </p>
      </div>

      {!cdleOk && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Modalidade não suportada</AlertTitle>
          <AlertDescription>
            Este laboratório aplica-se a jogos de combinação (ex.: Mega-Sena). A Super Sete é posicional —
            escolha outra modalidade.
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card rounded-lg border border-border p-4 space-y-6 sm:p-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">Modalidade</label>
          <LotterySelector />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block" htmlFor="cdle-candidates-input">
              Candidatos gerados
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Quantidade de candidatos antes da seleção do portfólio: até{' '}
              <span className="font-medium text-foreground">{formatNumber(MAX_CANDIDATES)}</span> pelo
              campo ou presets. O slider vai só até {formatNumber(SLIDER_MAX_CANDIDATES)}; acima disso
              digite o valor (centenas de milhões usam muita RAM).
            </p>
            {totalCandidates > SLIDER_MAX_CANDIDATES && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mb-2">
                Total acima do alcance do slider — ajuste pelo campo ou presets.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-3">
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <Input
                  id="cdle-candidates-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="font-mono max-w-[11rem]"
                  disabled={status === 'running' || !cdleOk}
                  value={candidatesInputFocused ? candidatesDraft : String(totalCandidates)}
                  onFocus={() => {
                    setCandidatesInputFocused(true);
                    setCandidatesDraft(String(totalCandidates));
                  }}
                  onChange={(e) => setCandidatesDraft(e.target.value)}
                  onBlur={() => {
                    setCandidatesInputFocused(false);
                    const parsed = parseInt(candidatesDraft.replace(/\s/g, ''), 10);
                    const next = clampCandidates(parsed);
                    setTotalCandidates(next);
                    setCandidatesDraft(String(next));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                />
                <span className="text-sm text-muted-foreground shrink-0">
                  = <span className="text-primary font-semibold">{formatNumber(totalCandidates)}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {CANDIDATE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTotalCandidates(clampCandidates(p))}
                  disabled={status === 'running' || !cdleOk}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    totalCandidates === p
                      ? 'gradient-primary text-primary-foreground border-transparent'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
                  }`}
                >
                  {formatNumber(p)}
                </button>
              ))}
            </div>
            <Slider
              value={[Math.min(totalCandidates, SLIDER_MAX_CANDIDATES)]}
              onValueChange={(v) => setTotalCandidates(clampCandidates(v[0]))}
              min={MIN_CANDIDATES}
              max={SLIDER_MAX_CANDIDATES}
              step={CANDIDATES_SLIDER_STEP}
              disabled={status === 'running' || !cdleOk}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Tamanho do portfólio:{' '}
              <span className="text-primary font-bold">{portfolioSize}</span> jogos
            </label>
            <Slider
              value={[portfolioSize]}
              onValueChange={(v) => setPortfolioSize(v[0])}
              min={5}
              max={100}
              step={1}
              disabled={status === 'running' || !cdleOk}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Web Workers: <span className="text-primary font-bold">{workerCount}</span>{' '}
            <span className="text-muted-foreground text-xs">(máx: {maxWorkers})</span>
          </label>
          <Slider
            value={[workerCount]}
            onValueChange={onWorkerSliderChange}
            min={1}
            max={maxWorkers}
            step={1}
            disabled={status === 'running' || !cdleOk}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Limite de sobreposição (anti-redundância):{' '}
            <span className="text-primary font-bold">{(overlapRatio * 100).toFixed(0)}%</span> das
            dezenas
          </label>
          <Slider
            value={[overlapRatio * 100]}
            onValueChange={(v) => setOverlapRatio(v[0] / 100)}
            min={40}
            max={90}
            step={5}
            disabled={status === 'running' || !cdleOk}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Peso entropia: {wEntropy}%</label>
            <Slider
              value={[wEntropy]}
              onValueChange={(v) => setWEntropy(v[0])}
              min={0}
              max={100}
              step={5}
              disabled={status === 'running' || !cdleOk}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Peso distribuição: {wDistribution}%</label>
            <Slider
              value={[wDistribution]}
              onValueChange={(v) => setWDistribution(v[0])}
              min={0}
              max={100}
              step={5}
              disabled={status === 'running' || !cdleOk}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Peso anti-padrão: {wAnti}%</label>
            <Slider
              value={[wAnti]}
              onValueChange={(v) => setWAnti(v[0])}
              min={0}
              max={100}
              step={5}
              disabled={status === 'running' || !cdleOk}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Peso diversidade: {wDiversity}%</label>
            <Slider
              value={[wDiversity]}
              onValueChange={(v) => setWDiversity(v[0])}
              min={0}
              max={100}
              step={5}
              disabled={status === 'running' || !cdleOk}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            onClick={handleStart}
            disabled={status === 'running' || !cdleOk}
            className="gradient-primary text-primary-foreground hover:opacity-90 w-full sm:w-auto"
          >
            <Play className="h-4 w-4 mr-2" />
            Gerar portfólio
          </Button>
          <Button
            onClick={stop}
            variant="destructive"
            disabled={status !== 'running'}
            className="w-full sm:w-auto"
          >
            <Square className="h-4 w-4 mr-2 fill-current" />
            Parar
          </Button>
          <Button onClick={reset} variant="outline" disabled={status === 'running'} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      <WorkerRamWarningDialog
        open={ramDialogOpen}
        pendingCount={pendingWorkerCount}
        onConfirm={confirmHighWorkerCount}
        onDismiss={dismissRamDialog}
      />

      {status !== 'idle' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex h-4 items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso dos workers</span>
              <span className="font-mono text-muted-foreground">
                {formatNumber(totalProcessed)} / {formatNumber(totalTarget)}
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Candidatos (mesclados)"
              value={formatNumber(rawCount)}
              subtitle={status === 'done' ? 'após workers' : '—'}
              icon={<FlaskConical className="h-4 w-4" />}
            />
            <StatCard
              title="Tempo"
              value={formatDuration(elapsedMs)}
              subtitle={status}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <StatCard
              title="Portfólio"
              value={result ? String(result.games.length) : '—'}
              subtitle="jogos selecionados"
              icon={<Sparkles className="h-4 w-4" />}
            />
            <StatCard
              title="Overlap médio"
              value={result ? result.stats.averageOverlap.toFixed(2) : '—'}
              subtitle="entre pares"
              icon={<Sparkles className="h-4 w-4" />}
            />
          </div>
        </div>
      )}

      {result && result.games.length > 0 && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Score breakdown</h2>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Números</TableHead>
                    <TableHead className="text-right">Entropia</TableHead>
                    <TableHead className="text-right">Distrib.</TableHead>
                    <TableHead className="text-right">Anti-padrão</TableHead>
                    <TableHead className="text-right">Diversidade</TableHead>
                    <TableHead className="text-right">Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.games.map((g, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {g.numbers.join(' · ')}
                      </TableCell>
                      <TableCell className="text-right">{(g.entropyScore * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{(g.distributionScore * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{(g.antiPatternScore * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{(g.diversityScore * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {(g.finalScore * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Médias: score {(result.stats.averageScore * 100).toFixed(2)}% · entropia{' '}
              {(result.stats.averageEntropy * 100).toFixed(2)}%
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-1">Análise estatística</h2>
            <p className="text-sm text-muted-foreground">
              Compare o portfólio ao histórico real sincronizado no Supabase e a uma simulação uniforme
              (referência teórica). Nenhum dos dois prevê o próximo concurso.
            </p>

            <div className="rounded-md border border-border p-4 space-y-2 bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Histórico real (Supabase)</h3>
              {!isSupabaseConfigured() && (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Configure <span className="font-mono">VITE_SUPABASE_URL</span> e a chave no{' '}
                  <span className="font-mono">.env</span> para carregar sorteios oficiais.
                </p>
              )}
              {isSupabaseConfigured() && histLoading && (
                <p className="text-sm text-muted-foreground">A carregar sorteios…</p>
              )}
              {isSupabaseConfigured() && !histLoading && histQueryError != null && (
                <p className="text-sm text-destructive">
                  {histQueryError instanceof Error ? histQueryError.message : 'Erro ao ler o histórico.'}
                </p>
              )}
              {isSupabaseConfigured() &&
                !histLoading &&
                histQueryError == null &&
                validHistoricalDraws.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum sorteio válido para esta modalidade na base. Sincronize os dados da Caixa
                    (página Resultados / sincronização).
                  </p>
                )}
              {historicalMcResult && (
                <div className="rounded-md bg-background/80 p-3 text-sm space-y-2 border border-border/60">
                  <p className="text-xs text-muted-foreground">
                    {validHistoricalDraws.length} concursos no histórico ·{' '}
                    {validHistoricalDraws.length * (result?.games.length ?? 0)} comparações (sorteio ×
                    jogo)
                  </p>
                  <p>
                    <span className="text-muted-foreground">Média de acertos por jogo:</span>{' '}
                    <span className="font-mono font-semibold">
                      {historicalMcResult.averageHits.toFixed(4)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Máximo observado:</span>{' '}
                    <span className="font-mono font-semibold">{historicalMcResult.maxHits}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Histograma (acertos → ocorrências):</p>
                  <pre className="text-xs font-mono overflow-x-auto p-2 rounded bg-muted/50 border border-border">
                    {JSON.stringify(historicalMcResult.distribution, null, 0)}
                  </pre>
                </div>
              )}
            </div>

            <h3 className="text-sm font-semibold text-foreground pt-2">Simulação uniforme (Monte Carlo)</h3>
            <p className="text-sm text-muted-foreground">
              Sorteios sintéticos com a mesma regra do jogo (amostragem uniforme sem reposição na faixa).
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Simulações: <span className="text-primary font-bold">{formatNumber(mcSims)}</span>
                </label>
                <Slider
                  value={[mcSims]}
                  onValueChange={(v) => setMcSims(v[0])}
                  min={1000}
                  max={100000}
                  step={1000}
                  disabled={mcRunning}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={runMonteCarlo}
                disabled={mcRunning}
                className="w-full sm:w-auto"
              >
                {mcRunning ? 'A calcular…' : 'Correr simulação'}
              </Button>
            </div>
            {mcResult && (
              <div className="rounded-md bg-muted/50 p-4 text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">Média de acertos por jogo:</span>{' '}
                  <span className="font-mono font-semibold">{mcResult.averageHits.toFixed(4)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Máximo observado:</span>{' '}
                  <span className="font-mono font-semibold">{mcResult.maxHits}</span>
                </p>
                <p className="text-muted-foreground text-xs">Histograma (acertos → ocorrências):</p>
                <pre className="text-xs font-mono overflow-x-auto p-2 rounded bg-background border border-border">
                  {JSON.stringify(mcResult.distribution, null, 0)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {result && result.games.length === 0 && status === 'done' && (
        <Alert>
          <AlertTitle>Nenhum jogo no portfólio</AlertTitle>
          <AlertDescription>
            Aumente o número de candidatos, relaxe o limite de sobreposição ou o peso dos critérios.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
