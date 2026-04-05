import { AppProvider, useAppState } from '@/contexts/AppContext';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardPage } from '@/pages/DashboardPage';
import { GeneratorPage } from '@/pages/GeneratorPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { SuggestionsPage } from '@/pages/SuggestionsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { Dices, Menu } from 'lucide-react';
import { useState } from 'react';

function AppContent() {
  const { activeTab } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    generator: <GeneratorPage />,
    analysis: <AnalysisPage />,
    suggestions: <SuggestionsPage />,
    history: <HistoryPage />,
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
              <Dices className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sidebar-accent-foreground">LottoLab</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-sidebar-foreground p-2">
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {mobileMenuOpen && <MobileNav onClose={() => setMobileMenuOpen(false)} />}
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-6xl mx-auto w-full">{pages[activeTab] || pages.dashboard}</main>
    </div>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  const { activeTab, setActiveTab } = useAppState();
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'generator', label: 'Gerador' },
    { id: 'analysis', label: 'Análise' },
    { id: 'suggestions', label: 'Sugestões' },
    { id: 'history', label: 'Histórico' },
  ];

  return (
    <div className="bg-sidebar border-t border-sidebar-border py-2 px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            onClose();
          }}
          className={`w-full text-left px-4 py-2.5 rounded-md text-sm ${
            activeTab === tab.id ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
