
import ErrorBoundary from "@/components/ErrorBoundary";
import { UnifiedProgressProvider } from "@/contexts/UnifiedProgressContext";
import { useIndexState } from "@/hooks/useIndexState";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import MainTabs from "@/components/navigation/MainTabs";
import ApiKeySetupPage from "@/components/setup/ApiKeySetupPage";

const Index = () => {
  const {
    batchResults,
    batchSummary,
    hasApiKey,
    handleBatchComplete,
    handleJobDelete,
    handleKeySet
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

  const handleBatchClassify = (results: any[]) => {
    console.log('[INDEX] Batch classify results:', results);
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
        </div>
      </ErrorBoundary>
    </UnifiedProgressProvider>
  );
};

export default Index;
