
import { useCallback } from 'react';
import { useDownloadProgress } from '@/contexts/DownloadProgressContext';
import { backgroundDownloadProcessor } from '@/lib/download/backgroundDownloadProcessor';
import { BatchProcessingResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useEnhancedDownload = () => {
  const { startDownload, updateDownload, completeDownload, cancelDownload } = useDownloadProgress();
  const { toast } = useToast();

  const downloadFile = useCallback(async (
    batchResult: BatchProcessingResult,
    format: 'csv' | 'excel'
  ) => {
    const downloadId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalItems = batchResult.results.length;
    const filename = `payee_results_${format}`;

    try {
      // Start download tracking
      startDownload(downloadId, filename, totalItems);

      // Process download with progress updates
      const result = await backgroundDownloadProcessor.processDownload(
        downloadId,
        batchResult,
        {
          format,
          onProgress: (processed, total, stage) => {
            updateDownload(downloadId, {
              progress: (processed / total) * 100,
              stage,
              processed,
              total
            });
          }
        }
      );

      if (result.success && result.blob && result.filename) {
        // Complete download and trigger file download
        completeDownload(downloadId);
        
        // Create download link
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Download Complete",
          description: `Successfully downloaded ${result.filename}`,
        });
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      console.error('[ENHANCED DOWNLOAD] Error:', error);
      updateDownload(downloadId, {
        error: error instanceof Error ? error.message : 'Download failed',
        isActive: false,
        canCancel: false
      });

      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  }, [startDownload, updateDownload, completeDownload, toast]);

  const handleCancelDownload = useCallback((downloadId: string) => {
    backgroundDownloadProcessor.cancelDownload(downloadId);
    cancelDownload(downloadId);
    
    toast({
      title: "Download Cancelled",
      description: "The download has been cancelled successfully",
    });
  }, [cancelDownload, toast]);

  return {
    downloadFile,
    cancelDownload: handleCancelDownload
  };
};
