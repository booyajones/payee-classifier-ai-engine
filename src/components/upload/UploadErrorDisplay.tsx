
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AppError } from '@/lib/errorHandler';

interface UploadErrorDisplayProps {
  error: AppError | Error | string;
  onRetry?: () => void;
  onReset?: () => void;
  context?: string;
}

const UploadErrorDisplay = ({ error, onRetry, onReset, context }: UploadErrorDisplayProps) => {
  const getErrorInfo = () => {
    if (typeof error === 'string') {
      return { message: error, suggestions: [] };
    }
    
    if ('code' in error) {
      const appError = error as AppError;
      return {
        message: appError.message,
        suggestions: getSuggestions(appError.code),
        retryable: appError.retryable
      };
    }
    
    return { 
      message: error.message || 'An unexpected error occurred',
      suggestions: ['Please try again', 'Check your file format', 'Ensure file is not corrupted']
    };
  };

  const getSuggestions = (errorCode: string): string[] => {
    switch (errorCode) {
      case 'FILE_TOO_LARGE':
        return ['Try splitting your file into smaller chunks', 'Remove unnecessary columns', 'Use CSV format instead of Excel'];
      case 'INVALID_FILE_FORMAT':
        return ['Ensure file is in CSV or Excel format', 'Check that file has proper headers', 'Verify file is not corrupted'];
      case 'EMPTY_FILE':
        return ['Check that your file contains data', 'Ensure headers are present', 'Verify file was saved correctly'];
      case 'NO_VALID_PAYEES':
        return ['Check payee name column exists', 'Ensure payee names are not empty', 'Verify column mapping is correct'];
      case 'API_QUOTA_EXCEEDED':
        return ['Wait a few minutes before retrying', 'Consider using batch processing', 'Check your API usage limits'];
      case 'NETWORK_ERROR':
        return ['Check your internet connection', 'Try again in a few moments', 'Ensure firewall is not blocking requests'];
      default:
        return ['Please try again', 'Check the console for more details', 'Contact support if the issue persists'];
    }
  };

  const { message, suggestions, retryable } = getErrorInfo();

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">
              {context ? `${context} Error` : 'Upload Error'}
            </div>
            <div>{message}</div>
          </div>
        </AlertDescription>
      </Alert>
      
      {suggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Suggestions:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex gap-2">
        {onRetry && retryable !== false && (
          <Button variant="outline" onClick={onRetry} size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        )}
        {onReset && (
          <Button variant="secondary" onClick={onReset} size="sm">
            Start Over
          </Button>
        )}
      </div>
    </div>
  );
};

export default UploadErrorDisplay;
