
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';
import BatchProcessingProgress from '../BatchProcessingProgress';
import { UploadState } from '@/hooks/useSmartFileUpload';

interface UploadProgressDisplayProps {
  uploadState: UploadState;
  uploadId: string;
}

const UploadProgressDisplay = ({ uploadState, uploadId }: UploadProgressDisplayProps) => {
  const { getProgress } = useUnifiedProgress();
  const currentProgress = getProgress(uploadId);

  const getStatusIcon = () => {
    switch (uploadState) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (!currentProgress || uploadState === 'idle') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="font-medium">{currentProgress.stage}</span>
      </div>
      <BatchProcessingProgress 
        progress={currentProgress.percentage} 
        status={currentProgress.stage} 
      />
      {currentProgress.jobId && (
        <p className="text-xs text-muted-foreground">
          Job ID: {currentProgress.jobId}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        This may take a few minutes depending on file size. You can leave this page - we'll save your progress.
      </p>
    </div>
  );
};

export default UploadProgressDisplay;
