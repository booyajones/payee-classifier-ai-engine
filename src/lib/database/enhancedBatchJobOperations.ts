import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping/types';
import { DataSampler } from '@/lib/dataProcessing/dataSampler';
import { LargeDataStorage } from '@/lib/storage/largeDataStorage';
import { supabase } from '@/integrations/supabase/client';

export class EnhancedBatchJobOperations {
  private static readonly MAX_RECORDS_THRESHOLD = 5000;
  private static readonly MAX_JSON_SIZE_BYTES = 500000; // 500KB

  /**
   * Intelligently saves batch job data, handling large datasets efficiently
   */
  static async saveBatchJobIntelligently(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<void> {
    try {
      console.log(`[ENHANCED SAVE] Processing job ${batchJob.id} with ${payeeRowData.uniquePayeeNames.length} payees`);
      
      // Check if we need to handle large data differently
      const shouldOptimize = this.shouldOptimizeData(payeeRowData);
      
      if (shouldOptimize) {
        await this.saveLargeJobOptimized(batchJob, payeeRowData);
      } else {
        await this.saveStandardJob(batchJob, payeeRowData);
      }
      
      console.log(`[ENHANCED SAVE] Successfully saved job ${batchJob.id}`);
    } catch (error) {
      console.error(`[ENHANCED SAVE] Failed to save job ${batchJob.id}:`, error);
      throw error;
    }
  }

  /**
   * Determines if data should be optimized based on size thresholds
   */
  private static shouldOptimizeData(payeeRowData: PayeeRowData): boolean {
    const recordCount = payeeRowData.uniquePayeeNames.length;
    const estimatedSize = JSON.stringify(payeeRowData).length;
    
    return recordCount > this.MAX_RECORDS_THRESHOLD || 
           estimatedSize > this.MAX_JSON_SIZE_BYTES;
  }

  /**
   * Optimized save for large datasets
   */
  private static async saveLargeJobOptimized(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<void> {
    console.log(`[LARGE JOB] Optimizing save for ${payeeRowData.uniquePayeeNames.length} records`);
    
    // Step 1: Sample the data for immediate processing
    const sampledData = DataSampler.smartSample(payeeRowData, 2000);
    
    // Step 2: Store original data in storage
    const storageUrl = await LargeDataStorage.storeOriginalData(batchJob.id, payeeRowData);
    
    // Step 3: Save minimal job record with sampled data
    await this.saveMinimalJobRecord(batchJob, sampledData, storageUrl);
    
    console.log(`[LARGE JOB] Saved optimized job with ${sampledData.uniquePayeeNames.length} sampled records`);
  }

  /**
   * Standard save for smaller datasets
   */
  private static async saveStandardJob(
    batchJob: BatchJob,
    payeeRowData: PayeeRowData
  ): Promise<void> {
    console.log(`[STANDARD SAVE] Saving job with ${payeeRowData.uniquePayeeNames.length} records`);
    
    try {
      // Validate essential data
      if (!batchJob.id || !batchJob.status) {
        throw new Error('Missing required batch job fields');
      }

      if (!payeeRowData.uniquePayeeNames || !Array.isArray(payeeRowData.uniquePayeeNames)) {
        throw new Error('Invalid payee data: uniquePayeeNames must be an array');
      }

      // Safe data serialization with validation
      const originalFileDataSafe = this.safeSerializeData(
        payeeRowData.originalFileData, 
        'originalFileData'
      );

      const rowMappingsSafe = this.safeSerializeData(
        payeeRowData.rowMappings, 
        'rowMappings'
      );

      const batchJobRecord = {
        id: batchJob.id,
        status: batchJob.status,
        created_at_timestamp: batchJob.created_at,
        app_created_at: new Date().toISOString(),
        app_updated_at: new Date().toISOString(),
        unique_payee_names: payeeRowData.uniquePayeeNames,
        selected_payee_column: null,
        file_name: null,
        file_size_bytes: null,
        file_headers: null,
        original_file_data: originalFileDataSafe,
        row_mappings: rowMappingsSafe,
        request_counts_total: payeeRowData.uniquePayeeNames.length,
        request_counts_completed: 0,
        request_counts_failed: 0,
        errors: null,
        metadata: {
          processing_type: 'standard',
          record_count: payeeRowData.uniquePayeeNames.length,
          timestamp: Date.now()
        }
      };

      console.log(`[STANDARD SAVE] Attempting database save for job ${batchJob.id}`);
      
      const { error } = await supabase
        .from('batch_jobs')
        .upsert(batchJobRecord);

      if (error) {
        console.error(`[STANDARD SAVE] Database error for job ${batchJob.id}:`, error);
        throw new Error(`Database save failed: ${error.message}`);
      }

      console.log(`[STANDARD SAVE] Successfully saved job ${batchJob.id} to database`);
    } catch (error) {
      console.error(`[STANDARD SAVE] Failed to save job ${batchJob.id}:`, error);
      throw error;
    }
  }

  /**
   * Saves minimal job record for large datasets
   */
  private static async saveMinimalJobRecord(
    batchJob: BatchJob,
    sampledData: PayeeRowData,
    storageUrl: string
  ): Promise<void> {
    try {
      // Safe data serialization with validation
      const originalFileDataSafe = this.safeSerializeData(
        sampledData.originalFileData, 
        'originalFileData'
      );

      const rowMappingsSafe = this.safeSerializeData(
        sampledData.rowMappings, 
        'rowMappings'
      );

      const minimalRecord = {
        id: batchJob.id,
        status: batchJob.status,
        created_at_timestamp: batchJob.created_at,
        app_created_at: new Date().toISOString(),
        app_updated_at: new Date().toISOString(),
        unique_payee_names: sampledData.uniquePayeeNames,
        selected_payee_column: null,
        file_name: null,
        file_size_bytes: null,
        file_headers: null,
        original_file_data: originalFileDataSafe,
        row_mappings: rowMappingsSafe,
        request_counts_total: sampledData.uniquePayeeNames.length,
        request_counts_completed: 0,
        request_counts_failed: 0,
        errors: null,
        metadata: {
          processing_type: 'optimized_large',
          original_record_count: (sampledData as any).originalRecordCount || sampledData.uniquePayeeNames.length,
          sampled_record_count: sampledData.uniquePayeeNames.length,
          storage_url: storageUrl,
          is_sampled: true,
          timestamp: Date.now()
        }
      };

      const { error } = await supabase
        .from('batch_jobs')
        .upsert(minimalRecord);

      if (error) {
        console.error(`[MINIMAL SAVE] Database error for job ${batchJob.id}:`, error);
        throw new Error(`Minimal record save failed: ${error.message}`);
      }

      console.log(`[MINIMAL SAVE] Successfully saved minimal record for job ${batchJob.id}`);
    } catch (error) {
      console.error(`[MINIMAL SAVE] Failed to save minimal record for job ${batchJob.id}:`, error);
      throw error;
    }
  }

  /**
   * Safely serializes data for database storage
   */
  private static safeSerializeData(data: any, fieldName: string): any {
    try {
      if (!data) {
        console.log(`[SERIALIZE] ${fieldName}: data is null/undefined, using default`);
        return [{ placeholder: `No ${fieldName}` }];
      }

      if (!Array.isArray(data)) {
        console.log(`[SERIALIZE] ${fieldName}: data is not an array, converting`);
        return [{ value: data, note: `Converted from ${typeof data}` }];
      }

      if (data.length === 0) {
        console.log(`[SERIALIZE] ${fieldName}: array is empty, using default`);
        return [{ placeholder: `No ${fieldName}` }];
      }

      // Test serialization
      const testSerialized = JSON.stringify(data);
      if (testSerialized.length > 1000000) { // 1MB limit
        console.warn(`[SERIALIZE] ${fieldName}: data too large (${testSerialized.length} bytes), truncating`);
        return data.slice(0, 100); // Take first 100 items
      }

      console.log(`[SERIALIZE] ${fieldName}: successfully serialized ${data.length} items`);
      return data;
    } catch (error) {
      console.error(`[SERIALIZE] Error serializing ${fieldName}:`, error);
      return [{ error: `Failed to serialize ${fieldName}`, timestamp: Date.now() }];
    }
  }
}