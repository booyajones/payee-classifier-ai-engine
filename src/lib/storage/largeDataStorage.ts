import { PayeeRowData } from '@/lib/rowMapping/types';
import { supabase } from '@/integrations/supabase/client';

export class LargeDataStorage {
  private static readonly BUCKET_NAME = 'batch-results';

  /**
   * Stores original file data in Supabase Storage for large datasets
   */
  static async storeOriginalData(
    jobId: string,
    payeeRowData: PayeeRowData
  ): Promise<string> {
    try {
      console.log(`[LARGE DATA STORAGE] Storing original data for job ${jobId}`);
      
      // Validate data before storage
      if (!payeeRowData.originalFileData || !Array.isArray(payeeRowData.originalFileData)) {
        throw new Error('Invalid originalFileData: must be an array');
      }
      
      if (!payeeRowData.rowMappings || !Array.isArray(payeeRowData.rowMappings)) {
        throw new Error('Invalid rowMappings: must be an array');
      }
      
      // Create the data to store with safety checks
      const dataToStore = {
        originalFileData: payeeRowData.originalFileData,
        rowMappings: payeeRowData.rowMappings,
        uniquePayeeNames: payeeRowData.uniquePayeeNames || [],
        metadata: {
          totalRecords: payeeRowData.originalFileData?.length || 0,
          uniquePayees: payeeRowData.uniquePayeeNames?.length || 0,
          storedAt: new Date().toISOString(),
          jobId,
          version: '1.0'
        }
      };
      
      // Convert to JSON with size check
      const jsonData = JSON.stringify(dataToStore);
      const fileSizeMB = (jsonData.length / (1024 * 1024)).toFixed(2);
      console.log(`[LARGE DATA STORAGE] Data size: ${fileSizeMB}MB`);
      
      const fileName = `job-${jobId}-original-data.json`;
      
      // Upload to storage as Blob for better handling
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: 'application/json',
          upsert: true
        });
      
      if (error) {
        console.error(`[LARGE DATA STORAGE] Upload failed:`, error);
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);
      
      console.log(`[LARGE DATA STORAGE] Successfully stored data at: ${urlData.publicUrl}`);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error(`[LARGE DATA STORAGE] Failed to store data for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves original data from storage
   */
  static async retrieveOriginalData(storageUrl: string): Promise<PayeeRowData> {
    try {
      console.log(`[LARGE DATA STORAGE] Retrieving data from: ${storageUrl}`);
      
      const response = await fetch(storageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        originalFileData: data.originalFileData,
        rowMappings: data.rowMappings,
        uniquePayeeNames: [], // Will be populated from rowMappings
        uniqueNormalizedNames: [], // Will be populated from rowMappings
        standardizationStats: {
          totalProcessed: 0,
          changesDetected: 0,
          averageStepsPerName: 0,
          mostCommonSteps: []
        }
      };
      
    } catch (error) {
      console.error(`[LARGE DATA STORAGE] Failed to retrieve data:`, error);
      throw error;
    }
  }

  /**
   * Cleans up storage for completed jobs
   */
  static async cleanupJobData(jobId: string): Promise<void> {
    try {
      const fileName = `job-${jobId}-original-data.json`;
      
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);
      
      if (error) {
        console.warn(`[LARGE DATA STORAGE] Cleanup warning for job ${jobId}:`, error);
      } else {
        console.log(`[LARGE DATA STORAGE] Cleaned up data for job ${jobId}`);
      }
    } catch (error) {
      console.warn(`[LARGE DATA STORAGE] Cleanup failed for job ${jobId}:`, error);
    }
  }
}