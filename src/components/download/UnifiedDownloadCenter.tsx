import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Clock, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import DirectDatabaseDownload from '@/components/batch/DirectDatabaseDownload';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface UnifiedDownloadCenterProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  onDownload: (job: BatchJob) => Promise<void>;
  onDelete?: (jobId: string) => Promise<void>;
}

const UnifiedDownloadCenter = ({
  jobs,
  payeeRowDataMap,
  onDownload,
  onDelete
}: UnifiedDownloadCenterProps) => {
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Filter jobs that are available for download
  const downloadableJobs = jobs.filter(job => 
    job.status === 'completed' && 
    payeeRowDataMap[job.id]
  );

  const handleJobDownload = async (job: BatchJob) => {
    setDownloadingJobs(prev => new Set(prev).add(job.id));
    try {
      await onDownload(job);
    } finally {
      setDownloadingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleJobDelete = async (job: BatchJob) => {
    if (!onDelete) return;
    
    setDeletingJobs(prev => new Set(prev).add(job.id));
    try {
      await onDelete(job.id);
      toast({
        title: "Job Deleted",
        description: `Job ${job.metadata?.job_name || job.id.substring(0, 8)} has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: "Delete Failed", 
        description: `Failed to delete job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDeletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const getJobStatusIcon = (job: BatchJob) => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
      case 'validating':
      case 'finalizing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
      case 'cancelled':
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'validating': return 'bg-purple-100 text-purple-800';
      case 'finalizing': return 'bg-indigo-100 text-indigo-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No jobs available. Upload a file to create your first batch job.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Download Center
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Download results from completed jobs
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {downloadableJobs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-2">No completed jobs ready for download</p>
              {jobs.some(job => ['in_progress', 'validating', 'finalizing'].includes(job.status)) && (
                <p className="text-sm text-blue-600">Jobs are still processing...</p>
              )}
            </div>
          ) : (
            downloadableJobs.map(job => {
              const payeeData = payeeRowDataMap[job.id];
              const isDownloading = downloadingJobs.has(job.id);
              const uniquePayees = payeeData?.uniquePayeeNames?.length || 0;
              const originalRows = payeeData?.originalFileData?.length || 0;

              return (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getJobStatusIcon(job)}
                      <h4 className="font-medium">
                        {job.metadata?.job_name || `Job ${job.id.substring(0, 8)}`}
                      </h4>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📄 {originalRows} original rows • 👥 {uniquePayees} unique payees</p>
                      <p>📊 {job.request_counts.completed}/{job.request_counts.total} processed</p>
                      <p>📅 Completed {job.completed_at ? new Date(job.completed_at * 1000).toLocaleString() : 'Recently'}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <DirectDatabaseDownload 
                      jobId={job.id}
                      className="h-9"
                    />
                    
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingJobs.has(job.id)}
                          >
                            {deletingJobs.has(job.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Job</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{job.metadata?.job_name || `Job ${job.id.substring(0, 8)}`}"? 
                              This action cannot be undone and will permanently remove all job data and results.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleJobDelete(job)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Job
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* All Jobs Overview */}
          {jobs.length > downloadableJobs.length && (
            <div className="mt-6 pt-4 border-t">
              <h5 className="font-medium mb-3">All Jobs Status</h5>
              <div className="grid grid-cols-1 gap-2">
                {jobs.filter(job => job.status !== 'completed').map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      {getJobStatusIcon(job)}
                      <span className="text-sm font-medium">
                        {job.metadata?.job_name || `Job ${job.id.substring(0, 8)}`}
                      </span>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {job.request_counts.completed}/{job.request_counts.total} processed
                      </div>
                      
                      {onDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deletingJobs.has(job.id)}
                            >
                              {deletingJobs.has(job.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Job</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{job.metadata?.job_name || `Job ${job.id.substring(0, 8)}`}"? 
                                This action cannot be undone and will permanently remove all job data and results.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleJobDelete(job)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Job
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedDownloadCenter;