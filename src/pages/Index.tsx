
import React, { useEffect } from 'react';
import ErrorBoundary from "@/components/ErrorBoundary";
import { UnifiedProgressProvider } from "@/contexts/UnifiedProgressContext";
import { useIndexState } from "@/hooks/useIndexState";
import { useBackgroundJobProcessor } from "@/hooks/useBackgroundJobProcessor";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import MainTabs from "@/components/navigation/MainTabs";
import ApiKeySetupPage from "@/components/setup/ApiKeySetupPage";
import KeyboardShortcutsHelp from "@/components/ui/keyboard-shortcuts-help";
import { useEmergencyPageRecovery } from "@/hooks/useEmergencyPageRecovery";

const Index = () => {
  // NUCLEAR RECOVERY: Clear everything on page load if unresponsive
  useEmergencyPageRecovery();
  console.log('Index component rendering');
  const {
    batchResults,
    batchSummary,
    hasApiKey,
    handleBatchComplete,
    handleJobDelete,
    handleKeySet
  } = useIndexState();
  
  // Automatically process existing completed jobs in background
  useBackgroundJobProcessor();
  
  console.log('Index state:', { hasApiKey, batchResultsLength: batchResults.length });

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
              <MainTabs
                allResults={batchResults}
                onBatchClassify={handleBatchClassify}
                onComplete={handleBatchComplete}
                onJobDelete={handleJobDelete}
              />
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
