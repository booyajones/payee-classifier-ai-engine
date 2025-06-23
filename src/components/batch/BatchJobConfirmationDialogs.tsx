
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
    if (!job) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Batch Job',
      description: `Are you sure you want to cancel this job? This action cannot be undone and you may be charged for completed requests.`,
      onConfirm: () => handleCancelJob(job.id),
      variant: 'destructive'
    });
  };

  const showDeleteConfirmation = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    const jobStatus = job?.status || 'unknown';
    
    let description = '';
    if (jobStatus === 'cancelling') {
      description = 'This job is currently being cancelled. Removing it will hide it from your view but the cancellation will continue on OpenAI\'s side.';
    } else if (['cancelled', 'failed', 'expired'].includes(jobStatus)) {
      description = 'This will remove the job from your list. The job data will no longer be visible, but this does not affect the actual OpenAI batch job.';
    } else if (jobStatus === 'completed') {
      description = 'This will remove the completed job from your list. You can still download results before removing if needed.';
    } else {
      description = 'This will remove the job from your view. This does not cancel or affect the actual OpenAI batch job.';
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Remove Job from List',
      description,
      onConfirm: () => {
        console.log(`[DEBUG] Deleting job ${jobId} from list`);
        onJobDelete(jobId);
      },
      variant: 'destructive'
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  return {
    confirmDialog,
    showCancelConfirmation,
    showDeleteConfirmation,
    closeConfirmDialog
  };
};
