import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PreGeneratedFileService } from '@/lib/storage/preGeneratedFileService';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { convertToBatchJob } from '@/lib/utils/batchJobConverter';
import { generateBatchJobName } from '@/lib/services/batchJobName';
import { BatchProcessingResult } from '@/lib/types';

export const useEnhancedDownloadWithNaming = (
  fileStatus: { csvUrl?: string; excelUrl?: string },
  setFileStatus: (status: any) => void,
  jobId?: string,
  processingSummary?: BatchProcessingResult | null
) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const getCleverFileName = async (format: 'csv' | 'excel'): Promise<string> => {
    if (!jobId) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      return `payee_results_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    }

    try {
      // Get job metadata for clever naming
      const { data: jobData } = await supabase
        .from('batch_jobs')
        .select('metadata, created_at_timestamp')
        .eq('id', jobId)
        .single();

      if (jobData) {
        const metadata = jobData.metadata ? (typeof jobData.metadata === 'string' ? JSON.parse(jobData.metadata) : jobData.metadata) : {};
        const cleverName = generateBatchJobName({
          payeeCount: metadata?.payee_count || 0,
          fileName: metadata?.description || 'Batch Classification',
          uploadTime: new Date(jobData.created_at_timestamp * 1000)
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const cleanName = cleverName.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${cleanName}_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      }
    } catch (error) {
      console.error('Error generating clever filename:', error);
    }

    // Fallback
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `payee_results_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
  };

  const handleDownload = async (format: 'csv' | 'excel') => {
    const url = format === 'csv' ? fileStatus.csvUrl : fileStatus.excelUrl;
    const filename = await getCleverFileName(format);
    
    // If pre-generated files exist, download instantly
    if (url) {
      try {
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
          description: `Generating ${filename}...`,
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

        // Generate files with clever naming
        const result = await EnhancedFileGenerationService.processCompletedJob(batchJob);

        if (!result.success) {
          throw new Error(result.error || 'File generation failed');
        }

        // Download the generated file
        const downloadUrl = format === 'csv' ? result.fileUrls?.csvUrl : result.fileUrls?.excelUrl;

        if (downloadUrl) {
          await PreGeneratedFileService.downloadFileFromStorage(downloadUrl, filename);
          
          toast({
            title: "Download Complete",
            description: `${filename} downloaded successfully`,
          });
          
          // Update local state
          setFileStatus((prev: any) => ({
            ...prev,
            csvUrl: result.fileUrls?.csvUrl || prev.csvUrl,
            excelUrl: result.fileUrls?.excelUrl || prev.excelUrl
          }));
        } else {
          throw new Error('File generation completed but no URL available');
        }
      } catch (error) {
        console.error('File generation and download failed:', error);
        
        toast({
          title: "Download Failed",
          description: `Unable to generate ${filename}. Please try again.`,
          variant: "destructive",
        });
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