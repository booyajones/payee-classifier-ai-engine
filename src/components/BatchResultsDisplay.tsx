
import BatchProcessingSummary from "./BatchProcessingSummary";
import BatchResultsContent from "./batch/BatchResultsContent";
import FastDownloadActions from "./batch/FastDownloadActions";
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
          <FastDownloadActions 
            batchResults={batchResults}
            processingSummary={processingSummary}
            onReset={onReset}
            isProcessing={isProcessing}
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
