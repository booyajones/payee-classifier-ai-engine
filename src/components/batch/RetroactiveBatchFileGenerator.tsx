
// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { RetroactiveBatchProcessor, RetroactiveProcessingResult } from '@/lib/services/retroactiveBatchProcessor';
import { useToast } from '@/hooks/use-toast';

interface RetroactiveBatchFileGeneratorProps {
  jobs: BatchJob[];
  onComplete: (results: RetroactiveProcessingResult[]) => void;
}

interface JobProgress {
  jobId: string;
  processed: number;
  total: number;
  stage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: RetroactiveProcessingResult;
}

const RetroactiveBatchFileGenerator = ({ jobs, onComplete }: RetroactiveBatchFileGeneratorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobProgress, setJobProgress] = useState<JobProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();

  const initializeProgress = () => {
    const initialProgress = jobs.map(job => ({
      jobId: job.id,
      processed: 0,
      total: 100,
      stage: 'Waiting to start...',
      status: 'pending' as const
    }));
    setJobProgress(initialProgress);
  };

  const handleStartProcessing = async () => {
    setIsProcessing(true);
    initializeProgress();

    try {
      const results = await RetroactiveBatchProcessor.processBulkJobs(
        jobs,
        (jobIndex, jobId, processed, total, stage) => {
          setJobProgress(prev => prev.map((job, index) => {
            if (index === jobIndex) {
              return {
                ...job,
                processed,
                total,
                stage,
                status: processed === 100 ? 'completed' : 'processing'
              };
            }
            return job;
          }));

          // Update overall progress
          const completedJobs = jobIndex;
          const currentJobProgress = processed / 100;
          const totalProgress = ((completedJobs + currentJobProgress) / jobs.length) * 100;
          setOverallProgress(Math.round(totalProgress));
        }
      );

      // Update with final results
      setJobProgress(prev => prev.map((job, index) => ({
        ...job,
        status: results[index].success ? 'completed' : 'failed',
        result: results[index],
        processed: 100,
        stage: results[index].success ? 'Files generated successfully!' : 'Failed to generate files'
      })));

      setOverallProgress(100);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      toast({
        title: "Processing Complete",
        description: `${successCount} jobs processed successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: successCount === jobs.length ? "default" : "destructive"
      });

      onComplete(results);
    } catch (error) {
      productionLogger.error('Bulk processing failed:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getJobRequestCount = (job: BatchJob) => {
    return job.request_counts.completed || job.request_counts.total || 0;
  };

  const formatJobId = (jobId: string) => {
    return jobId.replace('batch_', '').slice(0, 8);
  };

  const getStatusIcon = (status: JobProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: JobProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Pre-Generated Files for Completed Jobs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Process {jobs.length} completed batch jobs to create instant download files
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="w-full" />
          </div>
        )}

        {/* Job List */}
        <div className="space-y-3">
          {jobs.map((job, index) => {
            const progress = jobProgress[index];
            const requestCount = getJobRequestCount(job);
            
            return (
              <div key={job.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {progress && getStatusIcon(progress.status)}
                    <div>
                      <div className="font-mono text-sm">
                        {formatJobId(job.id)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {requestCount.toLocaleString()} records
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {progress && (
                      <Badge variant="outline" className={getStatusColor(progress.status)}>
                        {progress.status}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {job.status}
                    </Badge>
                  </div>
                </div>
                
                {progress && progress.status === 'processing' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>{progress.stage}</span>
                      <span>{progress.processed}%</span>
                    </div>
                    <Progress value={progress.processed} className="h-2" />
                  </div>
                )}

                {progress && progress.status === 'completed' && progress.result && (
                  <div className="text-xs text-green-600 flex items-center gap-2">
                    <Download className="h-3 w-3" />
                    Files ready for instant download
                    {progress.result.fileSizeBytes && (
                      <span>({Math.round(progress.result.fileSizeBytes / 1024)}KB)</span>
                    )}
                  </div>
                )}

                {progress && progress.status === 'failed' && progress.result && (
                  <div className="text-xs text-red-600">
                    Error: {progress.result.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleStartProcessing}
            disabled={isProcessing}
            size="lg"
            className="w-full max-w-md"
          >
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-pulse" />
                Processing Jobs...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate Files for All Jobs
              </>
            )}
          </Button>
        </div>

        {/* Summary */}
        <div className="text-xs text-muted-foreground text-center">
          Total records to process: {jobs.reduce((sum, job) => sum + getJobRequestCount(job), 0).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default RetroactiveBatchFileGenerator;
