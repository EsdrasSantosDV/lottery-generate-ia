import { useAppState } from '@/contexts/AppContext';
import { LOTTERY_MODES } from '@/lib/lottery-types';
import { cn } from '@/lib/utils';

export function LotterySelector() {
  const { selectedMode, setSelectedMode } = useAppState();

  return (
    <div className="flex flex-wrap gap-2">
      {LOTTERY_MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setSelectedMode(mode)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
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
