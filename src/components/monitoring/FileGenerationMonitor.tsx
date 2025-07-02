import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { BackgroundFileGenerationService } from '@/lib/services/backgroundFileGenerationService';
import { productionLogger } from '@/lib/logging/productionLogger';

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

const FileGenerationMonitor = () => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchQueueStatus = async () => {
    try {
      setIsLoading(true);
      const status = await BackgroundFileGenerationService.getQueueStatus();
      setQueueStatus(status);
      setLastUpdate(new Date());
      productionLogger.debug('Queue status updated', status, 'FILE_GEN_MONITOR');
    } catch (error) {
      productionLogger.error('Failed to fetch queue status', error, 'FILE_GEN_MONITOR');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const total = queueStatus.pending + queueStatus.processing + queueStatus.completed + queueStatus.failed;
  const healthScore = total > 0 ? ((queueStatus.completed / total) * 100).toFixed(1) : '100';

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">File Generation System</CardTitle>
          <CardDescription>
            Background processing queue status
            {lastUpdate && (
              <span className="ml-2 text-xs text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchQueueStatus}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Health Overview */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            {queueStatus.failed > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : queueStatus.processing > 0 ? (
              <Clock className="h-5 w-5 text-blue-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <span className="font-medium">System Health</span>
          </div>
          <Badge variant={queueStatus.failed > 0 ? "destructive" : queueStatus.processing > 0 ? "secondary" : "default"}>
            {healthScore}% Success Rate
          </Badge>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <div className="text-lg font-semibold">{queueStatus.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <RefreshCw className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-lg font-semibold">{queueStatus.processing}</div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-semibold">{queueStatus.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          
          <div className="text-center p-3 border rounded-lg">
            <XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <div className="text-lg font-semibold">{queueStatus.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Status Indicators */}
        {queueStatus.processing > 0 && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-800">
              {queueStatus.processing} file{queueStatus.processing !== 1 ? 's' : ''} currently being processed
            </span>
          </div>
        )}

        {queueStatus.failed > 0 && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">
              {queueStatus.failed} file{queueStatus.failed !== 1 ? 's' : ''} failed processing (will retry automatically)
            </span>
          </div>
        )}

        {total === 0 && (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <CheckCircle className="h-5 w-5 mr-2" />
            All systems operational - no pending file generation tasks
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileGenerationMonitor;