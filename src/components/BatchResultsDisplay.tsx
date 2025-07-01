
import BatchProcessingSummary from "./BatchProcessingSummary";
import BatchResultsContent from "./batch/BatchResultsContent";
import BatchResultsActions from "./batch/BatchResultsActions";
import BatchResultsEmpty from "./batch/BatchResultsEmpty";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";

interface BatchResultsDisplayProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
  isDownloading?: boolean;
  downloadProgress?: { current: number; total: number };
  onCancelDownload?: () => void;
  jobId?: string;
}

const BatchResultsDisplay = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing,
  isDownloading = false,
  downloadProgress,
  onCancelDownload,
  jobId
}: BatchResultsDisplayProps) => {
  return (
    <>
      {processingSummary && (
        <div className="mb-6">
          <BatchProcessingSummary summary={processingSummary} />
        </div>
      )}

      {batchResults.length > 0 ? (
        <div>
          <BatchResultsContent batchResults={batchResults} />
          <BatchResultsActions 
            batchResults={batchResults}
            processingSummary={processingSummary}
            onReset={onReset}
            isProcessing={isProcessing}
            isDownloading={isDownloading}
            jobId={jobId}
          />
        </div>
      ) : (
        <BatchResultsEmpty />
      )}
    </>
  );
};

export default BatchResultsDisplay;
