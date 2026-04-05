import { cn } from '@/lib/utils';

interface NumberBadgeProps {
  number: number;
  count?: number;
  highlight?: 'top' | 'bottom' | 'none';
  size?: 'sm' | 'md' | 'lg';
}

export function NumberBadge({ number, count, highlight = 'none', size = 'md' }: NumberBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold transition-all duration-200',
          sizeClasses[size],
          highlight === 'top' && 'gradient-primary text-primary-foreground shadow-glow',
          highlight === 'bottom' && 'bg-muted text-muted-foreground',
          highlight === 'none' && 'bg-secondary text-secondary-foreground'
        )}
      >
        {String(number).padStart(2, '0')}
      </div>
      {count !== undefined && <span className="text-[10px] text-muted-foreground">{count}</span>}
    </div>
  );
}
