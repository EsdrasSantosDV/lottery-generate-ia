import { useAppState } from '@/contexts/AppContext';
import { StatCard } from '@/components/StatCard';
import { NumberBadge } from '@/components/NumberBadge';
import { LotterySelector } from '@/components/LotterySelector';
import { formatNumber, formatDuration, getTopNumbers, getBottomNumbers } from '@/lib/lottery-utils';
import { Dices, Timer, Cpu, Hash, TrendingUp, TrendingDown } from 'lucide-react';

export function DashboardPage() {
  const { selectedMode, lastResult } = useAppState();

  const topNums = lastResult ? getTopNumbers(lastResult.frequencies, 10) : [];
  const bottomNums = lastResult ? getBottomNumbers(lastResult.frequencies, 10) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema de geração de jogos</p>
      </div>

      <LotterySelector />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Modalidade"
          value={selectedMode.name}
          subtitle={selectedMode.description}
          icon={<Dices className="h-5 w-5" />}
        />
        <StatCard
          title="Jogos Gerados"
          value={lastResult ? formatNumber(lastResult.totalGames) : '—'}
          subtitle={lastResult ? 'Última execução' : 'Nenhuma execução'}
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
          subtitle={lastResult ? `${(lastResult.totalGames / (lastResult.elapsedMs / 1000)).toFixed(0)} jogos/s` : ''}
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
            <div className="flex flex-wrap gap-3">
              {topNums.map((item) => (
                <NumberBadge key={item.number} number={item.number} count={item.count} highlight="top" />
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Top 10 — Menos Frequentes</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {bottomNums.map((item) => (
                <NumberBadge key={item.number} number={item.number} count={item.count} highlight="bottom" />
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
