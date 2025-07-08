import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { DownloadRecoveryService, DownloadRecoveryResult } from '@/lib/services/downloadRecoveryService';

interface DownloadHealthMonitorProps {
  jobs: BatchJob[];
  onRecoveryComplete?: (results: DownloadRecoveryResult[]) => void;
}

interface JobHealthStatus {
  jobId: string;
  status: 'healthy' | 'missing_results' | 'checking' | 'recovering';
  hasStoredResults?: boolean;
  error?: string;
}

export const DownloadHealthMonitor: React.FC<DownloadHealthMonitorProps> = ({
  jobs,
  onRecoveryComplete
}) => {
  const { toast } = useToast();
  const [healthStatuses, setHealthStatuses] = useState<Record<string, JobHealthStatus>>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const completedJobs = jobs.filter(job => job.status === 'completed');

  const checkJobsHealth = async () => {
    if (completedJobs.length === 0) return;

    setIsCheckingHealth(true);
    console.log(`[DOWNLOAD HEALTH] Checking health of ${completedJobs.length} completed jobs`);

    const newStatuses: Record<string, JobHealthStatus> = {};

    for (const job of completedJobs) {
      try {
        setHealthStatuses(prev => ({
          ...prev,
          [job.id]: { jobId: job.id, status: 'checking' }
        }));

        const hasStoredResults = await DownloadRecoveryService.hasStoredResults(job.id);
        
        newStatuses[job.id] = {
          jobId: job.id,
          status: hasStoredResults ? 'healthy' : 'missing_results',
          hasStoredResults
        };

        console.log(`[DOWNLOAD HEALTH] Job ${job.id}: ${hasStoredResults ? 'healthy' : 'missing results'}`);
        
      } catch (error) {
        console.error(`[DOWNLOAD HEALTH] Error checking job ${job.id}:`, error);
        newStatuses[job.id] = {
          jobId: job.id,
          status: 'missing_results',
          hasStoredResults: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    setHealthStatuses(newStatuses);
    setIsCheckingHealth(false);

    const unhealthyCount = Object.values(newStatuses).filter(s => s.status === 'missing_results').length;
    
    if (unhealthyCount > 0) {
      toast({
        title: "Download Issues Detected",
        description: `Found ${unhealthyCount} completed jobs missing download results`,
        variant: "destructive"
      });
    }
  };

  const recoverUnhealthyJobs = async () => {
    const unhealthyJobs = Object.values(healthStatuses)
      .filter(status => status.status === 'missing_results')
      .map(status => status.jobId);

    if (unhealthyJobs.length === 0) {
      toast({
        title: "No Recovery Needed",
        description: "All jobs have healthy download results",
      });
      return;
    }

    setIsRecovering(true);
    console.log(`[DOWNLOAD HEALTH] Starting recovery for ${unhealthyJobs.length} unhealthy jobs`);

    // Update statuses to show recovery in progress
    setHealthStatuses(prev => {
      const updated = { ...prev };
      unhealthyJobs.forEach(jobId => {
        updated[jobId] = { ...updated[jobId], status: 'recovering' };
      });
      return updated;
    });

    try {
      const recoveryResults = await DownloadRecoveryService.diagnoseAndFixJobs(unhealthyJobs);
      
      // Update statuses based on recovery results
      setHealthStatuses(prev => {
        const updated = { ...prev };
        recoveryResults.forEach(result => {
          updated[result.jobId] = {
            ...updated[result.jobId],
            status: result.success ? 'healthy' : 'missing_results',
            hasStoredResults: result.success,
            error: result.error
          };
        });
        return updated;
      });

      const successfulRecoveries = recoveryResults.filter(r => r.success);
      const failedRecoveries = recoveryResults.filter(r => !r.success);

      if (successfulRecoveries.length > 0) {
        toast({
          title: "Recovery Successful",
          description: `✅ Recovered ${successfulRecoveries.length} jobs. Download results are now available.`,
        });
      }

      if (failedRecoveries.length > 0) {
        toast({
          title: "Partial Recovery",
          description: `⚠️ ${failedRecoveries.length} jobs could not be recovered. Check console for details.`,
          variant: "destructive"
        });
      }

      onRecoveryComplete?.(recoveryResults);

    } catch (error) {
      console.error('[DOWNLOAD HEALTH] Recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: error instanceof Error ? error.message : 'Unknown error during recovery',
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  useEffect(() => {
    if (completedJobs.length > 0) {
      checkJobsHealth();
    }
  }, [completedJobs.length]);

  if (completedJobs.length === 0) {
    return null;
  }

  const healthyCount = Object.values(healthStatuses).filter(s => s.status === 'healthy').length;
  const unhealthyCount = Object.values(healthStatuses).filter(s => s.status === 'missing_results').length;
  const checkingCount = Object.values(healthStatuses).filter(s => s.status === 'checking').length;
  const recoveringCount = Object.values(healthStatuses).filter(s => s.status === 'recovering').length;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Download Health Monitor
        </CardTitle>
        <CardDescription>
          Monitor and recover download capabilities for completed jobs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Healthy: {healthyCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>Missing Results: {unhealthyCount}</span>
            </div>
            {checkingCount > 0 && (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span>Checking: {checkingCount}</span>
              </div>
            )}
            {recoveringCount > 0 && (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
                <span>Recovering: {recoveringCount}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkJobsHealth}
              disabled={isCheckingHealth}
            >
              {isCheckingHealth ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check Health
            </Button>
            
            {unhealthyCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={recoverUnhealthyJobs}
                disabled={isRecovering}
              >
                {isRecovering ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Recover {unhealthyCount} Jobs
              </Button>
            )}
          </div>
        </div>

        {/* Job Status List */}
        {Object.keys(healthStatuses).length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Object.values(healthStatuses).map(status => {
              const job = completedJobs.find(j => j.id === status.jobId);
              const jobName = `Job ${status.jobId.substring(0, 8)}`;
              
              return (
                <div key={status.jobId} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="text-sm font-mono">{jobName}</span>
                  <div className="flex items-center gap-2">
                    {status.status === 'healthy' && (
                      <Badge variant="default" className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    )}
                    {status.status === 'missing_results' && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Missing Results
                      </Badge>
                    )}
                    {status.status === 'checking' && (
                      <Badge variant="secondary">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Checking
                      </Badge>
                    )}
                    {status.status === 'recovering' && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Recovering
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};