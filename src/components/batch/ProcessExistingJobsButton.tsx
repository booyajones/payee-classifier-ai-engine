import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { InstantDownloadService } from '@/lib/services/instantDownloadService';
import { useToast } from '@/hooks/use-toast';

interface ProcessExistingJobsButtonProps {
  onProcessingComplete?: () => void;
}

const ProcessExistingJobsButton = ({ onProcessingComplete }: ProcessExistingJobsButtonProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    processed: number;
    alreadyReady: number;
    failed: number;
    timestamp: Date;
  } | null>(null);
  
  const { toast } = useToast();

  const handleProcessExisting = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    console.log('[PROCESS EXISTING] Starting processing of existing completed jobs...');
    
    try {
      const result = await InstantDownloadService.processExistingCompletedJobs();
      
      console.log('[PROCESS EXISTING] Processing complete:', result);
      
      setLastResult({
        processed: result.processed,
        alreadyReady: result.alreadyReady,
        failed: result.failed,
        timestamp: new Date()
      });
      
      // Show success toast
      toast({
        title: "Processing Complete",
        description: `✅ Processed ${result.processed} jobs, ${result.alreadyReady} already ready, ${result.failed} failed`,
        duration: 6000,
      });
      
      // Show errors if any
      if (result.errors.length > 0) {
        console.warn('[PROCESS EXISTING] Errors encountered:', result.errors);
        toast({
          title: "Some Jobs Failed",
          description: `${result.failed} jobs failed to process. Check console for details.`,
          variant: "destructive",
          duration: 8000,
        });
      }
      
      // Notify parent component
      onProcessingComplete?.();
      
    } catch (error) {
      console.error('[PROCESS EXISTING] Processing failed:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleProcessExisting}
        disabled={isProcessing}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Enable Instant Downloads
          </>
        )}
      </Button>
      
      {lastResult && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            {lastResult.processed} processed
          </Badge>
          
          {lastResult.alreadyReady > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-600" />
              {lastResult.alreadyReady} ready
            </Badge>
          )}
          
          {lastResult.failed > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {lastResult.failed} failed
            </Badge>
          )}
          
          <span className="text-muted-foreground">
            {lastResult.timestamp.toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProcessExistingJobsButton;