import { Dices } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAppState } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { APP_NAV_ITEMS } from '@/components/AppSidebar';

export function MobileNavSheet() {
  const { activeTab, setActiveTab, mobileNavOpen, setMobileNavOpen } = useAppState();

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent
        side="left"
        className="w-[min(100%,18rem)] border-sidebar-border bg-sidebar p-0 pt-[env(safe-area-inset-top,0px)] text-sidebar-foreground [&>button]:top-[calc(0.75rem+env(safe-area-inset-top,0px))]"
      >
        <SheetHeader className="border-b border-sidebar-border px-4 py-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-4 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-600 shadow-md">
              <Dices className="h-5 w-5 text-primary-foreground" />
            </div>
            <SheetTitle className="text-left text-lg font-bold tracking-tight text-sidebar-accent-foreground">
              LotoKhan
            </SheetTitle>
          </div>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-3">
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
                  'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/80'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
