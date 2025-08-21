
import React, { useEffect, Suspense, lazy, useState } from 'react';
import { EnhancedErrorBoundary } from "@/components/ui/enhanced-error-boundary";
import { UnifiedProgressProvider } from "@/contexts/UnifiedProgressContext";
import { useOptimizedIndexState } from "@/hooks/useOptimizedIndexState";
import { usePerformanceStabilizer } from "@/hooks/usePerformanceStabilizer";
import { useOptimizedMemoryMonitor } from "@/hooks/useOptimizedMemoryMonitor";
import { useTimerManager } from "@/hooks/useTimerManager";
import { useAppRecovery } from "@/hooks/useAppRecovery";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import ApiKeySetupPage from "@/components/setup/ApiKeySetupPage";
import KeyboardShortcutsHelp from "@/components/ui/keyboard-shortcuts-help";
import { emergencyStop } from "@/lib/performance/emergencyStop";

// PERFORMANCE: Lazy load heavy components with loading states
const MainTabs = lazy(() => import("@/components/navigation/MainTabs"));

const Index = () => {
  const [appReady, setAppReady] = useState(false);
  
  // EMERGENCY STABILIZATION HOOKS
  const { emergencyCleanup, isStable } = usePerformanceStabilizer();
  const { clearAll: clearAllTimers } = useTimerManager();
  const { manualRecovery } = useAppRecovery();
  const { optimizeMemory } = useOptimizedMemoryMonitor({ threshold: 75 });
  
  const {
    batchResults,
    batchSummary,
    hasApiKey,
    handleBatchComplete,
    handleJobDelete,
    handleKeySet
  } = useOptimizedIndexState();
  // Batch classification results flow through handleBatchComplete; no separate
  // handler is required here now that onBatchClassify has been removed.
  
  // PHASE 1: Controlled app initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Ensure emergency stop is clear
        emergencyStop.deactivate('App initialization');
        
        // Small delay to let React settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Mark app as ready only when stable
        if (isStable) {
          setAppReady(true);
          console.log('[INDEX] App ready and stable');
        }
      } catch (error) {
        console.error('[INDEX] App initialization failed:', error);
        setAppReady(true); // Still mark ready to prevent infinite loading
      }
    };

    initializeApp();
  }, [isStable]);
  
  // EMERGENCY CLEANUP on unmount and route changes
  useEffect(() => {
    const handleUnload = () => {
      clearAllTimers();
      emergencyCleanup();
      optimizeMemory();
    };

    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [clearAllTimers, emergencyCleanup]);
  
  console.log('Index state:', { hasApiKey, batchResultsLength: batchResults.length, isStable, appReady });

  if (!hasApiKey) {
    return (
      <UnifiedProgressProvider>
        <EnhancedErrorBoundary>
          <ApiKeySetupPage onKeySet={handleKeySet} />
        </EnhancedErrorBoundary>
      </UnifiedProgressProvider>
    );
  }

  return (
    <UnifiedProgressProvider>
      <EnhancedErrorBoundary>
        <div className="min-h-screen bg-background">
          <AppHeader 
            title="Payee Classification System"
            description="File-based payee classification processing with CSV download"
          />

          <main className="container px-4 pb-8">
            <EnhancedErrorBoundary>
              {appReady ? (
                <Suspense fallback={
                  <div className="flex flex-col justify-center items-center h-64 space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading application...</p>
                  </div>
                }>
                  <MainTabs
                    allResults={batchResults}
                    onComplete={handleBatchComplete}
                    onJobDelete={handleJobDelete}
                  />
                </Suspense>
              ) : (
                <div className="flex flex-col justify-center items-center h-64 space-y-4">
                  <div className="animate-pulse rounded-full h-8 w-8 bg-primary/20"></div>
                  <p className="text-muted-foreground">Initializing system...</p>
                </div>
              )}
            </EnhancedErrorBoundary>
          </main>

          <AppFooter />
          
          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp />
        </div>
      </EnhancedErrorBoundary>
    </UnifiedProgressProvider>
  );
};

export default Index;
