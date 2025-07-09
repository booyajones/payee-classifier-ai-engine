import React from 'react';
import { useBatchJobManager } from '@/hooks/useBatchJobManager';
import BatchJobContainer from './BatchJobContainer';
import { ProgressiveLoader } from '@/components/ui/progressive-loader';
import { JobSystemStatus } from './JobSystemStatus';

const BatchJobManagerContainer = () => {
  const {
    jobs,
    payeeDataMap,
    refreshingJobs,
    pollingStates,
    autoPollingJobs,
    stalledJobActions,
    handleRefreshJob,
    handleForceRefresh,
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
        {/* Job System Status and Controls */}
        <JobSystemStatus />
        
        <BatchJobContainer
          jobs={jobs}
          payeeRowDataMap={payeeDataMap}
          refreshingJobs={refreshingJobs}
          pollingStates={pollingStates}
          autoPollingJobs={autoPollingJobs}
          stalledJobActions={stalledJobActions}
          largeJobOptimization={largeJobOptimization}
          onRefresh={handleRefreshJob}
          onForceRefresh={handleForceRefresh}
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