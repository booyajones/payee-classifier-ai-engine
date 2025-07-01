// Updated consolidated database service with all operations
import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification } from '@/lib/types';
import { logger, performanceLogger } from '@/lib/logging';
import { useAppStore } from '@/stores/appStore';

export class ConsolidatedDatabaseService {
  private static instance: ConsolidatedDatabaseService;
  private pendingOperations = new Map<string, Promise<any>>();
  
  static getInstance(): ConsolidatedDatabaseService {
    if (!ConsolidatedDatabaseService.instance) {
      ConsolidatedDatabaseService.instance = new ConsolidatedDatabaseService();
    }
    return ConsolidatedDatabaseService.instance;
  }

  // Unified error handling with automatic retry
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        logger.warn(`Database operation '${operationName}' failed, attempt ${attempt}/${maxRetries}`, 
          error, 'DATABASE');
        
        if (attempt >= maxRetries) {
          logger.error(`Database operation '${operationName}' failed after ${maxRetries} attempts`, 
            error, 'DATABASE');
          useAppStore.getState().setError(`Database operation failed: ${operationName}`);
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error(`Unreachable code in executeWithRetry for ${operationName}`);
  }

  // Batch Jobs Operations
  async saveBatchJob(batchJob: BatchJob, payeeRowData: PayeeRowData): Promise<void> {
    const operationId = `saveBatchJob-${batchJob.id}`;
    
    // Prevent duplicate operations
    if (this.pendingOperations.has(operationId)) {
      return this.pendingOperations.get(operationId);
    }

    const operation = this.executeWithRetry(async () => {
      performanceLogger.startTiming(operationId, 'DATABASE');
      
      const dbRecord = {
        id: batchJob.id,
        status: batchJob.status,
        unique_payee_names: payeeRowData.uniquePayeeNames,
        original_file_data: payeeRowData.originalFileData as any,
        row_mappings: payeeRowData.rowMappings as any,
        request_counts_total: batchJob.request_counts?.total || 0,
        request_counts_completed: batchJob.request_counts?.completed || 0,
        request_counts_failed: batchJob.request_counts?.failed || 0,
        errors: batchJob.errors || [],
        created_at_timestamp: batchJob.created_at || Date.now(),
        in_progress_at_timestamp: batchJob.in_progress_at || null,
        finalizing_at_timestamp: batchJob.finalizing_at || null,
        completed_at_timestamp: batchJob.completed_at || null,
        failed_at_timestamp: batchJob.failed_at || null,
        expired_at_timestamp: batchJob.expired_at || null,
        cancelled_at_timestamp: batchJob.cancelled_at || null
      };

      const { error } = await supabase
        .from('batch_jobs')
        .upsert(dbRecord);

      if (error) throw error;
      
      performanceLogger.endTiming(operationId);
      logger.info(`Batch job ${batchJob.id} saved successfully`, { jobId: batchJob.id }, 'DATABASE');
    }, operationId);

    this.pendingOperations.set(operationId, operation);
    
    try {
      await operation;
    } finally {
      this.pendingOperations.delete(operationId);
    }
  }

