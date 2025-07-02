import React, { useState, useEffect } from 'react';
import { productionLogger } from '@/lib/logging/productionLogger';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { useDownloadProgress } from '@/contexts/DownloadProgressContext';
import { InstantDownloadService } from '@/lib/services/instantDownloadService';
import BatchJobProgress from './BatchJobProgress';
import BatchJobRequestCounts from './BatchJobRequestCounts';
import BatchJobStuckWarning from './BatchJobStuckWarning';
import BatchJobActiveDownload from './BatchJobActiveDownload';
import BatchJobCompletedDownload from './BatchJobCompletedDownload';
import BatchJobFinalizingDownload from './BatchJobFinalizingDownload';

interface BatchJobCardContentProps {
  job: BatchJob;
  payeeRowData?: PayeeRowData;
  isCompleted: boolean;
  onDownload: () => void;
}

const BatchJobCardContent = ({
  job,
  payeeRowData,
  isCompleted,
  onDownload
}: BatchJobCardContentProps) => {
  const { downloads } = useDownloadProgress();
  
  // Check for active download for this job
  const downloadId = `batch-${job.id}`;
  const activeDownload = downloads[downloadId];
  
  // Track instant download status
  const [downloadStatus, setDownloadStatus] = useState<{
    status: 'instant' | 'processing' | 'unavailable' | 'checking';
    hasFiles: boolean;
    hasResults: boolean;
  }>({ status: 'checking', hasFiles: false, hasResults: false });
  
  productionLogger.debug(`Job ${job.id.substring(0,8)}: activeDownload status`, { activeDownload, downloadStatus }, 'BATCH_UI');
  
  // Check download status for completed jobs
  useEffect(() => {
    if (job.status === 'completed') {
      InstantDownloadService.hasInstantDownload(job.id)
        .then(status => {
          productionLogger.debug(`Download status for ${job.id.substring(0,8)}`, status, 'BATCH_UI');
          setDownloadStatus({
            status: status.status,
            hasFiles: status.hasFiles,
            hasResults: status.hasResults
          });
        })
        .catch(error => {
          productionLogger.error('Error checking download status', error, 'BATCH_UI');
          setDownloadStatus({ status: 'unavailable', hasFiles: false, hasResults: false });
        });
    }
  }, [job.id, job.status]);

  return (
    <div className="space-y-3">
      <BatchJobProgress job={job} />
      <BatchJobRequestCounts job={job} />
      <BatchJobStuckWarning job={job} />
      <BatchJobActiveDownload activeDownload={activeDownload} />
      
      {job.status === 'completed' && (
        <BatchJobCompletedDownload 
          downloadStatus={downloadStatus}
          activeDownload={activeDownload}
          onDownload={onDownload}
        />
      )}
      
      <BatchJobFinalizingDownload 
        job={job}
        activeDownload={activeDownload}
        onDownload={onDownload}
      />
    </div>
  );
};

export default BatchJobCardContent;