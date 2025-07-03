import { supabase } from '@/integrations/supabase/client';
import { BackgroundFileGenerationService } from './backgroundFileGenerationService';
import { SystemHealthService } from './systemHealthService';
import { productionLogger } from '@/lib/logging/productionLogger';

/**
 * Emergency service to fix stalled file generation system
 */
export class EmergencyFileGenerationService {
  
  /**
   * Emergency restart of the file generation system
   */
  static async emergencyRestart(): Promise<{
    success: boolean;
    message: string;
    fixedItems: number;
  }> {
    try {
      productionLogger.info('Starting emergency file generation restart', undefined, 'EMERGENCY_FIX');
      
      // Step 1: Reset stuck processing items
      const { data: stuckItems, error: fetchError } = await supabase
        .from('file_generation_queue')
        .select('id, batch_job_id, updated_at')
        .eq('status', 'processing');
      
      if (fetchError) {
        throw new Error(`Failed to fetch stuck items: ${fetchError.message}`);
      }

      let fixedCount = 0;
      
      // Reset items stuck in processing for more than 5 minutes
      if (stuckItems && stuckItems.length > 0) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const stalledItems = stuckItems.filter(item => item.updated_at < fiveMinutesAgo);
        
        if (stalledItems.length > 0) {
          const { error: resetError } = await supabase
            .from('file_generation_queue')
            .update({
              status: 'pending',
              retry_count: 0,
              last_error: 'Reset by emergency restart',
              updated_at: new Date().toISOString()
            })
            .in('id', stalledItems.map(item => item.id));
          
          if (resetError) {
            throw new Error(`Failed to reset stuck items: ${resetError.message}`);
          }
          
          fixedCount += stalledItems.length;
          productionLogger.info(`Reset ${stalledItems.length} stuck processing items`, undefined, 'EMERGENCY_FIX');
        }
      }
      
      // Step 2: Restart background service
      BackgroundFileGenerationService.stop();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      BackgroundFileGenerationService.start();
      
      // Step 3: Auto-fix any other issues
      const autoFixResult = await SystemHealthService.autoFix();
      
      productionLogger.info('Emergency restart completed', {
        fixedItems: fixedCount,
        autoFixResult
      }, 'EMERGENCY_FIX');
      
      return {
        success: true,
        message: `Emergency restart completed. Reset ${fixedCount} stuck items and restarted background service.`,
        fixedItems: fixedCount
      };
      
    } catch (error) {
      productionLogger.error('Emergency restart failed', error, 'EMERGENCY_FIX');
      return {
        success: false,
        message: `Emergency restart failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fixedItems: 0
      };
    }
  }
  
  /**
   * Force process all pending queue items immediately
   */
  static async forceProcessPending(): Promise<{
    success: boolean;
    message: string;
    processedCount: number;
  }> {
    try {
      productionLogger.info('Force processing all pending queue items', undefined, 'EMERGENCY_FIX');
      
      // Get all pending items
      const { data: pendingItems, error } = await supabase
        .from('file_generation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) {
        throw new Error(`Failed to fetch pending items: ${error.message}`);
      }
      
      if (!pendingItems || pendingItems.length === 0) {
        return {
          success: true,
          message: 'No pending items found',
          processedCount: 0
        };
      }
      
      let processedCount = 0;
      
      // Process items in small batches to avoid overwhelming the system
      for (let i = 0; i < pendingItems.length; i += 2) {
        const batch = pendingItems.slice(i, i + 2);
        
        // Process each item in the batch
        await Promise.all(batch.map(async (item) => {
          try {
            // Mark as processing
            await supabase
              .from('file_generation_queue')
              .update({ 
                status: 'processing', 
                updated_at: new Date().toISOString() 
              })
              .eq('id', item.id);
            
            // Trigger background processing (the service will pick it up)
            processedCount++;
            
          } catch (itemError) {
            productionLogger.error(`Failed to process queue item ${item.id}`, itemError, 'EMERGENCY_FIX');
          }
        }));
        
        // Small delay between batches
        if (i + 2 < pendingItems.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return {
        success: true,
        message: `Force processing initiated for ${processedCount} items`,
        processedCount
      };
      
    } catch (error) {
      productionLogger.error('Force processing failed', error, 'EMERGENCY_FIX');
      return {
        success: false,
        message: `Force processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processedCount: 0
      };
    }
  }
  
  /**
   * Get emergency status report
   */
  static async getEmergencyStatus(): Promise<{
    queueStatus: any;
    stalledItems: number;
    missedJobs: number;
    systemHealth: any;
  }> {
    try {
      // Get queue status
      const queueStatus = await BackgroundFileGenerationService.getQueueStatus();
      
      // Count stalled items (processing for >5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: stalledItems } = await supabase
        .from('file_generation_queue')
        .select('id')
        .eq('status', 'processing')
        .lt('updated_at', fiveMinutesAgo);
      
      // Count missed jobs
      const { data: missedJobs } = await supabase
        .from('batch_jobs')
        .select('id')
        .eq('status', 'completed')
        .gt('request_counts_completed', 0)
        .or('csv_file_url.is.null,excel_file_url.is.null');
      
      // Get system health
      const systemHealth = await SystemHealthService.getSystemHealth();
      
      return {
        queueStatus,
        stalledItems: stalledItems?.length || 0,
        missedJobs: missedJobs?.length || 0,
        systemHealth
      };
      
    } catch (error) {
      productionLogger.error('Failed to get emergency status', error, 'EMERGENCY_FIX');
      throw error;
    }
  }
}
