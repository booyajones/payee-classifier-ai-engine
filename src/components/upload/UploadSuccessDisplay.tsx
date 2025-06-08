
import { CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';

interface UploadSuccessDisplayProps {
  uploadId: string;
  onReset: () => void;
}

const UploadSuccessDisplay = ({ uploadId, onReset }: UploadSuccessDisplayProps) => {
  const { getProgress } = useUnifiedProgress();
  const currentProgress = getProgress(uploadId);

  return (
    <Alert>
      <CheckCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{currentProgress?.message || 'Processing completed successfully!'}</span>
        <Button variant="outline" size="sm" onClick={onReset}>
          Upload Another File
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default UploadSuccessDisplay;
