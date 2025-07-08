import React from 'react';
import { useBatchJobManager } from '@/hooks/useBatchJobManager';
import BatchJobContainer from './BatchJobContainer';
import { ProgressiveLoader } from '@/components/ui/progressive-loader';
import { DownloadHealthMonitor } from '@/components/download/DownloadHealthMonitor';

const BatchJobManagerContainer = () => {
  const {
    jobs,
    payeeDataMap,
    refreshingJobs,
    pollingStates,
    stalledJobActions,
    handleRefreshJob,
    handleForceStatusSync,
    handleDownloadResults,
    handleCancelJob,
    handleJobDelete,
    largeJobOptimization,
    performCleanup,
    forceCleanup,
    TimeoutManager
  } = useBatchJobManager();

  return (
    <>
      {/* Timeout manager runs in background */}
      <TimeoutManager jobs={jobs} onJobCancel={handleCancelJob} />
      
      <ProgressiveLoader delay={300}>
        {/* Download Health Monitor - Shows above job list */}
        <DownloadHealthMonitor 
          jobs={jobs}
          onRecoveryComplete={(results) => {
            console.log(`[BATCH MANAGER] Recovery completed for ${results.length} jobs`);
            // Optionally refresh jobs after recovery
            if (results.some(r => r.success)) {
              setTimeout(() => {
                results.forEach(result => {
                  if (result.success) {
                    handleRefreshJob(result.jobId, true);
                  }
                });
              }, 1000);
            }
          }}
        />
        
        <BatchJobContainer
          jobs={jobs}
          payeeRowDataMap={payeeDataMap}
          refreshingJobs={refreshingJobs}
          pollingStates={pollingStates}
          stalledJobActions={stalledJobActions}
          largeJobOptimization={largeJobOptimization}
          onRefresh={handleRefreshJob}
          onForceSync={handleForceStatusSync}
          onDownload={handleDownloadResults}
          onCancel={handleCancelJob}
          onJobDelete={handleJobDelete}
          onCleanup={performCleanup}
          onForceCleanup={forceCleanup}
        />
      </ProgressiveLoader>
    </>
  );
};

export default BatchJobManagerContainer;