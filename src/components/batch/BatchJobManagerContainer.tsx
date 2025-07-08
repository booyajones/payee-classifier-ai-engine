import React from 'react';
import { useBatchJobManager } from '@/hooks/useBatchJobManager';
import BatchJobContainer from './BatchJobContainer';

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
    </>
  );
};

export default BatchJobManagerContainer;