import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

export const useBatchJobPersistence = () => {
  const { setJobs, setPayeeDataMap, setLoaded } = useBatchJobStore();

  // Load batch jobs from database on mount
  useEffect(() => {
    const loadBatchJobs = async () => {
      try {
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
  }, [setJobs, setPayeeDataMap, setLoaded]);

  // Save batch job to database
  const saveBatchJob = async (batchJob: BatchJob, payeeData?: PayeeRowData) => {
    try {
      const { error } = await supabase
        .from('batch_jobs')
        .upsert({
          id: batchJob.id,
          status: batchJob.status,
          created_at_timestamp: batchJob.created_at,
          completed_at_timestamp: batchJob.completed_at || null,
          failed_at_timestamp: batchJob.failed_at || null,
          expired_at_timestamp: batchJob.expired_at || null,
          finalizing_at_timestamp: batchJob.finalizing_at || null,
          in_progress_at_timestamp: batchJob.in_progress_at || null,
          cancelled_at_timestamp: batchJob.cancelled_at || null,
          output_file_id: batchJob.output_file_id || null,
          errors: batchJob.errors || null,
          request_counts_total: batchJob.request_counts.total,
          request_counts_completed: batchJob.request_counts.completed,
          request_counts_failed: batchJob.request_counts.failed,
          metadata: batchJob.metadata || null,
          unique_payee_names: payeeData?.uniquePayeeNames || [],
          original_file_data: JSON.parse(JSON.stringify(payeeData?.originalFileData || [])),
          row_mappings: JSON.parse(JSON.stringify(payeeData?.rowMappings || [])),
          selected_payee_column: null,
          file_name: null,
          file_headers: null
        } as any);

      if (error) {
        console.error('Failed to save batch job to database:', error);
        throw error;
      }
      
      console.log(`Saved batch job ${batchJob.id} to database`);
    } catch (error) {
      console.error('Error saving batch job:', error);
      throw error;
    }
  };

  return {
    saveBatchJob
  };
};
