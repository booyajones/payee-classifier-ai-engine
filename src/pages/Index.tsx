
import ErrorBoundary from "@/components/ErrorBoundary";
import { UnifiedProgressProvider } from "@/contexts/UnifiedProgressContext";
import { useIndexState } from "@/hooks/useIndexState";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import MainTabs from "@/components/navigation/MainTabs";
import ApiKeySetupPage from "@/components/setup/ApiKeySetupPage";

const Index = () => {
  const {
    activeTab,
    setActiveTab,
    batchResults,
    batchSummary,
    allResults,
    hasApiKey,
    isLoadingResults,
    handleBatchComplete,
    handleKeySet,
    clearAllResults
  } = useIndexState();

  if (!hasApiKey) {
    return (
      <UnifiedProgressProvider>
        <ErrorBoundary>
          <ApiKeySetupPage onKeySet={handleKeySet} />
        </ErrorBoundary>
      </UnifiedProgressProvider>
    );
  }

  console.log('[INDEX DEBUG] Rendering main app with hasApiKey:', hasApiKey);

  return (
    <UnifiedProgressProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <AppHeader 
            title="Payee Classification System"
            description="File-based payee classification processing with database storage"
          />

          <main className="container px-4 pb-8">
            <ErrorBoundary>
              {isLoadingResults ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading stored results from database...</p>
                  </div>
                </div>
              ) : (
                <MainTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  allResults={allResults}
                  batchResults={batchResults}
                  batchSummary={batchSummary}
                  onBatchComplete={handleBatchComplete}
                  onClearAllResults={clearAllResults}
                />
              )}
            </ErrorBoundary>
          </main>

          <AppFooter />
        </div>
      </ErrorBoundary>
    </UnifiedProgressProvider>
  );
};

export default Index;
