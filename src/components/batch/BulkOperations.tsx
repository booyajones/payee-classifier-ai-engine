import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Download, 
  Trash2, 
  Play, 
  Pause, 
  RefreshCw,
  MoreHorizontal,
  Archive,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnhancedNotifications } from '@/components/ui/enhanced-notifications';
import ConfirmationDialog from '@/components/ConfirmationDialog';

export interface BulkOperationsProps {
  selectedJobs: string[];
  totalJobs: number;
  onSelectAll: (selected: boolean) => void;
  onSelectJob: (jobId: string, selected: boolean) => void;
  onBulkDownload: (jobIds: string[]) => Promise<void>;
  onBulkDelete: (jobIds: string[]) => Promise<void>;
  onBulkCancel: (jobIds: string[]) => Promise<void>;
  onBulkRefresh: (jobIds: string[]) => Promise<void>;
  onBulkArchive?: (jobIds: string[]) => Promise<void>;
  jobs: any[];
  isProcessing?: boolean;
}

const BulkOperations = ({
  selectedJobs,
  totalJobs,
  onSelectAll,
  onSelectJob,
  onBulkDownload,
  onBulkDelete,
  onBulkCancel,
  onBulkRefresh,
  onBulkArchive,
  jobs,
  isProcessing = false
}: BulkOperationsProps) => {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'cancel' | 'archive' | null;
    jobIds: string[];
  }>({ type: null, jobIds: [] });
  
  const { showSuccess, showError, showLoading } = useEnhancedNotifications();

  const allSelected = selectedJobs.length === totalJobs && totalJobs > 0;
  const partialSelected = selectedJobs.length > 0 && selectedJobs.length < totalJobs;

  // Get job counts by status
  const getJobCounts = () => {
    const selectedJobData = jobs.filter(job => selectedJobs.includes(job.id));
    const counts = {
      completed: selectedJobData.filter(job => job.status === 'completed').length,
      failed: selectedJobData.filter(job => job.status === 'failed').length,
      inProgress: selectedJobData.filter(job => ['in_progress', 'validating', 'finalizing'].includes(job.status)).length,
      cancelled: selectedJobData.filter(job => job.status === 'cancelled').length,
      pending: selectedJobData.filter(job => job.status === 'pending').length
    };
    return counts;
  };

  const jobCounts = getJobCounts();

  const handleSelectAll = () => {
    onSelectAll(!allSelected);
  };

  const handleBulkAction = async (action: 'download' | 'delete' | 'cancel' | 'refresh' | 'archive') => {
    if (selectedJobs.length === 0) {
      showError('No Selection', 'Please select jobs to perform this action');
      return;
    }

    // Show confirmation for destructive actions
    if (['delete', 'cancel', 'archive'].includes(action)) {
      setConfirmAction({ type: action as any, jobIds: selectedJobs });
      return;
    }

    try {
      const dismiss = showLoading(
        `${action.charAt(0).toUpperCase() + action.slice(1)}ing Jobs`,
        `Processing ${selectedJobs.length} jobs...`
      );

      switch (action) {
        case 'download':
          await onBulkDownload(selectedJobs);
          showSuccess(
            'Downloads Started',
            `Downloading results for ${selectedJobs.length} jobs`
          );
          break;
        case 'refresh':
          await onBulkRefresh(selectedJobs);
          showSuccess(
            'Jobs Refreshed',
            `Updated status for ${selectedJobs.length} jobs`
          );
          break;
      }

      dismiss();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
      showError(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        error instanceof Error ? error.message : `Failed to ${action} jobs`
      );
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction.type || confirmAction.jobIds.length === 0) return;

    try {
      const dismiss = showLoading(
        `${confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)}ing Jobs`,
        `Processing ${confirmAction.jobIds.length} jobs...`
      );

      switch (confirmAction.type) {
        case 'delete':
          await onBulkDelete(confirmAction.jobIds);
          showSuccess(
            'Jobs Deleted',
            `Removed ${confirmAction.jobIds.length} jobs`
          );
          break;
        case 'cancel':
          await onBulkCancel(confirmAction.jobIds);
          showSuccess(
            'Jobs Cancelled',
            `Cancelled ${confirmAction.jobIds.length} jobs`
          );
          break;
        case 'archive':
          if (onBulkArchive) {
            await onBulkArchive(confirmAction.jobIds);
            showSuccess(
              'Jobs Archived',
              `Archived ${confirmAction.jobIds.length} jobs`
            );
          }
          break;
      }

      dismiss();
      setConfirmAction({ type: null, jobIds: [] });
    } catch (error) {
      console.error(`Bulk ${confirmAction.type} failed:`, error);
      showError(
        `${confirmAction.type?.charAt(0).toUpperCase() + confirmAction.type?.slice(1)} Failed`,
        error instanceof Error ? error.message : `Failed to ${confirmAction.type} jobs`
      );
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="p-0 h-auto"
                disabled={isProcessing}
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5" />
                ) : partialSelected ? (
                  <div className="h-5 w-5 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center">
                    <div className="h-2 w-2 bg-primary rounded-sm" />
                  </div>
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </Button>
              
              <span>
                Bulk Operations
                {selectedJobs.length > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({selectedJobs.length} selected)
                  </span>
                )}
              </span>
            </CardTitle>
            
            {selectedJobs.length > 0 && (
              <div className="flex items-center gap-2">
                {/* Job status counts */}
                <div className="flex gap-1">
                  {jobCounts.completed > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      {jobCounts.completed} completed
                    </Badge>
                  )}
                  {jobCounts.inProgress > 0 && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      {jobCounts.inProgress} running
                    </Badge>
                  )}
                  {jobCounts.failed > 0 && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                      {jobCounts.failed} failed
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {selectedJobs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Select jobs to enable bulk operations
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* Primary actions */}
              {jobCounts.completed > 0 && (
                <Button
                  onClick={() => handleBulkAction('download')}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  Download ({jobCounts.completed})
                </Button>
              )}

              <Button
                onClick={() => handleBulkAction('refresh')}
                disabled={isProcessing}
                variant="outline"
                className="flex items-center gap-2"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>

              {jobCounts.inProgress > 0 && (
                <Button
                  onClick={() => handleBulkAction('cancel')}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Pause className="h-4 w-4" />
                  Cancel ({jobCounts.inProgress})
                </Button>
              )}

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onBulkArchive && (
                    <>
                      <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Selected
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={() => handleBulkAction('delete')}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmAction.type !== null}
        onOpenChange={(open) => !open && setConfirmAction({ type: null, jobIds: [] })}
        onConfirm={handleConfirmedAction}
        title={`${confirmAction.type?.charAt(0).toUpperCase() + confirmAction.type?.slice(1)} Jobs`}
        description={
          confirmAction.type === 'delete'
            ? `Are you sure you want to delete ${confirmAction.jobIds.length} jobs? This action cannot be undone.`
            : confirmAction.type === 'cancel'
            ? `Are you sure you want to cancel ${confirmAction.jobIds.length} running jobs?`
            : `Are you sure you want to archive ${confirmAction.jobIds.length} jobs?`
        }
        confirmText={confirmAction.type?.charAt(0).toUpperCase() + confirmAction.type?.slice(1)}
        variant={['delete', 'cancel'].includes(confirmAction.type || '') ? 'destructive' : 'default'}
      />
    </>
  );
};

export default BulkOperations;