  async loadBatchJobs(): Promise<{ jobs: BatchJob[], payeeDataMap: Record<string, PayeeRowData> }> {
    return this.executeWithRetry(async () => {
      performanceLogger.startTiming('loadBatchJobs', 'DATABASE');
      
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .order('app_created_at', { ascending: false });

      if (error) throw error;

      const jobs: BatchJob[] = [];
      const payeeDataMap: Record<string, PayeeRowData> = {};

      data?.forEach(row => {
        const job: BatchJob = {
          id: row.id,
          status: row.status as any,
          created_at: row.created_at_timestamp,
          in_progress_at: row.in_progress_at_timestamp,
          finalizing_at: row.finalizing_at_timestamp,
          completed_at: row.completed_at_timestamp,
          failed_at: row.failed_at_timestamp,
          expired_at: row.expired_at_timestamp,
          cancelled_at: row.cancelled_at_timestamp,
          request_counts: {
            total: row.request_counts_total,
            completed: row.request_counts_completed,
            failed: row.request_counts_failed
          },
          errors: Array.isArray(row.errors) ? row.errors : [],
          output_file_id: row.output_file_id
        };

        const payeeData: PayeeRowData = {
          uniquePayeeNames: Array.isArray(row.unique_payee_names) ? row.unique_payee_names : [],
          originalFileData: Array.isArray(row.original_file_data) ? row.original_file_data : [],
          rowMappings: Array.isArray(row.row_mappings) ? row.row_mappings : [] as any,
          uniqueNormalizedNames: [], // Will be populated if needed
          standardizationStats: {
            totalNames: 0,
            standardizedNames: 0,
            duplicatesRemoved: 0,
            errors: []
          }
        };

        jobs.push(job);
        payeeDataMap[job.id] = payeeData;
      });

      performanceLogger.endTiming('loadBatchJobs');
      logger.info(`Loaded ${jobs.length} batch jobs`, { count: jobs.length }, 'DATABASE');
      
      return { jobs, payeeDataMap };
    }, 'loadBatchJobs');
  }

  // Classification Operations
  async saveClassificationResults(results: PayeeClassification[]): Promise<void> {
    return this.executeWithRetry(async () => {
      if (!results.length) return;

      performanceLogger.startTiming('saveClassificationResults', 'DATABASE');
      
      const dbRecords = results.map(result => ({
        payee_name: result.payeeName,
        classification: result.result.classification,
        confidence: result.result.confidence,
        reasoning: result.result.reasoning,
        processing_tier: result.result.processingTier,
        processing_method: result.result.processingMethod || null,
        matching_rules: result.result.matchingRules || [],
        sic_code: result.result.sicCode || null,
        sic_description: result.result.sicDescription || null,
        keyword_exclusion: result.result.keywordExclusion ? JSON.stringify(result.result.keywordExclusion) : null,
        similarity_scores: result.result.similarityScores ? JSON.stringify(result.result.similarityScores) : null,
        original_data: result.originalData ? JSON.stringify(result.originalData) : null,
        row_index: result.rowIndex || null,
        batch_id: null // Will be set if needed
      }));

      const { error } = await supabase
        .from('payee_classifications')
        .insert(dbRecords);

      if (error) throw error;
      
      performanceLogger.endTiming('saveClassificationResults');
      logger.info(`Saved ${results.length} classification results`, 
        { count: results.length }, 'DATABASE');
    }, 'saveClassificationResults');
  }

  // Keyword Operations
  async addKeyword(keyword: string): Promise<{ success: boolean; error?: string }> {
    return this.executeWithRetry(async () => {
      const { error } = await supabase
        .from('exclusion_keywords')
        .insert({ keyword: keyword.trim(), is_active: true });

      if (error) {
        return { success: false, error: error.message };
      }
      
      logger.info(`Added exclusion keyword: "${keyword}"`, { keyword }, 'DATABASE');
      return { success: true };
    }, 'addKeyword');
  }

  async updateKeyword(id: string, keyword: string): Promise<{ success: boolean; error?: string }> {
    return this.executeWithRetry(async () => {
      const { error } = await supabase
        .from('exclusion_keywords')
        .update({ keyword: keyword.trim() })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      
      logger.info(`Updated exclusion keyword: "${keyword}"`, { id, keyword }, 'DATABASE');
      return { success: true };
    }, 'updateKeyword');
  }

  async deleteKeyword(id: string): Promise<{ success: boolean; error?: string }> {
    return this.executeWithRetry(async () => {
      const { error } = await supabase
        .from('exclusion_keywords')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      
      logger.info(`Deleted exclusion keyword`, { id }, 'DATABASE');
      return { success: true };
    }, 'deleteKeyword');
  }

  async deleteBatchJob(jobId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const { error } = await supabase
        .from('batch_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      
      logger.info(`Deleted batch job ${jobId}`, { jobId }, 'DATABASE');
    }, 'deleteBatchJob');
  }

  // Connection management
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase.from('batch_jobs').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

export const databaseService = ConsolidatedDatabaseService.getInstance();