import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

interface AppState {
  activeTab: string;
  hasApiKey: boolean;
  isLoading: boolean;
  error: string | null;
  tabHistory: string[];
  previousTab: string | null;
}

interface AppActions {
  setActiveTab: (tab: string) => void;
  setHasApiKey: (hasKey: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        // State
        activeTab: 'single',
        hasApiKey: false,
        isLoading: false,
        error: null,
        tabHistory: ['single'],
        previousTab: null,

        // Actions
        setActiveTab: (tab) => set((state) => ({
          activeTab: tab,
          previousTab: state.activeTab,
          tabHistory: [...state.tabHistory.slice(-4), tab] // Keep last 5 tabs
        })),
        setHasApiKey: (hasKey) => set({ hasApiKey: hasKey }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({ 
          activeTab: state.activeTab,
          tabHistory: state.tabHistory 
        })
      }
    )
  )
);