
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PreGeneratedFileService } from '@/lib/storage/preGeneratedFileService';
import { AutomaticFileGenerationService } from '@/lib/services/automaticFileGenerationService';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { convertToBatchJob } from '@/lib/utils/batchJobConverter';
import { useEnhancedDownload } from './useEnhancedDownload';
import { BatchProcessingResult } from '@/lib/types';

export const useDownloadHandler = (
  fileStatus: { csvUrl?: string; excelUrl?: string },
  setFileStatus: (status: any) => void,
  jobId?: string,
  processingSummary?: BatchProcessingResult | null
) => {
  const { toast } = useToast();
  const { downloadFile } = useEnhancedDownload();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async (format: 'csv' | 'excel') => {
    const url = format === 'csv' ? fileStatus.csvUrl : fileStatus.excelUrl;
    
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
    if (jobId && !isGenerating) {
      setIsGenerating(true);
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

        const batchJob = convertToBatchJob(jobData);

        // Generate files
        await AutomaticFileGenerationService.processCompletedJob(batchJob);

        // Wait for files to become available
        const startTime = Date.now();
        const timeoutMs = 20000; // 20 seconds
        let status;
        while (Date.now() - startTime < timeoutMs) {
          status = await EnhancedFileGenerationService.getFileStatus(jobId);
          if (status.csvUrl && status.excelUrl) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (status && status.csvUrl && status.excelUrl) {
          const newUrl = format === 'csv' ? status.csvUrl : status.excelUrl;
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `payee_results_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
          await PreGeneratedFileService.downloadFileFromStorage(newUrl, filename);

          toast({
            title: "Download Complete",
            description: `${filename} downloaded successfully`,
          });

          setFileStatus((prev: any) => ({
            ...prev,
            csvUrl: status?.csvUrl || prev.csvUrl,
            excelUrl: status?.excelUrl || prev.excelUrl
          }));
        } else {
          throw new Error('Timed out waiting for file URLs');
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
        setIsGenerating(false);
      }
    }
  };

  return {
    handleDownload,
    isGenerating
  };
};
