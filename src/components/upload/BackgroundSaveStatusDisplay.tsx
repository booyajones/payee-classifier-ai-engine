
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { BackgroundSaveStatus } from '@/hooks/useFileUploadForm';

interface BackgroundSaveStatusDisplayProps {
  status: BackgroundSaveStatus;
}

const BackgroundSaveStatusDisplay = ({ status }: BackgroundSaveStatusDisplayProps) => {
  switch (status) {
    case 'saving':
      return (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Background data save in progress...
          </div>
        </div>
      );
    case 'complete':
      return (
        <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Background data save completed successfully
          </div>
        </div>
      );
    case 'error':
      return (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Background save had issues but batch job is processing normally
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default BackgroundSaveStatusDisplay;
