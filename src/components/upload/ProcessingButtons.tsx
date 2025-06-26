
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { ValidationStatus } from "@/hooks/useFileUploadForm";

interface ProcessingButtonsProps {
  file: File | null;
  selectedColumn: string;
  isLoading: boolean;
  validationStatus: ValidationStatus;
  isRetrying: boolean;
  retryCount: number;
  onProcess: () => void;
  onReset: () => void;
}

const ProcessingButtons = ({
  file,
  selectedColumn,
  isLoading,
  validationStatus,
  isRetrying,
  retryCount,
  onProcess,
  onReset
}: ProcessingButtonsProps) => {
  const isProcessButtonDisabled = !file || !selectedColumn || isLoading || validationStatus === 'validating' || validationStatus === 'error';

  return (
    <div className="flex gap-2">
      <Button 
        type="button" 
        className="flex-1" 
        disabled={isProcessButtonDisabled}
        onClick={onProcess}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isRetrying ? `Retrying (${retryCount + 1})...` : "Creating Batch Job..."}
          </>
        ) : (
          "Create Batch Job"
        )}
      </Button>
      
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={isLoading}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Clear
      </Button>
    </div>
  );
};

export default ProcessingButtons;
