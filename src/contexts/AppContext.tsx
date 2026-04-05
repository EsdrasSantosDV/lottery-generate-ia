import React, { createContext, useContext, useState, useCallback } from 'react';
import type { LotteryMode, GenerationResult, ProcessingStatus } from '@/lib/lottery-types';
import { LOTTERY_MODES } from '@/lib/lottery-types';

interface AppState {
  selectedMode: LotteryMode;
  setSelectedMode: (mode: LotteryMode) => void;
  lastResult: GenerationResult | null;
  setLastResult: (result: GenerationResult | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedMode, setSelectedMode] = useState<LotteryMode>(LOTTERY_MODES[0]);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <AppContext.Provider
      value={{
        selectedMode,
        setSelectedMode,
        lastResult,
        setLastResult,
        activeTab,
        setActiveTab,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileNavOpen,
        setMobileNavOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be inside AppProvider');
  return ctx;
}
