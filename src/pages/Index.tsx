
import ErrorBoundary from "@/components/ErrorBoundary";
import { UnifiedProgressProvider } from "@/contexts/UnifiedProgressContext";
import { DownloadProgressProvider } from "@/contexts/DownloadProgressContext";
import { useIndexState } from "@/hooks/useIndexState";
import AppHeader from "@/components/layout/AppHeader";
import AppFooter from "@/components/layout/AppFooter";
import MainTabs from "@/components/navigation/MainTabs";
import ApiKeySetupPage from "@/components/setup/ApiKeySetupPage";
import DownloadProgressDisplay from "@/components/download/DownloadProgressDisplay";

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
