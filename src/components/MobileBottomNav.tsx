import { APP_NAV_ITEMS } from '@/components/AppSidebar';
import { useAppState } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

const SHORT_LABELS: Record<string, string> = {
  dashboard: 'Início',
  generator: 'Gerador',
  analysis: 'Análise',
  suggestions: 'Dicas',
  history: 'Histórico',
};

export function MobileBottomNav() {
  const { activeTab, setActiveTab, setMobileNavOpen } = useAppState();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
      aria-label="Navegação principal"
    >
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
              'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium leading-tight transition-colors active:bg-muted/50',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className={cn('h-5 w-5 shrink-0', active && 'text-primary')} aria-hidden />
            <span className="max-w-full truncate">{SHORT_LABELS[item.id] ?? item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
