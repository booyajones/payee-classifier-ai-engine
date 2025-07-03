import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { mapResultsToOriginalRows } from '@/lib/rowMapping/mapper';
import { createMappedRow } from '@/lib/rowMapping/rowCreator';
import { PayeeRowData } from '@/lib/rowMapping/types';

interface DirectDatabaseDownloadProps {
  jobId: string;
  className?: string;
}

const DirectDatabaseDownload = ({ jobId, className }: DirectDatabaseDownloadProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!jobId) return;

    setIsDownloading(true);
    try {
      console.log(`[COMPLETE DOWNLOAD] Fetching complete job data for ${jobId}`);
      
      // Step 1: Fetch the complete batch job with original file data and row mappings
      const { data: batchJob, error: batchError } = await supabase
        .from('batch_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (batchError || !batchJob) {
        throw new Error(`Failed to fetch batch job: ${batchError?.message || 'Job not found'}`);
      }

      // Step 2: Fetch all classification results for this job
      const { data: classifications, error: classError } = await supabase
        .from('payee_classifications')
        .select('*')
        .eq('batch_id', jobId)
        .order('row_index');

      if (classError) {
        throw new Error(`Failed to fetch classifications: ${classError.message}`);
      }

      if (!classifications || classifications.length === 0) {
        throw new Error('No classification results found for this job');
      }

      console.log(`[COMPLETE DOWNLOAD] Found ${classifications.length} classifications, ${(batchJob.original_file_data as any[]).length} original rows`);

      // Step 3: Reconstruct the PayeeRowData structure
      const payeeRowData: PayeeRowData = {
        uniquePayeeNames: batchJob.unique_payee_names || [],
        uniqueNormalizedNames: batchJob.unique_payee_names || [], // Fallback to original names
        originalFileData: batchJob.original_file_data as any[],
        rowMappings: batchJob.row_mappings as any[],
        standardizationStats: {
          totalProcessed: (batchJob.unique_payee_names || []).length,
          changesDetected: 0,
          averageStepsPerName: 0,
          mostCommonSteps: []
        }
      };

      // Step 4: Convert database classifications back to the expected format
      const classificationResults = batchJob.unique_payee_names.map((payeeName: string, index: number) => {
        const dbClassification = classifications.find(c => 
          c.payee_name === payeeName || c.row_index === index
        );
        
        if (!dbClassification) {
          console.warn(`[COMPLETE DOWNLOAD] No classification found for payee "${payeeName}"`);
          return {
            id: `missing-${index}`,
            payeeName,
            result: {
              classification: 'Individual',
              confidence: 0,
              reasoning: 'No classification result found',
              processingTier: 'Failed'
            },
            timestamp: new Date()
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
          rowIndex: dbClassification.row_index
        };
      });

      console.log(`[COMPLETE DOWNLOAD] Reconstructed ${classificationResults.length} classification results`);

      // Step 5: Use the proper row mapping to restore ALL original data + AI analysis
      const completeResults = mapResultsToOriginalRows(classificationResults, payeeRowData);
      
      console.log(`[COMPLETE DOWNLOAD] Mapped to ${completeResults.length} complete rows with original + AI data`);

      // Step 6: Generate CSV with ALL columns (original + AI analysis)
      if (completeResults.length === 0) {
        throw new Error('No mapped results generated');
      }

      // Get all column names from the first complete result
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
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `complete_results_${jobId.substring(0, 8)}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`[COMPLETE DOWNLOAD] CSV downloaded with ${completeResults.length} rows and ${allColumns.length} columns`);
      console.log(`[COMPLETE DOWNLOAD] Columns included:`, allColumns);
      
      toast({
        title: "Complete Download Successful",
        description: `✅ Downloaded ${completeResults.length} complete rows with ${allColumns.length} columns (original data + AI analysis)`,
      });
      
    } catch (error) {
      console.error('[COMPLETE DOWNLOAD] Download failed:', error);
      
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
          Downloading...
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

export default DirectDatabaseDownload;