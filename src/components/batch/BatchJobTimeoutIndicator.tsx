
import { AlertTriangle, Clock, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

interface BatchJobTimeoutIndicatorProps {
  job: BatchJob;
  isStuck: boolean;
  shouldTimeout: boolean;
  elapsedTime: string;
  onRecover: () => void;
  isRecovering?: boolean;
}

const BatchJobTimeoutIndicator = ({
  job,
  isStuck,
  shouldTimeout,
  elapsedTime,
  onRecover,
  isRecovering = false
}: BatchJobTimeoutIndicatorProps) => {
  if (!isStuck && !shouldTimeout) {
    return null;
  }

  if (shouldTimeout) {
    return (
      <Alert variant="destructive" className="mt-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Job appears stuck</strong> - No progress for {elapsedTime}. 
            This usually indicates an issue with OpenAI's batch processing.
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRecover}
            disabled={isRecovering}
            className="ml-4"
          >
            {isRecovering ? (
              <>
                <Zap className="h-3 w-3 mr-1 animate-pulse" />
                Recovering...
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 mr-1" />
                Auto-Recover
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isStuck) {
    return (
      <Alert className="mt-2">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Processing longer than expected ({elapsedTime}). This is normal for large batches.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={onRecover}
              disabled={isRecovering}
              className="ml-4"
            >
              {isRecovering ? (
                <>
                  <Zap className="h-3 w-3 mr-1 animate-pulse" />
                  Checking...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Force Recovery
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default BatchJobTimeoutIndicator;
