import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { resetAllApplicationState } from '@/lib/utils/systemReset';
import { EnhancedBatchJobOperations } from '@/lib/database/enhancedBatchJobOperations';

export const useBatchJobPersistence = () => {
  const { setJobs, setPayeeDataMap, setLoaded, clearAllJobs } = useBatchJobStore();

  // Load batch jobs from database on mount
  useEffect(() => {
    const loadBatchJobs = async () => {
      try {
        // Reset application state first
        resetAllApplicationState();
        clearAllJobs();
        const { data, error } = await supabase
          .from('batch_jobs')
          .select('*')
          .order('app_created_at', { ascending: false });

        if (error) {
          console.error('Failed to load batch jobs:', error);
          return;
        }

        if (data && data.length > 0) {
          // Convert database records to BatchJob format
          const batchJobs: BatchJob[] = data.map(record => ({
            id: record.id,
            status: record.status as BatchJob['status'],
            created_at: record.created_at_timestamp,
            completed_at: record.completed_at_timestamp || undefined,
            failed_at: record.failed_at_timestamp || undefined,
            expired_at: record.expired_at_timestamp || undefined,
            finalizing_at: record.finalizing_at_timestamp || undefined,
            in_progress_at: record.in_progress_at_timestamp || undefined,
            cancelled_at: record.cancelled_at_timestamp || undefined,
            output_file_id: record.output_file_id || undefined,
            error_file_id: undefined,
            errors: record.errors || undefined,
            input_file_id: undefined,
            completion_window: '24h',
            request_counts: {
              total: record.request_counts_total,
              completed: record.request_counts_completed,
              failed: record.request_counts_failed
            },
            metadata: record.metadata as any
          }));

          // Build payee data map
          const payeeDataMap: Record<string, PayeeRowData> = {};
          data.forEach(record => {
            if (record.unique_payee_names && record.original_file_data && record.row_mappings) {
              payeeDataMap[record.id] = {
                uniquePayeeNames: record.unique_payee_names,
                uniqueNormalizedNames: record.unique_payee_names,
                originalFileData: record.original_file_data as any[],
                rowMappings: record.row_mappings as any[],
                standardizationStats: {
                  totalProcessed: record.unique_payee_names.length,
                  changesDetected: 0,
                  averageStepsPerName: 0,
                  mostCommonSteps: []
                }
              };
            }
          });

          setJobs(batchJobs);
          setPayeeDataMap(payeeDataMap);
          console.log(`Loaded ${batchJobs.length} batch jobs from database`);
        }
      } catch (error) {
        console.error('Error loading batch jobs:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadBatchJobs();
  }, [setJobs, setPayeeDataMap, setLoaded, clearAllJobs]);

  // Enhanced save batch job with intelligent routing
  const saveBatchJob = async (batchJob: BatchJob, payeeData?: PayeeRowData) => {
    try {
      console.log(`[PERSISTENCE] Starting save for batch job ${batchJob.id}`);
      
      // Pre-save validation
      if (!batchJob.id || !batchJob.status) {
        throw new Error('Invalid batch job: missing required fields');
      }

      if (!payeeData) {
        throw new Error('PayeeRowData is required for batch job save');
      }

      // Use enhanced batch job operations for intelligent saving
      await EnhancedBatchJobOperations.saveBatchJobIntelligently(batchJob, payeeData);

      // Post-save verification
      const { data: verifyData, error: verifyError } = await supabase
        .from('batch_jobs')
        .select('id, status')
        .eq('id', batchJob.id)
        .single();

      if (verifyError || !verifyData) {
        console.error(`[PERSISTENCE] Verification failed for job ${batchJob.id}:`, verifyError);
        throw new Error('Job save verification failed');
      }

      console.log(`[PERSISTENCE] Successfully saved and verified batch job ${batchJob.id}`);
      return true;
    } catch (error) {
      console.error(`[PERSISTENCE] Error saving batch job ${batchJob.id}:`, error);
      // Provide more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      throw new Error(`Failed to save batch job: ${errorMessage}`);
    }
  };

  return {
    saveBatchJob
  };
};