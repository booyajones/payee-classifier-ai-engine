import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { ENV_CONFIG } from '@/lib/config/environmentConfig';
import { productionLogger } from '@/lib/logging';

/**
 * Production-optimized store for performance-critical state
 */

interface ProductionState {
  // User preferences (persisted)
  userPreferences: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    theme: 'light' | 'dark' | 'system';
    batchSize: number;
    autoDownload: boolean;
    enablePerformanceMonitoring: boolean;
  };

  // Application settings (persisted)
  appSettings: {
    cacheEnabled: boolean;
    compressionEnabled: boolean;
    backgroundProcessing: boolean;
    offlineMode: boolean;
  };

  // Runtime state (not persisted)
  runtime: {
    isOnline: boolean;
    performanceMetrics: {
      lastClassificationTime: number;
      averageProcessingTime: number;
      memoryUsage: number;
      cacheHitRate: number;
    };
    errorState: {
      hasErrors: boolean;
      lastError: string | null;
      errorCount: number;
    };
  };

  // Actions
  updateUserPreferences: (preferences: Partial<ProductionState['userPreferences']>) => void;
  updateAppSettings: (settings: Partial<ProductionState['appSettings']>) => void;
  updateRuntimeMetrics: (metrics: Partial<ProductionState['runtime']['performanceMetrics']>) => void;
  setErrorState: (error: string | null) => void;
  clearErrors: () => void;
  resetToDefaults: () => void;
}

const defaultState = {
  userPreferences: {
    logLevel: ENV_CONFIG.logging.level as 'debug' | 'info' | 'warn' | 'error',
    theme: 'system' as const,
    batchSize: ENV_CONFIG.performance.batchSize,
    autoDownload: true,
    enablePerformanceMonitoring: ENV_CONFIG.features.performanceMonitoring
  },
  appSettings: {
    cacheEnabled: true,
    compressionEnabled: ENV_CONFIG.isProduction,
    backgroundProcessing: true,
    offlineMode: false
  },
  runtime: {
    isOnline: navigator.onLine,
    performanceMetrics: {
      lastClassificationTime: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    },
    errorState: {
      hasErrors: false,
      lastError: null,
      errorCount: 0
    }
  }
};

export const useProductionStore = create<ProductionState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...defaultState,

        updateUserPreferences: (preferences) => {
          set((state) => ({
            userPreferences: { ...state.userPreferences, ...preferences }
          }));
          
          productionLogger.info('User preferences updated', preferences, 'PRODUCTION_STORE');
        },

        updateAppSettings: (settings) => {
          set((state) => ({
            appSettings: { ...state.appSettings, ...settings }
          }));
          
          productionLogger.info('App settings updated', settings, 'PRODUCTION_STORE');
        },

        updateRuntimeMetrics: (metrics) => {
          set((state) => ({
            runtime: {
              ...state.runtime,
              performanceMetrics: { ...state.runtime.performanceMetrics, ...metrics }
            }
          }));
        },

        setErrorState: (error) => {
          set((state) => ({
            runtime: {
              ...state.runtime,
              errorState: {
                hasErrors: !!error,
                lastError: error,
                errorCount: error ? state.runtime.errorState.errorCount + 1 : state.runtime.errorState.errorCount
              }
            }
          }));

          if (error) {
            productionLogger.error('Application error set', { error }, 'PRODUCTION_STORE');
          }
        },

        clearErrors: () => {
          set((state) => ({
            runtime: {
              ...state.runtime,
              errorState: {
                hasErrors: false,
                lastError: null,
                errorCount: 0
              }
            }
          }));
          
          productionLogger.info('Errors cleared', null, 'PRODUCTION_STORE');
        },

        resetToDefaults: () => {
          set(defaultState);
          productionLogger.info('Store reset to defaults', null, 'PRODUCTION_STORE');
        }
      }),
      {
        name: 'production-store',
        partialize: (state) => ({
          userPreferences: state.userPreferences,
          appSettings: state.appSettings
          // runtime state is not persisted
        }),
        version: 1,
        migrate: (persistedState: any, version) => {
          // Handle migrations between versions
          if (version === 0) {
            return { ...defaultState, ...persistedState };
          }
          return persistedState;
        }
      }
    )
  )
);

// Subscribe to online status changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useProductionStore.setState((state) => ({
      runtime: { ...state.runtime, isOnline: true }
    }));
  });

  window.addEventListener('offline', () => {
    useProductionStore.setState((state) => ({
      runtime: { ...state.runtime, isOnline: false }
    }));
  });
}

// Performance monitoring subscription
if (ENV_CONFIG.features.performanceMonitoring) {
  useProductionStore.subscribe(
    (state) => state.userPreferences.enablePerformanceMonitoring,
    (enabled) => {
      if (enabled) {
        productionLogger.info('Performance monitoring enabled', null, 'PRODUCTION_STORE');
      } else {
        productionLogger.info('Performance monitoring disabled', null, 'PRODUCTION_STORE');
      }
    }
  );
}

// Selectors for optimized access
export const productionSelectors = {
  userPreferences: () => useProductionStore((state) => state.userPreferences),
  appSettings: () => useProductionStore((state) => state.appSettings),
  runtime: () => useProductionStore((state) => state.runtime),
  performanceMetrics: () => useProductionStore((state) => state.runtime.performanceMetrics),
  errorState: () => useProductionStore((state) => state.runtime.errorState),
  isOnline: () => useProductionStore((state) => state.runtime.isOnline),
  batchSize: () => useProductionStore((state) => state.userPreferences.batchSize),
  logLevel: () => useProductionStore((state) => state.userPreferences.logLevel)
};