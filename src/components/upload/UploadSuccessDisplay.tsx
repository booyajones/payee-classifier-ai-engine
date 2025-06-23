
import { CheckCircle, Download, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUnifiedProgress } from '@/contexts/UnifiedProgressContext';

interface UploadSuccessDisplayProps {
  uploadId: string;
  onReset?: () => void;
  onViewResults?: () => void;
  onExport?: () => void;
  resultCount?: number;
}

const UploadSuccessDisplay = ({ 
  uploadId, 
  onReset, 
  onViewResults, 
  onExport,
  resultCount 
}: UploadSuccessDisplayProps) => {
  const { getProgress } = useUnifiedProgress();
  const currentProgress = getProgress(uploadId);

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-medium text-green-800">
              {currentProgress?.message || 'Processing completed successfully!'}
            </div>
            {resultCount && (
              <div className="text-sm text-green-700">
                {resultCount} records processed
              </div>
            )}
          </div>
          
          <div className="flex gap-2 ml-4">
            {onViewResults && (
              <Button variant="outline" size="sm" onClick={onViewResults}>
                <Eye className="h-3 w-3 mr-1" />
                View Results
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
            {onReset && (
              <Button variant="secondary" size="sm" onClick={onReset}>
                Upload Another File
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default UploadSuccessDisplay;
