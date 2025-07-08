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
    emergencyKillAll,
    quickReset,
    isEmergencyActive,
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
        isEmergencyActive={isEmergencyActive}
        onRefresh={handleRefreshJob}
        onForceSync={handleForceStatusSync}
        onDownload={handleDownloadResults}
        onCancel={handleCancelJob}
        onJobDelete={handleJobDelete}
        onEmergencyKill={emergencyKillAll}
        onQuickReset={quickReset}
      />
    </>
  );
};

export default BatchJobManagerContainer;