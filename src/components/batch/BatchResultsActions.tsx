
import React from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Download, Clock } from "lucide-react";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PreGeneratedFileService } from "@/lib/storage/preGeneratedFileService";
import { useEnhancedDownload } from "@/hooks/useEnhancedDownload";
import { useDownloadProgress } from "@/contexts/DownloadProgressContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AutomaticFileGenerationService } from "@/lib/services/automaticFileGenerationService";

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

  const [isCheckingFiles, setIsCheckingFiles] = React.useState(false);
  const [isGeneratingFiles, setIsGeneratingFiles] = React.useState(false);

  React.useEffect(() => {
    if (jobId) {
      setIsCheckingFiles(true);
      const checkPreGeneratedFiles = async () => {
        try {
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
        } catch (error) {
          console.error('Error checking pre-generated files:', error);
        } finally {
          setIsCheckingFiles(false);
        }
      };

      checkPreGeneratedFiles();
    }
  }, [jobId]);

  const handleDownload = async (format: 'csv' | 'excel') => {
    const url = format === 'csv' ? preGeneratedFiles.csvUrl : preGeneratedFiles.excelUrl;
    
    // If pre-generated files exist, download instantly
    if (url) {
      try {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `payee_results_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
        
        await PreGeneratedFileService.downloadFileFromStorage(url, filename);
        
        toast({
          title: "Download Complete",
          description: `${filename} downloaded successfully`,
        });
        return;
      } catch (error) {
        console.error('Instant download failed, falling back to generation:', error);
      }
    }

    // If no pre-generated files, generate them and then download
    if (jobId && !isGeneratingFiles) {
      setIsGeneratingFiles(true);
      try {
        toast({
          title: "Preparing Download",
          description: "Generating files for download...",
        });

        // Get the batch job data for file generation
        const { data: jobData, error } = await supabase
          .from('batch_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error || !jobData) {
          throw new Error('Failed to fetch job data');
        }

        // Safely parse metadata
        let parsedMetadata: { payee_count: number; description: string } | undefined;
        
        if (jobData.metadata) {
          try {
            const metadataValue = typeof jobData.metadata === 'string' 
              ? JSON.parse(jobData.metadata) 
              : jobData.metadata;
            
            parsedMetadata = {
              payee_count: metadataValue?.payee_count || 0,
              description: metadataValue?.description || 'Payee classification batch'
            };
          } catch (error) {
            parsedMetadata = {
              payee_count: 0,
              description: 'Payee classification batch'
            };
          }
        }

        const batchJob: BatchJob = {
          id: jobData.id,
          status: jobData.status as BatchJob['status'], // Type assertion to fix the status type
          created_at: jobData.created_at_timestamp,
          request_counts: {
            total: jobData.request_counts_total,
            completed: jobData.request_counts_completed,
            failed: jobData.request_counts_failed
          },
          in_progress_at: jobData.in_progress_at_timestamp,
          finalizing_at: jobData.finalizing_at_timestamp,
          completed_at: jobData.completed_at_timestamp,
          failed_at: jobData.failed_at_timestamp,
          expired_at: jobData.expired_at_timestamp,
          cancelled_at: jobData.cancelled_at_timestamp,
          metadata: parsedMetadata,
          errors: jobData.errors ? (typeof jobData.errors === 'string' ? JSON.parse(jobData.errors) : jobData.errors) : undefined,
          output_file_id: jobData.output_file_id || undefined
        };

        // Generate files
        await AutomaticFileGenerationService.processCompletedJob(batchJob);

        // Refresh file status
        const { data: updatedData } = await supabase
          .from('batch_jobs')
          .select('csv_file_url, excel_file_url')
          .eq('id', jobId)
          .single();

        if (updatedData) {
          const newUrl = format === 'csv' ? updatedData.csv_file_url : updatedData.excel_file_url;
          if (newUrl) {
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `payee_results_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
            await PreGeneratedFileService.downloadFileFromStorage(newUrl, filename);
            
            toast({
              title: "Download Complete",
              description: `${filename} downloaded successfully`,
            });
            
            // Update local state
            setPreGeneratedFiles(prev => ({
              ...prev,
              csvUrl: updatedData.csv_file_url || prev.csvUrl,
              excelUrl: updatedData.excel_file_url || prev.excelUrl
            }));
          } else {
            throw new Error('File generation completed but no URL available');
          }
        }
      } catch (error) {
        console.error('File generation and download failed:', error);
        
        // Fallback to standard download
        if (processingSummary) {
          await downloadFile(processingSummary, format);
        } else {
          toast({
            title: "Download Failed",
            description: "Unable to download file. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setIsGeneratingFiles(false);
      }
    }
  };

  const isDownloadDisabled = isProcessing || !processingSummary || batchResults.length === 0;
  const hasPreGeneratedFiles = preGeneratedFiles.csvUrl && preGeneratedFiles.excelUrl;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="default"
          onClick={() => handleDownload('csv')}
          disabled={isDownloadDisabled || isGeneratingFiles}
          className="flex-1 min-w-[120px]"
        >
          {isCheckingFiles || isGeneratingFiles ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              {isGeneratingFiles ? 'Generating...' : 'Checking...'}
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
          disabled={isDownloadDisabled || isGeneratingFiles}
          className="flex-1 min-w-[120px]"
        >
          {isCheckingFiles || isGeneratingFiles ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              {isGeneratingFiles ? 'Generating...' : 'Checking...'}
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
      
      <div className="text-xs text-muted-foreground mt-2 space-y-1">
        <p>CSV and Excel files include SIC codes and descriptions for business classifications.</p>
        
        {hasPreGeneratedFiles && (
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <Clock className="h-3 w-3" />
            <span>⚡ Files ready for instant download</span>
          </div>
        )}

        {!hasPreGeneratedFiles && !isCheckingFiles && (
          <div className="flex items-center gap-2 text-blue-600">
            <span>Files will be generated automatically on first download</span>
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
