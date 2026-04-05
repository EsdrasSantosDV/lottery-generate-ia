import { useState } from 'react';
import { useAppState } from '@/contexts/AppContext';
import { getRankedFrequencies, formatNumber } from '@/lib/lottery-utils';
import { NumberBadge } from '@/components/NumberBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, ArrowUpDown } from 'lucide-react';

type SortMode = 'number' | 'freq-asc' | 'freq-desc';

export function AnalysisPage() {
  const { lastResult, selectedMode } = useAppState();
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

  const ranked = getRankedFrequencies(lastResult.frequencies);
  const maxCount = ranked[0]?.count || 1;
  const minCount = ranked[ranked.length - 1]?.count || 0;

  const sortedData = [...ranked].sort((a, b) => {
    if (sortMode === 'number') return a.number - b.number;
    if (sortMode === 'freq-asc') return a.count - b.count;
    return b.count - a.count;
  });

  const chartData = [...ranked]
    .sort((a, b) => a.number - b.number)
    .map((item) => ({
      num: String(item.number).padStart(2, '0'),
      count: item.count,
      pct: ((item.count / (lastResult.totalGames * selectedMode.numbersPerGame / (selectedMode.maxNumber - selectedMode.minNumber + 1))) * 100),
    }));

  const topThreshold = ranked[Math.min(9, ranked.length - 1)]?.count || 0;
  const bottomThreshold = ranked[Math.max(0, ranked.length - 10)]?.count || Infinity;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Análise Estatística</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Distribuição de frequência — {lastResult.modeName} — {formatNumber(lastResult.totalGames)} jogos
        </p>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Distribuição por Número</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="num" tick={{ fontSize: 10 }} interval={chartData.length > 50 ? 4 : 0} />
              <YAxis tick={{ fontSize: 10 }} />
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
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Ordenar:</span>
        {(['freq-desc', 'freq-asc', 'number'] as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sortMode === mode
                ? 'gradient-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {mode === 'freq-desc' ? '↓ Frequência' : mode === 'freq-asc' ? '↑ Frequência' : '# Número'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Número</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Ocorrências</th>
                <th className="text-right p-3 font-medium text-muted-foreground">% Relativo</th>
                <th className="p-3 font-medium text-muted-foreground">Barra</th>
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
