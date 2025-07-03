import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, FileUp, Clock } from 'lucide-react';

const EnhancedUploadProgressDisplay = ({
  uploadState,
  processingInfo = {},
  fileName,
  errorMessage
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (uploadState === 'complete') {
      const timer = setTimeout(() => setAnimatedProgress(100), 100);
      return () => clearTimeout(timer);
    } else if (uploadState === 'uploaded') {
      setAnimatedProgress(70);
    } else if (uploadState === 'processing') {
      setAnimatedProgress(85);
    } else {
      setAnimatedProgress(0);
    }
  }, [uploadState]);

  const getStatusIcon = () => {
    switch (uploadState) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileUp className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (uploadState) {
      case 'uploading':
        return 'Uploading file...';
      case 'uploaded':
        return 'File uploaded successfully';
      case 'processing':
        return 'Processing file data...';
      case 'complete':
        return 'Processing complete';
      case 'error':
        return errorMessage || 'Upload failed';
      default:
        return 'Ready to upload';
    }
  };

  const getStatusVariant = () => {
    switch (uploadState) {
      case 'complete':
        return 'success';
      case 'error':
        return 'destructive';
      case 'processing':
      case 'uploading':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (uploadState === 'idle') {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Main Status Display */}
      <Alert variant={getStatusVariant() === 'destructive' ? 'destructive' : 'default'}>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {fileName || 'File'}
              </span>
              <Badge variant={getStatusVariant()}>
                {getStatusText()}
              </Badge>
            </div>
            
            {/* Progress Bar */}
            {(uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'uploaded') && (
              <div className="mt-2">
                <Progress value={animatedProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Progress</span>
                  <span>{animatedProgress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {uploadState === 'error' && errorMessage && (
          <AlertDescription className="mt-2">
            {errorMessage}
          </AlertDescription>
        )}
      </Alert>

      {/* Processing Information */}
      {uploadState === 'complete' && processingInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {processingInfo.totalRows && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full" />
              <span className="text-muted-foreground">Rows:</span>
              <span className="font-medium">{processingInfo.totalRows.toLocaleString()}</span>
            </div>
          )}
          
          {processingInfo.uniquePayees && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-muted-foreground">Unique:</span>
              <span className="font-medium">{processingInfo.uniquePayees.toLocaleString()}</span>
            </div>
          )}
          
          {processingInfo.duplicates !== undefined && processingInfo.duplicates > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-orange-500 rounded-full" />
              <span className="text-muted-foreground">Duplicates:</span>
              <span className="font-medium">{processingInfo.duplicates.toLocaleString()}</span>
            </div>
          )}
          
          {processingInfo.fileInfo && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">
                {(processingInfo.fileInfo.size / 1024 / 1024).toFixed(1)}MB
              </span>
            </div>
          )}
        </div>
      )}

      {/* Completion Message */}
      {uploadState === 'complete' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            File processed successfully! You can now proceed with classification.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default EnhancedUploadProgressDisplay;