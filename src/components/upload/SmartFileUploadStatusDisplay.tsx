// @ts-nocheck
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface SmartFileUploadStatusDisplayProps {
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  fileData?: any;
}

const SmartFileUploadStatusDisplay = ({ uploadStatus, errorMessage }: SmartFileUploadStatusDisplayProps) => {
  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading file...';
      case 'success':
        return 'File uploaded successfully!';
      case 'error':
        return errorMessage || 'File upload failed.';
      default:
        return 'Ready to upload';
    }
  };

  const getAlertVariant = () => {
    switch (uploadStatus) {
      case 'success':
        return 'success';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (uploadStatus === 'idle') {
    return null;
  }

  return (
    <Alert variant={getAlertVariant()}>
      {getStatusIcon() && (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertDescription>
        {getStatusText()}
      </AlertDescription>
    </Alert>
  );
};

export default SmartFileUploadStatusDisplay;
