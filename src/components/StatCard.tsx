import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
}

const variantStyles = {
  default: 'bg-card border border-border',
  primary: 'gradient-primary text-primary-foreground',
  accent: 'gradient-accent text-accent-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
};

export function StatCard({ title, value, subtitle, icon, className, variant = 'default' }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-5 shadow-card transition-all duration-200 hover:shadow-elevated animate-fade-in',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn('text-sm font-medium', variant === 'default' ? 'text-muted-foreground' : 'opacity-80')}>
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className={cn('text-xs', variant === 'default' ? 'text-muted-foreground' : 'opacity-70')}>
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-md p-2', variant === 'default' ? 'bg-muted' : 'bg-white/10')}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
