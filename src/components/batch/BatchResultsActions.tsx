
// @ts-nocheck  
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Download, Clock } from "lucide-react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import DownloadStatusDisplay from './DownloadStatusDisplay';
import { useFileStatus } from '@/hooks/useFileStatus';
import { useToast } from '@/hooks/use-toast';
import { InstantDownloadService } from '@/lib/services/instantDownloadService';

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
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  productionLogger.debug(`[BATCH RESULTS ACTIONS] JobId: ${jobId}, isGenerating: ${isGenerating}, isChecking: ${isChecking}`);

  const handleDownload = async (format: 'csv' | 'excel') => {
    if (!jobId) {
      toast({
        title: "Download Failed",
        description: "No job ID available for download",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Check if instant download is available
      const downloadStatus = await InstantDownloadService.hasInstantDownload(jobId);
      
      if (downloadStatus.status !== 'instant') {
        // Ensure job is ready for instant download
        const result = await InstantDownloadService.ensureJobReady(jobId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to prepare download');
        }
      }

      // Create a simple CSV download for now
      if (format === 'csv' && batchResults.length > 0) {
        const allColumns = Object.keys(batchResults[0]);
        const csvHeader = allColumns.map(col => `"${col}"`).join(',') + '\n';
        const csvRows = batchResults.map(row => {
          return allColumns.map(col => {
            const value = (row as any)[col] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',');
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `payee_results_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Download Complete",
          description: `Downloaded ${batchResults.length} results as CSV`,
        });
      }
    } catch (error) {
      productionLogger.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Failed to download results',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
