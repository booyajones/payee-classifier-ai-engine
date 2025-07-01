
import React from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Download, Clock } from "lucide-react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PreGeneratedFileService } from "@/lib/storage/preGeneratedFileService";
import { useEnhancedDownload } from "@/hooks/useEnhancedDownload";
import { useDownloadProgress } from "@/contexts/DownloadProgressContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BatchResultsActionsProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
  isDownloading?: boolean;
  jobId?: string;
}

const BatchResultsActions = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing,
  jobId
}: BatchResultsActionsProps) => {
  const { downloadFile } = useEnhancedDownload();
  const { getActiveDownloads } = useDownloadProgress();
  const { toast } = useToast();
  
  const activeDownloads = getActiveDownloads();
  const hasActiveDownloads = activeDownloads.length > 0;

  // Check if pre-generated files exist
  const [preGeneratedFiles, setPreGeneratedFiles] = React.useState<{
    csvUrl?: string;
    excelUrl?: string;
    fileGeneratedAt?: string;
    fileSizeBytes?: number;
  }>({});

  React.useEffect(() => {
    if (jobId) {
      // Check for pre-generated files
      const checkPreGeneratedFiles = async () => {
        const { data, error } = await supabase
          .from('batch_jobs')
          .select('csv_file_url, excel_file_url, file_generated_at, file_size_bytes')
          .eq('id', jobId)
          .single();

        if (!error && data) {
          setPreGeneratedFiles({
            csvUrl: data.csv_file_url || undefined,
            excelUrl: data.excel_file_url || undefined,
            fileGeneratedAt: data.file_generated_at || undefined,
            fileSizeBytes: data.file_size_bytes || undefined
          });
        }
      };

      checkPreGeneratedFiles();
    }
  }, [jobId]);

  const handleInstantDownload = async (format: 'csv' | 'excel') => {
    const url = format === 'csv' ? preGeneratedFiles.csvUrl : preGeneratedFiles.excelUrl;
    
    if (!url) {
      toast({
        title: "File Not Available",
        description: "Pre-generated file not found. Generating new file...",
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
      console.error('Instant download failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download pre-generated file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFallbackDownload = async (format: 'csv' | 'excel') => {
    if (!processingSummary || batchResults.length === 0) return;
    await downloadFile(processingSummary, format);
  };

  const isDownloadDisabled = isProcessing || !processingSummary || batchResults.length === 0;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const hasPreGeneratedFiles = preGeneratedFiles.csvUrl && preGeneratedFiles.excelUrl;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {hasPreGeneratedFiles ? (
          <>
            {/* Instant Download Buttons */}
            <Button
              variant="default"
              onClick={() => handleInstantDownload('csv')}
              disabled={isDownloadDisabled}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV (Instant)
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleInstantDownload('excel')}
              disabled={isDownloadDisabled}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel (Instant)
            </Button>
          </>
        ) : (
          <>
            {/* Fallback to real-time generation */}
            <Button
              variant="default"
              onClick={() => handleFallbackDownload('csv')}
              disabled={isDownloadDisabled}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleFallbackDownload('excel')}
              disabled={isDownloadDisabled}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          </>
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
        
        {hasPreGeneratedFiles && (
          <div className="flex items-center gap-2 text-green-600">
            <Clock className="h-3 w-3" />
            <span>
              Instant download available • {formatFileSize(preGeneratedFiles.fileSizeBytes)} • 
              Generated {formatDate(preGeneratedFiles.fileGeneratedAt)}
            </span>
          </div>
        )}
        
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
