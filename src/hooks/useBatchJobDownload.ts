
import { useCallback } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import { processDownloadResults, saveProcessedResults } from '@/hooks/batch/downloadProcessor';
import { useToast } from '@/hooks/use-toast';
import { useDownloadProgress } from '@/contexts/DownloadProgressContext';
import { AutomaticResultProcessor } from '@/lib/services/automaticResultProcessor';

interface UseBatchJobDownloadProps {
  payeeRowDataMap: Record<string, PayeeRowData>;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
}

export const useBatchJobDownload = ({
  payeeRowDataMap,
  onJobComplete
}: UseBatchJobDownloadProps) => {
  const { toast } = useToast();
  const { startDownload, updateDownload, completeDownload, clearDownload, clearAllDownloads } = useDownloadProgress();

  const handleDownloadResults = useCallback(async (job: BatchJob) => {
    const payeeData = payeeRowDataMap[job.id];
    if (!payeeData) {
      console.error(`[BATCH DOWNLOAD] No payee data found for job ${job.id}`);
      return;
    }

    // Generate unique download ID using timestamp to avoid conflicts
    const downloadId = `batch-${job.id}-${Date.now()}`;
    const filename = `batch-results-${job.id.substring(0, 8)}.csv`;
    const totalPayees = payeeData.uniquePayeeNames.length;

    try {
      console.log(`[BATCH DOWNLOAD] Starting download for job ${job.id}`);
      console.log(`[BATCH DOWNLOAD] Download ID: ${downloadId}, Filename: ${filename}, Total payees: ${totalPayees}`);
      
      // Clear any stale downloads first to prevent old error states
      clearAllDownloads();
      
      // Start the download progress tracking
      startDownload(downloadId, filename, totalPayees);
      console.log(`[BATCH DOWNLOAD] Download progress tracking started`);
      
      // ENHANCED RECOVERY: Check if results are already processed for instant download
      console.log(`[BATCH DOWNLOAD] Checking for pre-processed results for job ${job.id}`);
      const hasPreProcessed = await AutomaticResultProcessor.hasPreProcessedResults(job.id);
      
      if (hasPreProcessed) {
        console.log(`[BATCH DOWNLOAD] Using pre-processed results for instant download of job ${job.id}`);
        
        // Add a small delay to ensure progress is visible for instant downloads
        await new Promise(resolve => setTimeout(resolve, 500));
        
        updateDownload(downloadId, { 
          stage: 'Loading pre-processed results', 
          progress: 50,
          processed: Math.floor(totalPayees * 0.5),
          total: totalPayees 
        });
        
        // Add another small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get pre-processed results
        const preProcessedResults = await AutomaticResultProcessor.getPreProcessedResults(job.id);
        
        if (preProcessedResults) {
          updateDownload(downloadId, { 
            stage: 'Finalizing download', 
            progress: 90,
            processed: Math.floor(totalPayees * 0.9),
          });
          
          // Final delay before completion
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Convert database results to PayeeClassification format
          const finalClassifications: PayeeClassification[] = preProcessedResults.map(r => ({
            id: r.id,
            payeeName: r.payee_name,
            result: r.classification as any,
            timestamp: new Date(r.created_at)
          }));
          
          const summary: BatchProcessingResult = {
            results: finalClassifications,
            successCount: finalClassifications.length,
            failureCount: 0,
            originalFileData: payeeData.originalFileData
          };
          
          // Complete the download progress
          completeDownload(downloadId);
          
          // Complete the job with pre-processed results
          onJobComplete(finalClassifications, summary, job.id);
          
          toast({
            title: "Instant Download Complete",
            description: `⚡ Loaded ${finalClassifications.length} pre-processed results instantly!`,
          });
          
          return;
        } else {
          console.log(`[BATCH DOWNLOAD] No pre-processed results found for job ${job.id}, checking if recovery is needed`);
          
          // ENHANCED RECOVERY: Check if this completed job has missing results
          const { DownloadRecoveryService } = await import('@/lib/services/downloadRecoveryService');
          const hasStoredResults = await DownloadRecoveryService.hasStoredResults(job.id);
          
          if (!hasStoredResults && job.status === 'completed') {
            console.log(`[BATCH DOWNLOAD] ⚠️ Completed job ${job.id} has no stored results - attempting recovery`);
            
            updateDownload(downloadId, { 
              stage: 'Recovering missing results...', 
              progress: 10,
              processed: 0,
              total: totalPayees 
            });
            
            const recoveryResult = await DownloadRecoveryService.recoverJobResults(job);
            
            if (recoveryResult.success) {
              console.log(`[BATCH DOWNLOAD] ✅ Successfully recovered ${recoveryResult.processedCount} results for job ${job.id}`);
              
              updateDownload(downloadId, { 
                stage: 'Recovery complete - checking for results...', 
                progress: 30 
              });
              
              // Try to get pre-processed results again after recovery
              const recoveredResults = await AutomaticResultProcessor.getPreProcessedResults(job.id);
              
              if (recoveredResults && recoveredResults.length > 0) {
                console.log(`[BATCH DOWNLOAD] Using recovered results for job ${job.id}`);
                
                updateDownload(downloadId, { 
                  stage: 'Finalizing recovered results', 
                  progress: 90,
                  processed: recoveredResults.length,
                  total: totalPayees 
                });
                
                const finalClassifications: PayeeClassification[] = recoveredResults.map(r => ({
                  id: r.id,
                  payeeName: r.payee_name,
                  result: r.classification as any,
                  timestamp: new Date(r.created_at)
                }));
                
                const summary: BatchProcessingResult = {
                  results: finalClassifications,
                  successCount: finalClassifications.length,
                  failureCount: 0,
                  originalFileData: payeeData.originalFileData
                };
                
                completeDownload(downloadId);
                onJobComplete(finalClassifications, summary, job.id);
                
                toast({
                  title: "Recovery Successful",
                  description: `🔄 Recovered and loaded ${finalClassifications.length} results for completed job!`,
                });
                
                return;
              }
            } else {
              console.error(`[BATCH DOWNLOAD] Recovery failed for job ${job.id}:`, recoveryResult.error);
              
              // Continue to fallback processing
              updateDownload(downloadId, { 
                stage: 'Recovery failed - attempting full processing...', 
                progress: 5 
              });
            }
          }
        }
      }
      
      // Fallback to full processing if no pre-processed results available
      updateDownload(downloadId, { 
        stage: 'Downloading from OpenAI', 
        progress: 5,
        processed: 0,
        total: totalPayees 
      });

      const { finalClassifications, summary } = await processDownloadResults(
        {
          job,
          payeeData,
          uniquePayeeNames: payeeData.uniquePayeeNames,
          onJobComplete
        },
        (processed, total, percentage) => {
          console.log(`[BATCH DOWNLOAD] Progress: ${processed}/${total} (${percentage}%)`);
          updateDownload(downloadId, {
            stage: percentage < 50 ? 'Processing classifications' : 'Applying keyword exclusions',
            progress: Math.min(70, 20 + (percentage * 0.5)), // Progress from 20% to 70%
            processed,
            total
          });
        }
      );

      // Update progress for database save
      updateDownload(downloadId, { 
        stage: 'Saving to database', 
        progress: 75,
        processed: finalClassifications.length,
        total: totalPayees 
      });

      // Save results to database
      const saveResult = await saveProcessedResults(finalClassifications, job.id);
      
      if (!saveResult.success) {
        console.error('[BATCH DOWNLOAD] Database save failed:', saveResult.error);
        updateDownload(downloadId, { 
          error: saveResult.error || "Database save failed",
          isActive: false,
          canCancel: false 
        });
        toast({
          title: "Warning",
          description: saveResult.error || "Database save failed",
          variant: "destructive",
        });
        return;
      }

      // Update progress for file generation
      updateDownload(downloadId, { 
        stage: 'Generating download files', 
        progress: 85 
      });

      // Enhanced automatic file generation for instant future downloads
      console.log(`[BATCH DOWNLOAD] Triggering enhanced file generation for job ${job.id}`);
      const fileGenResult = await EnhancedFileGenerationService.processCompletedJob(job);
      
      if (fileGenResult.success) {
        console.log(`[BATCH DOWNLOAD] Files generated successfully for job ${job.id}`);
      } else {
        console.warn(`[BATCH DOWNLOAD] File generation failed for job ${job.id}:`, fileGenResult.error);
      }

      // Complete the download progress
      completeDownload(downloadId);

      // Complete the job
      onJobComplete(finalClassifications, summary, job.id);

      toast({
        title: "Processing Complete",
        description: `✅ Successfully processed ${finalClassifications.length} payee classifications. Click the Download CSV button to save results.`,
      });

    } catch (error) {
      console.error(`[BATCH DOWNLOAD] Download failed for job ${job.id}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      updateDownload(downloadId, { 
        error: `Job ${job.id.substring(0, 8)}: ${errorMessage}`,
        isActive: false,
        canCancel: false 
      });
      
      toast({
        title: "Download Failed",
        description: `Job ${job.id.substring(0, 8)}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [payeeRowDataMap, onJobComplete, toast, startDownload, updateDownload, completeDownload, clearAllDownloads]);

  return {
    handleDownloadResults
  };
};
