import React, { useState, useEffect } from 'react';
import { productionLogger } from '@/lib/logging/productionLogger';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { useDownloadProgress } from '@/contexts/DownloadProgressContext';
import { InstantDownloadService } from '@/lib/services/instantDownloadService';
import { ForceFileGenerationService } from '@/lib/services/forceFileGenerationService';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  
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
  
  // Check download status only for truly completed jobs
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
    } else {
      // For non-completed jobs, show processing status
      setDownloadStatus({ status: 'checking', hasFiles: false, hasResults: false });
    }
  }, [job.id, job.status]);

  // Force download handler
  const handleForceDownload = async () => {
    try {
      toast({
        title: "Force Generating Files",
        description: "Generating files immediately...",
      });

      const result = await ForceFileGenerationService.forceGenerateFiles(job.id);
      
      if (result.success) {
        toast({
          title: "Files Generated",
          description: result.message,
        });
        
        // Update download status
        setDownloadStatus({
          status: 'instant',
          hasFiles: !!(result.csvUrl && result.excelUrl),
          hasResults: true
        });
        
        // Trigger the regular download
        onDownload();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      productionLogger.error('Force download failed', error, 'BATCH_UI');
      toast({
        title: "Force Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    }
  };

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
          onForceDownload={handleForceDownload}
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