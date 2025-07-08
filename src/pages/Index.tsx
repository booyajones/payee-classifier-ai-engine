
import React, { useEffect, Suspense, lazy } from 'react';
import ErrorBoundary from "@/components/ErrorBoundary";
import { UnifiedProgressProvider } from "@/contexts/UnifiedProgressContext";
import { useIndexState } from "@/hooks/useIndexState";
import { useBackgroundJobProcessor } from "@/hooks/useBackgroundJobProcessor";
import { usePerformanceStabilizer } from "@/hooks/usePerformanceStabilizer";
import { useTimerManager } from "@/hooks/useTimerManager";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import ApiKeySetupPage from "@/components/setup/ApiKeySetupPage";
import KeyboardShortcutsHelp from "@/components/ui/keyboard-shortcuts-help";

// PERFORMANCE: Lazy load heavy components
const MainTabs = lazy(() => import("@/components/navigation/MainTabs"));

const Index = () => {
  // EMERGENCY STABILIZATION HOOKS
  const { emergencyCleanup, isStable } = usePerformanceStabilizer();
  const { clearAll: clearAllTimers } = useTimerManager();
  
  const {
    batchResults,
    batchSummary,
    hasApiKey,
    handleBatchComplete,
    handleJobDelete,
    handleKeySet
  } = useIndexState();
  
  // EMERGENCY: Conditionally use background processor only when stable
  // Note: Using it unconditionally but the hook itself should handle stability
  useBackgroundJobProcessor();
  
  // EMERGENCY CLEANUP on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      emergencyCleanup();
    };
  }, [clearAllTimers, emergencyCleanup]);
  
  console.log('Index state:', { hasApiKey, batchResultsLength: batchResults.length, isStable });

  if (!hasApiKey) {
    return (
      <UnifiedProgressProvider>
        <ErrorBoundary>
          <ApiKeySetupPage onKeySet={handleKeySet} />
        </ErrorBoundary>
      </UnifiedProgressProvider>
    );
  }

  const handleBatchClassify = (results: any[]) => {
    // Handle batch classification results
  };

  return (
    <UnifiedProgressProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <AppHeader 
            title="Payee Classification System"
            description="File-based payee classification processing with CSV download"
          />

          <main className="container px-4 pb-8">
            <ErrorBoundary>
              <Suspense fallback={<div className="flex justify-center items-center h-64">Loading...</div>}>
                <MainTabs
                  allResults={batchResults}
                  onBatchClassify={handleBatchClassify}
                  onComplete={handleBatchComplete}
                  onJobDelete={handleJobDelete}
                />
              </Suspense>
            </ErrorBoundary>
          </main>

          <AppFooter />
          
          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp />
        </div>
      </ErrorBoundary>
    </UnifiedProgressProvider>
  );
};

export default Index;
