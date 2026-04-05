import { useAppState } from '@/contexts/AppContext';
import { generateSuggestion, formatLotteryDigitLabel } from '@/lib/lottery-utils';
import { LOTTERY_MODES } from '@/lib/lottery-types';
import { SuggestionCard } from '@/components/SuggestionCard';
import { Lightbulb } from 'lucide-react';

export function SuggestionsPage() {
  const { lastResult } = useAppState();

  if (!lastResult) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Sugestões de Jogos</h1>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sem dados para sugestões</h3>
          <p className="text-sm text-muted-foreground">Execute uma geração primeiro.</p>
        </div>
      </div>
    );
  }

  const mode = LOTTERY_MODES.find((m) => m.id === lastResult.modeId) || LOTTERY_MODES[0];

  const isPositional = mode.gameKind === 'positional';
  const unitLabel = isPositional ? 'posições (dezenas por coluna)' : 'números';
  const fmt = (n: number) => formatLotteryDigitLabel(n, mode);

  const suggestions = [
    {
      title: '🔥 Mais Frequentes',
      description: isPositional
        ? `${mode.numbersPerGame} ${unitLabel} priorizando dezenas mais sorteadas por posição na simulação`
        : `Os ${mode.numbersPerGame} números com maior incidência na simulação`,
      numbers: generateSuggestion(lastResult.frequencies, mode, 'top'),
      variant: 'primary' as const,
    },
    {
      title: '❄️ Menos Frequentes',
      description: isPositional
        ? `${mode.numbersPerGame} ${unitLabel} priorizando dezenas menos sorteadas`
        : `Os ${mode.numbersPerGame} números com menor incidência na simulação`,
      numbers: generateSuggestion(lastResult.frequencies, mode, 'bottom'),
      variant: 'muted' as const,
    },
    {
      title: '⚖️ Combinação Mista',
      description: isPositional
        ? 'Mistura de faixas de frequência ao longo das colunas'
        : 'Metade dos mais frequentes + metade dos menos frequentes',
      numbers: generateSuggestion(lastResult.frequencies, mode, 'mixed'),
      variant: 'default' as const,
    },
    {
      title: '🎲 Derivação Aleatória',
      description: isPositional
        ? 'Dezenas aleatórias entre as mais incidentes (ordem preservada)'
        : 'Combinação embaralhada dos números com maior incidência',
      numbers: generateSuggestion(lastResult.frequencies, mode, 'random'),
      variant: 'accent' as const,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sugestões de Jogos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {mode.id === 'timemania' && (
            <span className="block mb-1 text-amber-700/90 dark:text-amber-400/90">
              Time do coração não entra na simulação — escolha o clube na sua aposta oficial.
            </span>
          )}
          Combinações sugeridas com base na distribuição de {lastResult.totalGames.toLocaleString('pt-BR')}{' '}
          {mode.gamesPerBet > 1 ? `apostas (${mode.gamesPerBet} jogos cada)` : 'jogos'} — {lastResult.modeName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((s, i) => (
          <SuggestionCard key={i} {...s} formatDigit={fmt} />
        ))}
      </div>

      {/* Sample games */}
      {lastResult.sampleGames.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Amostra de Jogos Gerados</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {lastResult.sampleGames.slice(0, 20).map((game, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground w-8">#{i + 1}</span>
                <div className="flex flex-wrap gap-1.5">
                  {game.map((n, j) => (
                    <span
                      key={j}
                      className="bg-secondary text-secondary-foreground rounded px-2 py-0.5 text-xs font-mono font-medium"
                    >
                      {fmt(n)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
