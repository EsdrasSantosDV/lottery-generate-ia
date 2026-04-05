import { useAppState } from '@/contexts/AppContext';
import { StatCard } from '@/components/StatCard';
import { NumberBadge } from '@/components/NumberBadge';
import { LotterySelector } from '@/components/LotterySelector';
import { formatNumber, formatDuration, getTopNumbers, getBottomNumbers, formatLotteryDigitLabel } from '@/lib/lottery-utils';
import { LOTTERY_MODES } from '@/lib/lottery-types';
import { Dices, Timer, Cpu, Hash, TrendingUp, TrendingDown, Trophy, ChevronRight } from 'lucide-react';
export function DashboardPage() {
  const { selectedMode, lastResult, setActiveTab } = useAppState();

  const modeForLastResult = lastResult
    ? LOTTERY_MODES.find((m) => m.id === lastResult.modeId) || selectedMode
    : selectedMode;

  const nRank = modeForLastResult.numbersPerGame;
  const topNums = lastResult ? getTopNumbers(lastResult.frequencies, nRank) : [];
  const bottomNums = lastResult ? getBottomNumbers(lastResult.frequencies, nRank) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema de geração de jogos</p>
      </div>

      <LotterySelector />

      <div
        role="button"
        tabIndex={0}
        className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-cyan-500/5 p-4 text-left shadow-sm outline-none transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring md:p-5"
        onClick={() => setActiveTab('results')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveTab('results');
          }
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner">
              <Trophy className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Resultados oficiais</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Veja concursos passados, dezenas sorteadas e premiação — visual limpo e fácil de navegar.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition-colors group-hover:bg-background">
            Abrir
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Modalidade"
          value={selectedMode.name}
          subtitle={selectedMode.description}
          icon={<Dices className="h-5 w-5" />}
        />
        <StatCard
          title={selectedMode.gamesPerBet > 1 ? 'Apostas Geradas' : 'Jogos Gerados'}
          value={lastResult ? formatNumber(lastResult.totalGames) : '—'}
          subtitle={
            lastResult
              ? selectedMode.gamesPerBet > 1
                ? `${selectedMode.gamesPerBet} jogos por aposta`
                : 'Última execução'
              : 'Nenhuma execução'
          }
          icon={<Hash className="h-5 w-5" />}
        />
        <StatCard
          title="Workers Utilizados"
          value={lastResult ? lastResult.workerCount : '—'}
          subtitle="Processamento paralelo"
          icon={<Cpu className="h-5 w-5" />}
        />
        <StatCard
          title="Tempo Total"
          value={lastResult ? formatDuration(lastResult.elapsedMs) : '—'}
          subtitle={
            lastResult
              ? `${(lastResult.totalGames / (lastResult.elapsedMs / 1000)).toFixed(0)} ${selectedMode.gamesPerBet > 1 ? 'apostas' : 'jogos'}/s`
              : ''
          }
          icon={<Timer className="h-5 w-5" />}
        />
      </div>

      {lastResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Top 10 — Mais Frequentes</h3>
            </div>
            <div className="flex max-h-[min(28rem,70vh)] flex-wrap gap-3 overflow-y-auto pr-1">
              {topNums.map((item) => (
                <NumberBadge
                  key={item.number}
                  number={item.number}
                  displayValue={formatLotteryDigitLabel(item.number, modeForLastResult)}
                  count={item.count}
                  highlight="top"
                />
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                {nRank} menos frequentes
              </h3>
            </div>
            <div className="flex max-h-[min(28rem,70vh)] flex-wrap gap-3 overflow-y-auto pr-1">
              {bottomNums.map((item) => (
                <NumberBadge
                  key={item.number}
                  number={item.number}
                  displayValue={formatLotteryDigitLabel(item.number, modeForLastResult)}
                  count={item.count}
                  highlight="bottom"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {!lastResult && (
        <div className="bg-card rounded-lg border border-border p-12 text-center animate-fade-in">
          <Dices className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum processamento realizado</h3>
          <p className="text-sm text-muted-foreground">
            Acesse o <strong>Gerador</strong> para iniciar uma simulação massiva de jogos.
          </p>
        </div>
      )}
    </div>
  );
}
