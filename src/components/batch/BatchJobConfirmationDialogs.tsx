
import { useState } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

interface BatchJobConfirmationDialogsProps {
  jobs: BatchJob[];
  handleCancelJob: (jobId: string) => void;
  onJobDelete: (jobId: string) => void;
}

export const useBatchJobConfirmationDialogs = ({ 
  jobs, 
  handleCancelJob, 
  onJobDelete 
}: BatchJobConfirmationDialogsProps) => {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const showCancelConfirmation = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      productionLogger.error(`[CONFIRMATION DIALOGS] Job not found for cancellation: ${jobId}`);
      return;
    }
    
    productionLogger.debug(`[CONFIRMATION DIALOGS] Showing cancel confirmation for job ${jobId}`);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Batch Job',
      description: `Are you sure you want to cancel this job? This action cannot be undone and you may be charged for completed requests.`,
      onConfirm: () => {
        productionLogger.debug(`[CONFIRMATION DIALOGS] User confirmed cancellation for job ${jobId}`);
        handleCancelJob(job.id);
        closeConfirmDialog();
      },
      variant: 'destructive'
    });
  };

  const showDeleteConfirmation = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    const jobStatus = job?.status || 'unknown';
    
    productionLogger.debug(`[CONFIRMATION DIALOGS] Showing delete confirmation for job ${jobId} with status: ${jobStatus}`);
    
    let description = '';
    if (jobStatus === 'cancelling') {
      description = 'This job is currently being cancelled. Removing it will delete it permanently from your account and the database.';
    } else if (['cancelled', 'failed', 'expired'].includes(jobStatus)) {
      description = 'This will permanently delete the job from your account and the database. This action cannot be undone.';
    } else if (jobStatus === 'completed') {
      description = 'This will permanently delete the completed job from your account and the database. Make sure you have downloaded any results you need first.';
    } else {
      description = 'This will permanently delete the job from your account and the database. This action cannot be undone.';
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Job Permanently',
      description,
      onConfirm: () => {
        productionLogger.debug(`[CONFIRMATION DIALOGS] User confirmed deletion for job ${jobId}`);
        
        // Validate onJobDelete function before calling
        if (typeof onJobDelete === 'function') {
          onJobDelete(jobId);
        } else {
          productionLogger.error('[CONFIRMATION DIALOGS] onJobDelete is not a function:', typeof onJobDelete);
        }
        
        closeConfirmDialog();
      },
      variant: 'destructive'
    });
  };

  const closeConfirmDialog = () => {
    productionLogger.debug('[CONFIRMATION DIALOGS] Closing confirmation dialog');
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  return {
    confirmDialog,
    showCancelConfirmation,
    showDeleteConfirmation,
    closeConfirmDialog
  };
};
