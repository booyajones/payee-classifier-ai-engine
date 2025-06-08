
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface UploadErrorDisplayProps {
  errorMessage: string;
  suggestions: string[];
  onRetry: () => void;
}

const UploadErrorDisplay = ({ errorMessage, suggestions, onRetry }: UploadErrorDisplayProps) => {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      
      {suggestions.length > 0 && (
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
      
      <Button variant="outline" onClick={onRetry} className="w-full">
        Try Again
      </Button>
    </div>
  );
};

export default UploadErrorDisplay;
