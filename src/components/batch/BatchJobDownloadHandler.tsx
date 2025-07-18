import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { getBatchJobResults } from '@/lib/openai/trueBatchAPI';
import { generateDownloadFilename } from '@/lib/utils/batchIdentifierGenerator';
import { PayeeRowData } from '@/lib/rowMapping';
import { useToast } from '@/hooks/use-toast';

interface BatchJobDownloadHandlerProps {
  payeeDataMap: Record<string, PayeeRowData>;
}

export const useBatchJobDownloadHandler = ({ payeeDataMap }: BatchJobDownloadHandlerProps) => {
  const { toast } = useToast();

  const handleDownload = async (job: BatchJob) => {
    if (job.status !== 'completed') {
      toast({
        title: "Job Not Complete",
        description: "Job must be completed before downloading results",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`[DOWNLOAD] Starting enhanced download for job ${job.id}`);
      
      const payeeData = payeeDataMap[job.id];
      if (!payeeData) {
        console.error(`[DOWNLOAD] No payee data found for job ${job.id} - attempting recovery`);
        
        // ENHANCED RECOVERY: Try to recover missing payee data and results
        const { DownloadRecoveryService } = await import('@/lib/services/downloadRecoveryService');
        
        // Check if the job has stored results first
        const hasStoredResults = await DownloadRecoveryService.hasStoredResults(job.id);
        
        if (!hasStoredResults) {
          console.log(`[DOWNLOAD] Job ${job.id} has no stored results - attempting full recovery`);
          const recoveryResult = await DownloadRecoveryService.recoverJobResults(job);
          
          if (!recoveryResult.success) {
            throw new Error(`Recovery failed: ${recoveryResult.error}`);
          }
          
          console.log(`[DOWNLOAD] ✅ Recovery successful for job ${job.id} - ${recoveryResult.processedCount} results processed`);
          
          toast({
            title: "Recovery Complete",
            description: `🔄 Successfully recovered ${recoveryResult.processedCount} results. Proceeding with download...`,
          });
        }
        
        // After recovery, we still need payee data for mapping, so this is still an error
        throw new Error('Payee data not found for this job - unable to generate complete download');
      }

      // Get raw OpenAI results
      const rawResults = await getBatchJobResults(job, payeeData.uniquePayeeNames);
      console.log(`[DOWNLOAD] Retrieved ${rawResults.length} raw results from OpenAI`);
      
      // Process through enhanced pipeline to get properly formatted results
      const { processEnhancedBatchResults } = await import('@/services/batchProcessor/enhancedProcessor');
      const { finalClassifications } = await processEnhancedBatchResults({
        rawResults: rawResults.map(r => ({ result: r })), // Convert to expected format
        uniquePayeeNames: payeeData.uniquePayeeNames,
        payeeData,
        job
      });
      
      console.log(`[DOWNLOAD] Processed ${finalClassifications.length} enhanced results`);
      
      // Map results to original rows with ALL DATA PRESERVATION
      const { mapResultsToOriginalRows } = await import('@/lib/rowMapping/resultMapper');
      const mappedResults = mapResultsToOriginalRows(finalClassifications, payeeData);
      
      console.log(`[DOWNLOAD] Mapped to ${mappedResults.length} complete rows with original data`);
      
      // Create comprehensive CSV with ALL original columns + classification data
      if (mappedResults.length === 0) {
        throw new Error('No results to download');
      }
      
      // Get all column headers (original + new classification columns)
      const allColumns = Object.keys(mappedResults[0]);
      console.log(`[DOWNLOAD] Creating CSV with ${allColumns.length} total columns`);
      
      // Create CSV header
      const csvHeader = allColumns.map(col => `"${col}"`).join(',') + '\n';
      
      // Create CSV rows with ALL data
      const csvRows = mappedResults.map(row => {
        return allColumns.map(col => {
          const value = row[col] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = generateDownloadFilename('complete_results', job.id, 'csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Complete Results Downloaded",
        description: `Downloaded ${mappedResults.length} rows with ${allColumns.length} columns (original + AI classifications)`,
      });
      
      console.log(`[DOWNLOAD] Successfully downloaded complete results with data integrity preserved`);
      
    } catch (error) {
      console.error('[DOWNLOAD] Failed to download results:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Failed to download results',
        variant: "destructive"
      });
    }
  };

  return { handleDownload };
};