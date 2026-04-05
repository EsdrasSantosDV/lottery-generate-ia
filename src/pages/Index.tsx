import { AppProvider, useAppState } from '@/contexts/AppContext';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { MobileNavSheet } from '@/components/MobileNavSheet';
import { DashboardPage } from '@/pages/DashboardPage';
import { GeneratorPage } from '@/pages/GeneratorPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { SuggestionsPage } from '@/pages/SuggestionsPage';
import { HistoryPage } from '@/pages/HistoryPage';

function AppContent() {
  const { activeTab } = useAppState();

  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    generator: <GeneratorPage />,
    analysis: <AnalysisPage />,
    suggestions: <SuggestionsPage />,
    history: <HistoryPage />,
  };

  return (
    <div className="flex h-dvh min-h-0 w-full max-w-[100vw] flex-col overflow-hidden bg-background">
      <AppHeader />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden h-full min-h-0 md:flex md:shrink-0">
          <AppSidebar />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-4 md:p-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">{pages[activeTab] || pages.dashboard}</div>
        </main>
      </div>

      <MobileBottomNav />
      <MobileNavSheet />
    </div>
  );
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
