import { useState, useEffect, useRef } from 'react';
import { useAppState } from '@/contexts/AppContext';
import { useLotteryGenerator } from '@/hooks/use-lottery-generator';
import { LotterySelector } from '@/components/LotterySelector';
import { WorkerStatusGrid } from '@/components/WorkerStatusGrid';
import { StatCard } from '@/components/StatCard';
import { formatNumber, formatDuration } from '@/lib/lottery-utils';
import { MAX_PARALLEL_WORKERS } from '@/lib/worker-limits';
import { saveToHistory } from '@/db/history-service';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw, Hash, Timer, Zap, Square } from 'lucide-react';
import { toast } from 'sonner';

const GAME_PRESETS = [1000, 10000, 100000, 500000, 1000000, 5000000];

export function GeneratorPage() {
  const { selectedMode, setLastResult, setActiveTab } = useAppState();
  const [totalGames, setTotalGames] = useState(100000);
  const [workerCount, setWorkerCount] = useState(4);
  const maxWorkers = MAX_PARALLEL_WORKERS;

  const { status, workers, result, elapsedMs, overallProgress, totalProcessed, totalTarget, start, stop, reset } =
    useLotteryGenerator();

  const handleStart = () => {
    start({ mode: selectedMode, totalGames, workerCount });
  };

  const handleStop = () => {
    stop();
  };

  const handleReset = () => {
    reset();
  };

  const savedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!result || status !== 'done' || savedRef.current === result.timestamp) return;

    savedRef.current = result.timestamp;
    setLastResult(result);

    let cancelled = false;
    (async () => {
      try {
        await saveToHistory(result);
      } catch (e) {
        if (!cancelled) {
          console.error('Falha ao gravar histórico no RxDB:', e);
          savedRef.current = null;
          const msg = e instanceof Error ? e.message : String(e);
          toast.error('Não foi possível guardar no histórico', { description: msg });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result, status, setLastResult]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerador de Jogos</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure e execute a geração massiva de combinações</p>
      </div>

      {/* Config */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-6 sm:p-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">Modalidade</label>
          <LotterySelector />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {selectedMode.gamesPerBet > 1 ? 'Quantidade de Apostas' : 'Quantidade de Jogos'}:{' '}
            <span className="text-primary font-bold">{formatNumber(totalGames)}</span>
          </label>
          {selectedMode.gamesPerBet > 1 && (
            <p className="text-xs text-muted-foreground mb-2">
              Cada aposta gera {selectedMode.gamesPerBet} jogos de {selectedMode.numbersPerGame} números.
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {GAME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTotalGames(preset)}
                className={`min-h-[44px] rounded-md border px-3 py-2 text-sm font-medium transition-colors md:min-h-0 md:py-1.5 md:text-xs ${
                  totalGames === preset
                    ? 'gradient-primary text-primary-foreground border-transparent'
                    : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
                }`}
                disabled={status === 'running'}
              >
                {formatNumber(preset)}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={totalGames}
            onChange={(e) => setTotalGames(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
            disabled={status === 'running'}
            min={1}
            max={10000000}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Web Workers: <span className="text-primary font-bold">{workerCount}</span>{' '}
            <span className="text-muted-foreground text-xs">(máx: {maxWorkers})</span>
          </label>
          <Slider
            value={[workerCount]}
            onValueChange={(v) => setWorkerCount(v[0])}
            min={1}
            max={maxWorkers}
            step={1}
            disabled={status === 'running'}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            onClick={handleStart}
            disabled={status === 'running'}
            className="gradient-primary text-primary-foreground hover:opacity-90 w-full sm:w-auto"
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar Geração
          </Button>
          <Button
            onClick={handleStop}
            variant="destructive"
            disabled={status !== 'running'}
            className="w-full disabled:opacity-50 sm:w-auto"
          >
            <Square className="h-4 w-4 mr-2 fill-current" />
            Parar
          </Button>
          <Button onClick={handleReset} variant="outline" disabled={status === 'running'} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      {/* Processing */}
      {status !== 'idle' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Processamento</h3>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  status === 'running'
                    ? 'bg-info/10 text-info'
                    : status === 'done'
                      ? 'bg-success/10 text-success'
                      : status === 'cancelled'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-destructive/10 text-destructive'
                }`}
              >
                {status === 'running'
                  ? 'Em andamento'
                  : status === 'done'
                    ? 'Concluído'
                    : status === 'cancelled'
                      ? 'Cancelado'
                      : 'Erro'}
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                title="Progresso"
                value={`${overallProgress.toFixed(1)}%`}
                icon={<Zap className="h-4 w-4" />}
              />
              <StatCard
                title="Processados"
                value={formatNumber(totalProcessed)}
                icon={<Hash className="h-4 w-4" />}
              />
              <StatCard
                title="Restantes"
                value={formatNumber(Math.max(0, totalTarget - totalProcessed))}
                icon={<Hash className="h-4 w-4" />}
              />
              <StatCard
                title="Tempo"
                value={formatDuration(elapsedMs)}
                icon={<Timer className="h-4 w-4" />}
              />
            </div>
          </div>

          <WorkerStatusGrid workers={workers} />

          {status === 'cancelled' && (
            <p className="text-sm text-muted-foreground">
              A geração foi interrompida; nenhum resultado parcial foi salvo. Use &quot;Resetar&quot; ou inicie de novo.
            </p>
          )}

          {status === 'done' && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => setActiveTab('analysis')}
                className="gradient-primary w-full text-primary-foreground sm:w-auto"
              >
                Ver Análise Estatística
              </Button>
              <Button onClick={() => setActiveTab('suggestions')} variant="outline" className="w-full sm:w-auto">
                Ver Sugestões
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
