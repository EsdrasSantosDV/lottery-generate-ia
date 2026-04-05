import {
  LayoutDashboard,
  Play,
  BarChart3,
  Lightbulb,
  History,
  Dices,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/AppContext';

export const APP_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'results', label: 'Resultados', icon: Trophy },
  { id: 'generator', label: 'Gerador', icon: Play },
  { id: 'analysis', label: 'Análise', icon: BarChart3 },
  { id: 'suggestions', label: 'Sugestões', icon: Lightbulb },
  { id: 'history', label: 'Histórico', icon: History },
] as const;

export function AppSidebar() {
  const { activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed } = useAppState();

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-600 shadow-sm">
          <Dices className="h-4 w-4 text-primary-foreground" />
        </div>
        {!sidebarCollapsed && (
          <span className="truncate text-lg font-bold tracking-tight text-sidebar-accent-foreground">
            Loto<span className="text-sidebar-primary">Khan</span>
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {APP_NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
