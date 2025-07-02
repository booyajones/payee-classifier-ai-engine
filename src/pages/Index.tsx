
import ErrorBoundary from "@/components/ErrorBoundary";
import { UnifiedProgressProvider } from "@/contexts/UnifiedProgressContext";
import { DownloadProgressProvider } from "@/contexts/DownloadProgressContext";
import { useIndexState } from "@/hooks/useIndexState";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import MainTabs from "@/components/navigation/MainTabs";
import ApiKeySetupPage from "@/components/setup/ApiKeySetupPage";
import DownloadProgressDisplay from "@/components/download/DownloadProgressDisplay";
import DuplicateTestRunner from "@/components/testing/DuplicateTestRunner";

const Index = () => {
  console.log('Index component rendering');
  const {
    batchResults,
    batchSummary,
    hasApiKey,
    handleBatchComplete,
    handleJobDelete,
    handleKeySet
  } = useIndexState();
  
  console.log('Index state:', { hasApiKey, batchResultsLength: batchResults.length });

  if (!hasApiKey) {
    return (
      <UnifiedProgressProvider>
        <DownloadProgressProvider>
          <ErrorBoundary>
            <ApiKeySetupPage onKeySet={handleKeySet} />
          </ErrorBoundary>
        </DownloadProgressProvider>
      </UnifiedProgressProvider>
    );
  }

  const handleBatchClassify = (results: any[]) => {
    // Handle batch classification results
  };

  return (
    <UnifiedProgressProvider>
      <DownloadProgressProvider>
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

            {/* Test Runner for debugging (remove in production) */}
            <div className="container px-4 mt-8 border-t pt-8">
              <DuplicateTestRunner />
            </div>

            <AppFooter />
            
            {/* Download Progress Overlay */}
            <DownloadProgressDisplay />
          </div>
        </ErrorBoundary>
      </DownloadProgressProvider>
    </UnifiedProgressProvider>
  );
};

export default Index;
