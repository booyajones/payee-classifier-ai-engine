// Simplified consolidated database service with proper types
import { supabase } from '@/integrations/supabase/client';
import { logger, performanceLogger } from '@/lib/logging';
import { useAppStore } from '@/stores/appStore';

export class ConsolidatedDatabaseService {
  private static instance: ConsolidatedDatabaseService;
  
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