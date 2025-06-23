
import { Progress } from "@/components/ui/progress";
import { Clock, Loader2, CheckCircle, AlertCircle, Package } from "lucide-react";

interface BatchProcessingProgressProps {
  progress: number;
  status: string;
  showTimeRemaining?: boolean;
  estimatedTimeRemaining?: string;
  currentStep?: string;
  totalSteps?: number;
  isComplete?: boolean;
  hasError?: boolean;
  isChunked?: boolean;
  completedChunks?: number;
  totalChunks?: number;
}

const BatchProcessingProgress = ({ 
  progress, 
  status, 
  showTimeRemaining = false,
  estimatedTimeRemaining,
  currentStep,
  totalSteps,
  isComplete = false,
  hasError = false,
  isChunked = false,
  completedChunks = 0,
  totalChunks = 0
}: BatchProcessingProgressProps) => {
  const getStatusIcon = () => {
    if (hasError) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isComplete) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (isChunked) return <Package className="h-4 w-4 text-blue-500" />;
    return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
  };

  const getProgressColor = () => {
    if (hasError) return "bg-red-500";
    if (isComplete) return "bg-green-500";
    return "bg-blue-500";
  };

  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{status}</span>
        </div>
        <span className="text-sm font-medium">{Math.round(progress)}%</span>
      </div>
      
      {/* Progress Bar */}
      <div className="relative">
        <Progress 
          value={progress} 
          className="h-3"
        />
        <div 
          className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Additional Info */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {/* Chunked Processing Info */}
        {isChunked && totalChunks > 1 && (
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            <span>Processing in {totalChunks} chunks - {completedChunks} completed</span>
          </div>
        )}

        {currentStep && totalSteps && (
          <div className="flex items-center gap-1">
            <span>Step {currentStep} of {totalSteps}</span>
          </div>
        )}
        
        {showTimeRemaining && estimatedTimeRemaining && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Estimated time remaining: {estimatedTimeRemaining}</span>
          </div>
        )}
        
        {progress > 0 && !isComplete && !hasError && (
          <div>
            {isChunked && totalChunks > 1 
              ? `Large file split into ${totalChunks} chunks for efficient processing. You can safely leave this page.`
              : "Processing may take several minutes for large files. You can safely leave this page - your progress will be saved."
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchProcessingProgress;
