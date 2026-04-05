import { Dices, Menu, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const { sidebarCollapsed, setSidebarCollapsed, setMobileNavOpen } = useAppState();

  return (
    <header
      className={cn(
        'z-40 flex min-h-16 shrink-0 items-center gap-3 border-b px-4 pt-[env(safe-area-inset-top,0px)] md:px-6',
        'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]',
        'bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75',
        'border-border/60 shadow-[0_1px_0_0_hsl(var(--border)/0.5)]'
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden h-10 w-10 rounded-xl text-foreground hover:bg-muted"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex shrink-0 h-10 w-10 rounded-xl text-foreground hover:bg-muted"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
      >
        <PanelLeft className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'opacity-80')} />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-600 shadow-md shadow-primary/25 ring-1 ring-white/20">
          <Dices className="h-5 w-5 text-primary-foreground drop-shadow-sm" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground md:text-xl">
            Loto<span className="font-extrabold text-primary">Khan</span>
          </h1>
          <p className="truncate text-xs text-muted-foreground sm:hidden">Loterias</p>
          <p className="hidden text-xs text-muted-foreground sm:block">Gerador e análise de loterias</p>
        </div>
      </div>
    </header>
  );
}
