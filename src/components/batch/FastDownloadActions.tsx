
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Download, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { EnhancedFileGenerationService } from "@/lib/services/enhancedFileGenerationService";
import { PreGeneratedFileService } from "@/lib/storage/preGeneratedFileService";
import { useToast } from "@/hooks/use-toast";

interface FastDownloadActionsProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
  jobId?: string;
}

const FastDownloadActions = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing,
  jobId
}: FastDownloadActionsProps) => {
  const { toast } = useToast();
  const [fileStatus, setFileStatus] = useState<{
    filesReady: boolean;
    csvUrl?: string;
    excelUrl?: string;
    fileGeneratedAt?: string;
    fileSizeBytes?: number;
  }>({ filesReady: false });
  
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check file status on mount and when jobId changes
  useEffect(() => {
    if (jobId) {
      checkFileStatus();
    }
  }, [jobId]);

  const checkFileStatus = async () => {
    if (!jobId) return;
    
    try {
      const status = await EnhancedFileGenerationService.getFileStatus(jobId);
      setFileStatus(status);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking file status:', error);
    }
  };

  const handleInstantDownload = async (format: 'csv' | 'excel') => {
    if (!fileStatus.filesReady) {
      toast({
        title: "Files Not Ready",
        description: "Download files are not available. Please generate them first.",
        variant: "destructive",
      });
      return;
    }

    const url = format === 'csv' ? fileStatus.csvUrl : fileStatus.excelUrl;
    if (!url) {
      toast({
        title: "Download Error",
        description: "File URL not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `payee_results_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      
      await PreGeneratedFileService.downloadFileFromStorage(url, filename);
      
      toast({
        title: "Download Complete",
        description: `${filename} downloaded successfully`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateFiles = async () => {
    if (!jobId) return;
    
    setIsRegenerating(true);
    try {
      toast({
        title: "Generating Files",
        description: "Creating download files...",
      });

      const result = await EnhancedFileGenerationService.regenerateFiles(jobId);
      
      if (result.success) {
        await checkFileStatus(); // Refresh status
        toast({
          title: "Files Generated",
          description: "Download files are now ready!",
        });
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('File generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const isDownloadDisabled = isProcessing || !processingSummary || batchResults.length === 0;
  const showRegenerateOption = !fileStatus.filesReady && !isProcessing && processingSummary;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="default"
          onClick={() => handleInstantDownload('csv')}
          disabled={isDownloadDisabled || !fileStatus.filesReady}
          className="flex-1 min-w-[120px]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleInstantDownload('excel')}
          disabled={isDownloadDisabled || !fileStatus.filesReady}
          className="flex-1 min-w-[120px]"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </Button>

        {showRegenerateOption && (
          <Button
            variant="secondary"
            onClick={handleRegenerateFiles}
            disabled={isRegenerating}
            className="min-w-[120px]"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Files
              </>
            )}
          </Button>
        )}
        
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
        
        {fileStatus.filesReady ? (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle className="h-3 w-3" />
            <span>
              ⚡ Files ready for instant download
              {fileStatus.fileSizeBytes && ` (${formatFileSize(fileStatus.fileSizeBytes)})`}
            </span>
            {fileStatus.fileGeneratedAt && (
              <span className="text-xs text-gray-500 ml-2">
                Generated: {formatDate(fileStatus.fileGeneratedAt)}
              </span>
            )}
          </div>
        ) : showRegenerateOption ? (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-3 w-3" />
            <span>Files not available - click "Generate Files" to create them</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-blue-600">
            <span>Files will be generated automatically when processing completes</span>
          </div>
        )}

        {lastChecked && (
          <div className="flex items-center gap-2 justify-between">
            <span className="text-xs text-gray-400">
              Status checked: {lastChecked.toLocaleTimeString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkFileStatus}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default FastDownloadActions;
