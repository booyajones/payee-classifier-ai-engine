
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ValidationStatus } from '@/hooks/useFileUploadForm';

interface FileValidationIndicatorProps {
  status: ValidationStatus;
}

const FileValidationIndicator = ({ status }: FileValidationIndicatorProps) => {
  switch (status) {
    case 'validating':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'valid':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

export default FileValidationIndicator;
