
import { ClassificationResult, ClassificationConfig, PayeeClassification } from '@/lib/types/unified';
import { logger } from '@/lib/logging/logger';
import { enhancedClassifyPayeeWithAI } from '@/lib/openai/enhancedClassification';
import { checkKeywordExclusion } from './enhancedKeywordExclusion';

/**
 * Unified Classification Engine
 * Consolidates V1, V2, V3 functionality into a single, configurable system
 */
export class UnifiedClassificationEngine {
  private config: ClassificationConfig;
  private context = 'UNIFIED_ENGINE';

  constructor(config: ClassificationConfig) {
    this.config = config;
    logger.info('Initialized unified classification engine', { config }, this.context);
  }

  /**
   * Normalize classification result to match unified types
   */
  private normalizeClassification(classification: string): 'Personal' | 'Business' {
    // Handle different classification formats from various engines
    const normalized = classification.toLowerCase();
    if (normalized === 'individual' || normalized === 'personal') {
      return 'Personal';
    }
    if (normalized === 'business' || normalized === 'corporation') {
      return 'Business';
    }
    // Default to Personal for safety
    return 'Personal';
  }

  /**
   * Classify a single payee with full feature set
   */
  async classifyPayee(payeeName: string): Promise<ClassificationResult> {
    logger.debug(`Classifying payee: ${payeeName}`, undefined, this.context);
    
    try {
      logger.time(`classify-${payeeName}`, this.context);
      
      // AI-powered classification
      const aiResult = await enhancedClassifyPayeeWithAI(payeeName);
      
      // Apply keyword exclusion if enabled
      let keywordExclusion;
      if (this.config.enableKeywordExclusion) {
        keywordExclusion = await checkKeywordExclusion(payeeName);
      }

      const result: ClassificationResult = {
        classification: this.normalizeClassification(aiResult.classification),
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        processingTier: 'AI-Enhanced',
        processingMethod: 'Unified Engine',
        sicCode: this.config.enableSICCodes ? aiResult.sicCode : undefined,
        sicDescription: this.config.enableSICCodes ? aiResult.sicDescription : undefined,
        keywordExclusion,
        matchingRules: aiResult.matchingRules,
        similarityScores: aiResult.similarityScores
      };

      logger.timeEnd(`classify-${payeeName}`, this.context);
      logger.debug(`Classification complete for ${payeeName}`, { result }, this.context);
      
      return result;
    } catch (error) {
      logger.error(`Classification failed for ${payeeName}`, { error }, this.context);
      throw error;
    }
  }

  /**
   * Process a batch of payees with progress tracking
   */
  async processBatch(
    payeeNames: string[],
    onProgress?: (current: number, total: number, percentage: number) => void
  ): Promise<PayeeClassification[]> {
    logger.info(`Starting batch processing of ${payeeNames.length} payees`, undefined, this.context);
    logger.time('batch-processing', this.context);

    const results: PayeeClassification[] = [];
    
    try {
      for (let i = 0; i < payeeNames.length; i++) {
        const payeeName = payeeNames[i];
        
        try {
          const classificationResult = await this.classifyPayee(payeeName);
          
          const payeeClassification: PayeeClassification = {
            id: `${Date.now()}-${i}`,
            payeeName,
            result: classificationResult,
            createdAt: new Date(),
            updatedAt: new Date(),
            rowIndex: i
          };
          
          results.push(payeeClassification);
          
          // Progress callback
          const percentage = Math.round(((i + 1) / payeeNames.length) * 100);
          onProgress?.(i + 1, payeeNames.length, percentage);
          
        } catch (error) {
          logger.error(`Failed to classify payee ${payeeName}`, { error }, this.context);
          // Continue processing other payees
        }
      }

      logger.timeEnd('batch-processing', this.context);
      logger.info(`Batch processing complete: ${results.length}/${payeeNames.length} successful`, undefined, this.context);
      
      return results;
    } catch (error) {
      logger.error('Batch processing failed', { error }, this.context);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ClassificationConfig>) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Configuration updated', { newConfig }, this.context);
  }

  /**
   * Get current configuration
   */
  getConfig(): ClassificationConfig {
    return { ...this.config };
  }
}

// Factory function for creating engine instances
export function createUnifiedEngine(config?: Partial<ClassificationConfig>): UnifiedClassificationEngine {
  const defaultConfig: ClassificationConfig = {
    useAI: true,
    aiProvider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 1000,
    enableKeywordExclusion: true,
    enableSICCodes: true,
    timeout: 30000,
    retryAttempts: 3
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new UnifiedClassificationEngine(finalConfig);
}
