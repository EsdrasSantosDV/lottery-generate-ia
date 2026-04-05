import { useAppState } from '@/contexts/AppContext';
import { generateSuggestion } from '@/lib/lottery-utils';
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

  const suggestions = [
    {
      title: '🔥 Números Mais Frequentes',
      description: `Os ${mode.numbersPerGame} números com maior incidência na simulação`,
      numbers: generateSuggestion(lastResult.frequencies, mode, 'top'),
      variant: 'primary' as const,
    },
    {
      title: '❄️ Números Menos Frequentes',
      description: `Os ${mode.numbersPerGame} números com menor incidência na simulação`,
      numbers: generateSuggestion(lastResult.frequencies, mode, 'bottom'),
      variant: 'muted' as const,
    },
    {
      title: '⚖️ Combinação Mista',
      description: 'Metade dos mais frequentes + metade dos menos frequentes',
      numbers: generateSuggestion(lastResult.frequencies, mode, 'mixed'),
      variant: 'default' as const,
    },
    {
      title: '🎲 Derivação Aleatória',
      description: 'Combinação embaralhada dos números com maior incidência',
      numbers: generateSuggestion(lastResult.frequencies, mode, 'random'),
      variant: 'accent' as const,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sugestões de Jogos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Combinações sugeridas com base na distribuição de {lastResult.totalGames.toLocaleString('pt-BR')} jogos — {lastResult.modeName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((s, i) => (
          <SuggestionCard key={i} {...s} />
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
                      {String(n).padStart(2, '0')}
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
