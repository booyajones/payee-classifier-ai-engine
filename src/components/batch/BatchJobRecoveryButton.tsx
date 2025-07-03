// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { BatchJobUpdater } from '@/lib/database/batchJobUpdater';
import { useToast } from '@/hooks/use-toast';

interface BatchJobRecoveryButtonProps {
  jobId: string;
  status: string;
  onRecovery?: () => void;
}

const BatchJobRecoveryButton = ({ 
  jobId, 
  status,
  onRecovery 
}: BatchJobRecoveryButtonProps) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const { toast } = useToast();

  // Only show for stuck processing_results jobs
  if (status !== 'processing_results') {
    return null;
  }

  const handleRecovery = async () => {
    setIsRecovering(true);
    
    try {
      const success = await BatchJobUpdater.recoverStuckJob(jobId);
      
      if (success) {
        toast({
          title: "Job Recovered",
          description: `Successfully recovered job ${jobId.substring(0, 8)}...`,
        });
        onRecovery?.();
      } else {
        toast({
          title: "Recovery Failed",
          description: "Could not recover this job. It may need manual processing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Recovery Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRecovery}
      disabled={isRecovering}
      className="text-amber-600 border-amber-200 hover:bg-amber-50"
    >
      {isRecovering ? (
        <>
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Recovering...
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3 mr-1" />
          Fix Stuck Job
        </>
      )}
    </Button>
  );
};

export default BatchJobRecoveryButton;
