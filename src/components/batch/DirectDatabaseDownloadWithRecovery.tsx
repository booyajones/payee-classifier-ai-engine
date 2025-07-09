import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { mapResultsToOriginalRows } from '@/lib/rowMapping/mapper';
import { PayeeRowData } from '@/lib/rowMapping/types';

interface DirectDatabaseDownloadWithRecoveryProps {
  jobId: string;
  className?: string;
}

const DirectDatabaseDownloadWithRecovery = ({ jobId, className }: DirectDatabaseDownloadWithRecoveryProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!jobId) return;

    setIsDownloading(true);
    try {
      console.log(`[ENHANCED DOWNLOAD] Starting download for job ${jobId}`);
      
      // Step 1: Fetch the complete batch job
      const { data: batchJob, error: batchError } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (batchError || !batchJob) {
        throw new Error(`Failed to fetch batch job: ${batchError?.message || 'Job not found'}`);
      }

      // Step 2: Check for existing classification results
      let { data: classifications, error: classError } = await supabase
        .from('payee_classifications')
        .select('*')
        .eq('batch_id', jobId)
        .order('row_index');

      if (classError) {
        throw new Error(`Failed to fetch classifications: ${classError.message}`);
      }

      // Step 3: If no results found, try emergency recovery
      if (!classifications || classifications.length === 0) {
        console.log(`[ENHANCED DOWNLOAD] No results found for job ${jobId}, attempting emergency processing...`);
        
        try {
          const { EmergencyResultRecovery } = await import('@/lib/services/emergencyResultRecovery');
          const processed = await EmergencyResultRecovery.ensureJobHasResults(jobId);
          
          if (!processed) {
            throw new Error('No classification results found and automatic recovery failed');
          }
          
          console.log(`[ENHANCED DOWNLOAD] Emergency processing successful, retrying fetch...`);
          
          // Retry fetching results after processing
          const { data: retryClassifications, error: retryError } = await supabase
            .from('payee_classifications')
            .select('*')
            .eq('batch_id', jobId)
            .order('row_index');
            
          if (retryError || !retryClassifications || retryClassifications.length === 0) {
            throw new Error('Emergency processing completed but still no results found');
          }
          
          classifications = retryClassifications;
        } catch (recoveryError) {
          console.error(`[ENHANCED DOWNLOAD] Emergency recovery failed:`, recoveryError);
          throw new Error('No classification results found for this job');
        }
      }

      console.log(`[ENHANCED DOWNLOAD] Found ${classifications.length} classifications for ${(batchJob.original_file_data as any[]).length} original rows`);

      // Step 4: Reconstruct the PayeeRowData structure
      const payeeRowData: PayeeRowData = {
        uniquePayeeNames: batchJob.unique_payee_names || [],
        uniqueNormalizedNames: batchJob.unique_payee_names || [],
        originalFileData: batchJob.original_file_data as any[],
        rowMappings: batchJob.row_mappings as any[],
        standardizationStats: {
          totalProcessed: (batchJob.unique_payee_names || []).length,
          changesDetected: 0,
          averageStepsPerName: 0,
          mostCommonSteps: []
        }
      };

      // Step 5: Convert database classifications to expected format
      const classificationResults = batchJob.unique_payee_names.map((payeeName: string, index: number) => {
        const dbClassification = classifications.find(c => 
          c.payee_name === payeeName || c.row_index === index
        );
        
        if (!dbClassification) {
          console.warn(`[ENHANCED DOWNLOAD] No classification found for payee "${payeeName}"`);
          return {
            id: `missing-${index}`,
            payeeName,
            result: {
              classification: 'Individual',
              confidence: 0,
              reasoning: 'No classification result found',
              processingTier: 'Failed'
            },
            timestamp: new Date(),
            is_potential_duplicate: false,
            duplicate_of_payee_id: null,
            duplicate_confidence_score: 0,
            duplicate_detection_method: 'Not Analyzed',
            duplicate_group_id: null,
            ai_duplicate_reasoning: null
          };
        }

        return {
          id: dbClassification.id,
          payeeName: dbClassification.payee_name,
          result: {
            classification: dbClassification.classification,
            confidence: dbClassification.confidence,
            reasoning: dbClassification.reasoning,
            processingTier: dbClassification.processing_tier,
            processingMethod: dbClassification.processing_method,
            sicCode: dbClassification.sic_code,
            sicDescription: dbClassification.sic_description,
            keywordExclusion: dbClassification.keyword_exclusion,
            similarityScores: dbClassification.similarity_scores,
            matchingRules: dbClassification.matching_rules
          },
          timestamp: new Date(dbClassification.created_at),
          originalData: dbClassification.original_data,
          rowIndex: dbClassification.row_index,
          is_potential_duplicate: dbClassification.is_potential_duplicate || false,
          duplicate_of_payee_id: dbClassification.duplicate_of_payee_id,
          duplicate_confidence_score: dbClassification.duplicate_confidence_score || 0,
          duplicate_detection_method: dbClassification.duplicate_detection_method || 'Not Analyzed',
          duplicate_group_id: dbClassification.duplicate_group_id,
          ai_duplicate_reasoning: dbClassification.ai_duplicate_reasoning
        };
      });

      // Step 6: Map results to original rows
      const completeResults = mapResultsToOriginalRows(classificationResults, payeeRowData);
      
      if (completeResults.length === 0) {
        throw new Error('No mapped results generated');
      }

      // Step 7: Generate and download CSV
      const allColumns = Object.keys(completeResults[0]);
      const csvHeader = allColumns.map(col => `"${col}"`).join(',') + '\n';
      
      const csvRows = completeResults.map(row => {
        return allColumns.map(col => {
          const value = row[col];
          const stringValue = typeof value === 'object' && value !== null ? 
            JSON.stringify(value) : String(value || '');
          return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',');
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced_results_${jobId.substring(0, 8)}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`[ENHANCED DOWNLOAD] CSV downloaded with ${completeResults.length} rows and ${allColumns.length} columns`);
      
      toast({
        title: "Download Successful",
        description: `✅ Downloaded ${completeResults.length} complete rows with automatic recovery`,
      });
      
    } catch (error) {
      console.error('[ENHANCED DOWNLOAD] Download failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isDownloading}
      className={className}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </>
      )}
    </Button>
  );
};

export default DirectDatabaseDownloadWithRecovery;