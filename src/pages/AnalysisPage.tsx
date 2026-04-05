import { useState } from 'react';
import { useAppState } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getRankedFrequencies,
  formatNumber,
  expectedOccurrencesPerNumber,
  formatLotteryDigitLabel,
} from '@/lib/lottery-utils';
import { NumberBadge } from '@/components/NumberBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, ArrowUpDown } from 'lucide-react';
import { LOTTERY_MODES } from '@/lib/lottery-types';

type SortMode = 'number' | 'freq-asc' | 'freq-desc';

export function AnalysisPage() {
  const { lastResult, selectedMode } = useAppState();
  const isMobile = useIsMobile();
  const [sortMode, setSortMode] = useState<SortMode>('freq-desc');

  if (!lastResult) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Análise Estatística</h1>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sem dados para análise</h3>
          <p className="text-sm text-muted-foreground">Execute uma geração primeiro.</p>
        </div>
      </div>
    );
  }

  const modeForAnalysis = LOTTERY_MODES.find((m) => m.id === lastResult.modeId) ?? selectedMode;
  const nPerGame = modeForAnalysis.numbersPerGame;

  const ranked = getRankedFrequencies(lastResult.frequencies);
  const maxCount = ranked[0]?.count || 1;

  const sortedData = [...ranked].sort((a, b) => {
    if (sortMode === 'number') return a.number - b.number;
    if (sortMode === 'freq-asc') return a.count - b.count;
    return b.count - a.count;
  });

  const expectedPerNumber = expectedOccurrencesPerNumber(lastResult.totalGames, modeForAnalysis);

  const chartData = [...ranked]
    .sort((a, b) => a.number - b.number)
    .map((item) => ({
      num: formatLotteryDigitLabel(item.number, modeForAnalysis),
      count: item.count,
      pct: expectedPerNumber > 0 ? (item.count / expectedPerNumber) * 100 : 0,
    }));

  const topIdx = Math.min(nPerGame - 1, ranked.length - 1);
  const bottomIdx = Math.max(0, ranked.length - nPerGame);
  const topThreshold = ranked[topIdx]?.count ?? 0;
  const bottomThreshold = ranked[bottomIdx]?.count ?? Infinity;

  const chartMargin = isMobile
    ? { top: 8, right: 4, left: 4, bottom: 28 }
    : { top: 0, right: 0, left: 0, bottom: 0 };
  const tickFontSize = isMobile ? 11 : 10;
  const xInterval =
    chartData.length > 50 ? 4 : isMobile && chartData.length > 25 ? 2 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Análise Estatística</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Distribuição de frequência — {lastResult.modeName} —{' '}
          {modeForAnalysis.gamesPerBet > 1
            ? `${formatNumber(lastResult.totalGames)} apostas (${modeForAnalysis.gamesPerBet} jogos cada)`
            : `${formatNumber(lastResult.totalGames)} jogos`}
          {modeForAnalysis.gameKind === 'positional' && (
            <span className="block mt-1 text-xs">
              Agregado por dezena (0–9) em todas as posições; no Super Sete a ordem do jogo importa.
            </span>
          )}
        </p>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Distribuição por Número</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin}>
              <XAxis dataKey="num" tick={{ fontSize: tickFontSize }} interval={xInterval} />
              <YAxis tick={{ fontSize: tickFontSize }} width={isMobile ? 44 : undefined} />
              <Tooltip
                formatter={(value: number) => [formatNumber(value), 'Ocorrências']}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, idx) => {
                  const isTop = entry.count >= topThreshold;
                  const isBottom = entry.count <= bottomThreshold;
                  return (
                    <Cell
                      key={idx}
                      fill={isTop ? 'hsl(210, 100%, 50%)' : isBottom ? 'hsl(220, 10%, 75%)' : 'hsl(210, 60%, 70%)'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Ordenar:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['freq-desc', 'freq-asc', 'number'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`min-h-[44px] rounded-md px-3 py-2 text-sm font-medium transition-colors md:min-h-0 md:py-1 md:text-xs ${
                sortMode === mode
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {mode === 'freq-desc' ? '↓ Frequência' : mode === 'freq-asc' ? '↑ Frequência' : '# Número'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="max-h-[min(70vh,32rem)] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky top-0 z-10 border-b border-border bg-muted/95 p-3 text-left font-medium text-muted-foreground backdrop-blur-sm">
                  Número
                </th>
                <th className="sticky top-0 z-10 border-b border-border bg-muted/95 p-3 text-right font-medium text-muted-foreground backdrop-blur-sm">
                  Ocorrências
                </th>
                <th className="sticky top-0 z-10 border-b border-border bg-muted/95 p-3 text-right font-medium text-muted-foreground backdrop-blur-sm">
                  % Relativo
                </th>
                <th className="sticky top-0 z-10 border-b border-border bg-muted/95 p-3 font-medium text-muted-foreground backdrop-blur-sm">
                  Barra
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item) => {
                const pct = ((item.count / maxCount) * 100).toFixed(1);
                const isTop = item.count >= topThreshold;
                const isBottom = item.count <= bottomThreshold;
                return (
                  <tr key={item.number} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <NumberBadge
                        number={item.number}
                        displayValue={formatLotteryDigitLabel(item.number, modeForAnalysis)}
                        highlight={isTop ? 'top' : isBottom ? 'bottom' : 'none'}
                        size="sm"
                      />
                    </td>
                    <td className="p-3 text-right font-mono font-medium">{formatNumber(item.count)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{pct}%</td>
                    <td className="p-3 w-48">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: isTop
                              ? 'var(--gradient-primary)'
                              : isBottom
                              ? 'hsl(var(--muted-foreground))'
                              : 'hsl(var(--primary))',
                            opacity: isBottom ? 0.4 : 1,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
