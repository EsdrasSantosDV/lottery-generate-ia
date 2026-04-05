import { AppProvider, useAppState } from '@/contexts/AppContext';
import { DatabaseProvider } from '@/contexts/DatabaseContext';
import { CaixaSyncBanner } from '@/components/CaixaSyncBanner';
import { useCaixaSync } from '@/hooks/use-caixa-sync';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AppHeader } from '@/components/AppHeader';
import { MobileNavSheet } from '@/components/MobileNavSheet';
import { DashboardPage } from '@/pages/DashboardPage';
import { GeneratorPage } from '@/pages/GeneratorPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { SuggestionsPage } from '@/pages/SuggestionsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { CdleLabPage } from '@/pages/CdleLabPage';

function AppContent() {
  const { activeTab } = useAppState();
  const caixaSync = useCaixaSync();

  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    results: <ResultsPage />,
    generator: <GeneratorPage />,
    'cdle-lab': <CdleLabPage />,
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

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-4 md:p-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <CaixaSyncBanner
              status={caixaSync.status}
              progressLabel={caixaSync.progressLabel}
              errorMessage={caixaSync.errorMessage}
            />
            {pages[activeTab] || pages.dashboard}
          </div>
        </main>
      </div>

      <MobileBottomNav />
      <MobileNavSheet />
    </div>
  );
}

const Index = () => (
  <DatabaseProvider>
    <AppProvider>
      <AppContent />
    </AppProvider>
  </DatabaseProvider>
);

export default Index;
