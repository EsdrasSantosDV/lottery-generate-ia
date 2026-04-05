import { APP_NAV_ITEMS } from '@/components/AppSidebar';
import { useAppState } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

const SHORT_LABELS: Record<string, string> = {
  dashboard: 'Início',
  results: 'Resultados',
  generator: 'Gerador',
  'cdle-lab': 'CDLE',
  analysis: 'Análise',
  suggestions: 'Dicas',
  history: 'Histórico',
};

export function MobileBottomNav() {
  const { activeTab, setActiveTab, setMobileNavOpen } = useAppState();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 md:hidden"
      aria-label="Navegação principal"
    >
      <div
        className={cn(
          'pointer-events-auto w-full max-w-lg rounded-2xl border border-border/50',
          'bg-background/80 shadow-[0_-2px_24px_-4px_rgba(0,0,0,0.08),0_12px_40px_-8px_rgba(0,0,0,0.12)]',
          'backdrop-blur-2xl supports-[backdrop-filter]:bg-background/72',
          'dark:border-border/40 dark:shadow-[0_-2px_32px_-4px_rgba(0,0,0,0.35),0_12px_40px_-8px_rgba(0,0,0,0.5)]'
        )}
      >
        <div className="flex items-stretch justify-between gap-0.5 px-1 py-1.5">
          {APP_NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  'relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 transition-all duration-200',
                  'active:scale-[0.97]',
                  active
                    ? 'bg-primary/[0.13] text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:bg-primary/20'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-2 top-1 h-1 rounded-full bg-primary/35"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200',
                    active && 'bg-background/60 shadow-sm ring-1 ring-primary/25 dark:bg-background/40'
                  )}
                >
                  <item.icon
                    className={cn('h-[1.15rem] w-[1.15rem]', active && 'text-primary')}
                    strokeWidth={active ? 2.25 : 2}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    'max-w-full truncate px-0.5 text-[9px] font-semibold leading-none tracking-tight',
                    'sm:text-[10px]'
                  )}
                >
                  {SHORT_LABELS[item.id] ?? item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
