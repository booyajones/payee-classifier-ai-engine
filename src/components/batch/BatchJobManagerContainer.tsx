// @ts-nocheck
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
    handleDownloadResults,
    handleCancelJob,
    handleJobDelete
  } = useBatchJobManager();

  return (
    <BatchJobContainer
      jobs={jobs}
      payeeRowDataMap={payeeDataMap}
      refreshingJobs={refreshingJobs}
      pollingStates={pollingStates}
      stalledJobActions={stalledJobActions}
      onRefresh={handleRefreshJob}
      onDownload={handleDownloadResults}
      onCancel={handleCancelJob}
      onJobDelete={handleJobDelete}
    />
  );
};

export default BatchJobManagerContainer;
