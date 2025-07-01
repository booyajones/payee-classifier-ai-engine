
import React from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Download } from "lucide-react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { useEnhancedDownload } from "@/hooks/useEnhancedDownload";
import { useDownloadProgress } from "@/contexts/DownloadProgressContext";

interface BatchResultsActionsProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
  isDownloading?: boolean;
}

const BatchResultsActions = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing
}: BatchResultsActionsProps) => {
  const { downloadFile } = useEnhancedDownload();
  const { getActiveDownloads } = useDownloadProgress();
  
  const activeDownloads = getActiveDownloads();
  const hasActiveDownloads = activeDownloads.length > 0;

  const handleExportCSV = async () => {
    if (!processingSummary || batchResults.length === 0) return;
    await downloadFile(processingSummary, 'csv');
  };

  const handleExportExcel = async () => {
    if (!processingSummary || batchResults.length === 0) return;
    await downloadFile(processingSummary, 'excel');
  };

  const isDownloadDisabled = isProcessing || !processingSummary || batchResults.length === 0;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="default"
          onClick={handleExportCSV}
          disabled={isDownloadDisabled}
          className="flex-1 min-w-[120px]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
        
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={isDownloadDisabled}
          className="flex-1 min-w-[120px]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Excel
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
      
      <div className="text-xs text-muted-foreground mt-2 space-y-1">
        <p>CSV and Excel files include SIC codes and descriptions for business classifications.</p>
        {hasActiveDownloads && (
          <p className="text-blue-600">
            {activeDownloads.length} download(s) in progress. Check the download panel for details.
          </p>
        )}
      </div>
    </>
  );
};

export default BatchResultsActions;
