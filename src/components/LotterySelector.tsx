import { useAppState } from '@/contexts/AppContext';
import { LOTTERY_MODES } from '@/lib/lottery-types';
import { cn } from '@/lib/utils';

export function LotterySelector() {
  const { selectedMode, setSelectedMode } = useAppState();

  return (
    <div
      className="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory md:mx-0 md:flex-wrap md:overflow-visible md:pb-0"
      aria-label="Modalidade da loteria"
    >
      {LOTTERY_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          aria-pressed={selectedMode.id === mode.id}
          onClick={() => setSelectedMode(mode)}
          className={cn(
            'shrink-0 snap-start rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200',
            'min-h-[44px] min-w-[3rem] active:scale-[0.98] md:min-h-0 md:py-2',
            selectedMode.id === mode.id
              ? 'gradient-primary text-primary-foreground border-transparent shadow-glow'
              : 'bg-card text-foreground border-border hover:border-primary/40'
          )}
        >
          {mode.name}
        </button>
      ))}
    </div>
  );
}
