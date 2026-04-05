import { useState, useEffect } from 'react';
import {
  getHistory,
  clearHistory,
  formatNumber,
  formatDuration,
  formatLotteryDigitLabel,
} from '@/lib/lottery-utils';
import { LOTTERY_MODES, type HistoryEntry } from '@/lib/lottery-types';
import { useAppState } from '@/contexts/AppContext';
import { NumberBadge } from '@/components/NumberBadge';
import { Button } from '@/components/ui/button';
import { History, Trash2, Eye, X } from 'lucide-react';

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const { setLastResult, setActiveTab } = useAppState();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
    setSelected(null);
  };

  const handleReview = (entry: HistoryEntry) => {
    setLastResult({
      modeId: entry.modeId,
      modeName: entry.modeName,
      totalGames: entry.totalGames,
      workerCount: entry.workerCount,
      frequencies: entry.frequencies,
      sampleGames: entry.sampleGames,
      elapsedMs: entry.elapsedMs,
      timestamp: entry.timestamp,
    });
    setActiveTab('analysis');
  };

  if (history.length === 0) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sem histórico</h3>
          <p className="text-sm text-muted-foreground">Execute gerações para criar histórico local.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          <p className="text-muted-foreground text-sm mt-1">{history.length} execuções salvas</p>
        </div>
        <Button onClick={handleClear} variant="outline" size="sm" className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </div>

      <div className="space-y-3">
        {history.map((entry) => {
          const mode = LOTTERY_MODES.find((m) => m.id === entry.modeId) ?? LOTTERY_MODES[0];
          return (
          <div
            key={entry.id}
            className="bg-card rounded-lg border border-border p-4 hover:shadow-elevated transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">{entry.modeName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setSelected(selected?.id === entry.id ? null : entry)} variant="ghost" size="sm">
                  {selected?.id === entry.id ? <X className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button onClick={() => handleReview(entry)} variant="outline" size="sm">
                  Ver Análise
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                {formatNumber(entry.totalGames)}{' '}
                {(LOTTERY_MODES.find((m) => m.id === entry.modeId)?.gamesPerBet ?? 1) > 1 ? 'apostas' : 'jogos'}
              </span>
              <span>{entry.workerCount} workers</span>
              <span>{formatDuration(entry.elapsedMs)}</span>
            </div>

            {selected?.id === entry.id && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Mais Frequentes</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.topNumbers.slice(0, mode.numbersPerGame).map((item) => (
                      <NumberBadge
                        key={item.number}
                        number={item.number}
                        displayValue={formatLotteryDigitLabel(item.number, mode)}
                        count={item.count}
                        highlight="top"
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Menos Frequentes</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.bottomNumbers.slice(0, mode.numbersPerGame).map((item) => (
                      <NumberBadge
                        key={item.number}
                        number={item.number}
                        displayValue={formatLotteryDigitLabel(item.number, mode)}
                        count={item.count}
                        highlight="bottom"
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
