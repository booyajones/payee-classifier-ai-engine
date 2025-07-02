
import React from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Download, Clock } from "lucide-react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import DownloadStatusDisplay from './DownloadStatusDisplay';
import { useFileStatus } from '@/hooks/useFileStatus';
import { useEnhancedDownloadWithNaming } from '@/hooks/useEnhancedDownloadWithNaming';

interface BatchResultsActionsProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
  jobId?: string;
}

const BatchResultsActions = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing,
  jobId
}: BatchResultsActionsProps) => {
  const { fileStatus, isChecking, hasPreGeneratedFiles } = useFileStatus(jobId);
  const { handleDownload, isGenerating } = useEnhancedDownloadWithNaming(
    fileStatus,
    () => {}, // setFileStatus not needed in this refactored version
    jobId,
    processingSummary
  );

  console.log(`[BATCH RESULTS ACTIONS] JobId: ${jobId}, isGenerating: ${isGenerating}, isChecking: ${isChecking}`);

  const isDownloadDisabled = isProcessing || !processingSummary || batchResults.length === 0;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="default"
          onClick={() => handleDownload('csv')}
          disabled={isDownloadDisabled || isGenerating}
          className="flex-1 min-w-[120px]"
        >
          {isChecking || isGenerating ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              {isGenerating ? 'Generating...' : 'Checking...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleDownload('excel')}
          disabled={isDownloadDisabled || isGenerating}
          className="flex-1 min-w-[120px]"
        >
          {isChecking || isGenerating ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              {isGenerating ? 'Generating...' : 'Checking...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={onReset}
          disabled={isProcessing}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Start Over
        </Button>
      </div>
      
      <DownloadStatusDisplay
        hasPreGeneratedFiles={hasPreGeneratedFiles}
        isProcessing={isProcessing}
        processingSummary={processingSummary}
        fileSizeBytes={fileStatus.fileSizeBytes}
        fileGeneratedAt={fileStatus.fileGeneratedAt}
        jobId={jobId}
      />
    </>
  );
};

export default BatchResultsActions;
