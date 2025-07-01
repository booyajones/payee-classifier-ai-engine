// Final consolidated batch processor - V3 only
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { enhancedClassifyPayeeWithAI } from '../openai/enhancedClassification';
import { checkKeywordExclusion } from './enhancedKeywordExclusion';
import { saveClassificationResults } from '../database/classificationService';
import { PreGeneratedFileService } from '../storage/preGeneratedFileService';
import { logger, performanceLogger } from '../logging';

/**
 * Final enhanced batch processor with improved SIC code handling and pre-generated file creation
 */
export async function processBatch(
  payeeNames: string[],
  config: ClassificationConfig,
  originalFileData?: any[],
  jobId?: string
): Promise<BatchProcessingResult> {
  const processingId = `batch-${Date.now()}`;
  
  performanceLogger.startTiming(processingId, 'BATCH_PROCESSING');
  logger.info(`Starting batch processing of ${payeeNames.length} payees with SIC codes`, 
    { count: payeeNames.length, jobId }, 'BATCH_PROCESSING');
  
  const results: PayeeClassification[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failureCount = 0;
  let sicCodeCount = 0;

  // Process each payee
  for (let i = 0; i < payeeNames.length; i++) {
    const payeeName = payeeNames[i];
    const originalData = originalFileData?.[i] || null;
    
    try {
      logger.debug(`Processing payee ${i + 1}/${payeeNames.length}: ${payeeName}`, 
        { index: i, payeeName }, 'BATCH_PROCESSING');
      
      // Use the enhanced classification that includes SIC codes
      const classification = await enhancedClassifyPayeeWithAI(payeeName);
      
      // Apply keyword exclusion
      const keywordResult = await checkKeywordExclusion(payeeName);
      
      const result: PayeeClassification = {
        id: `${Date.now()}-${i}`,
        payeeName,
        result: {
          classification: classification.classification,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          processingTier: 'AI-Powered',
          processingMethod: 'Enhanced OpenAI Classification',
          matchingRules: classification.matchingRules,
          sicCode: classification.sicCode,
          sicDescription: classification.sicDescription,
          keywordExclusion: keywordResult
        },
        timestamp: new Date(),
        originalData,
        rowIndex: i
      };
      
      // Track SIC code assignment
      if (result.result.sicCode && result.result.classification === 'Business') {
        sicCodeCount++;
        logger.debug(`Assigned SIC ${result.result.sicCode} to business "${payeeName}"`, 
          { sicCode: result.result.sicCode, payeeName }, 'SIC_ASSIGNMENT');
      } else if (result.result.classification === 'Business') {
        logger.warn(`Business "${payeeName}" missing SIC code`, { payeeName }, 'SIC_ASSIGNMENT');
      }
      
      results.push(result);
      successCount++;
      
    } catch (error) {
      logger.error(`Error processing ${payeeName}`, error, 'BATCH_PROCESSING');
      errors.push(`${payeeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failureCount++;
    }
  }

  // Create batch result
  const batchResult: BatchProcessingResult = {
    results,
    successCount,
    failureCount,
    originalFileData: originalFileData || []
  };

  // Save all results to database immediately after processing
  try {
    logger.info(`Saving ${results.length} classification results to database with SIC codes`, 
      { count: results.length }, 'DATABASE_SAVE');
    await saveClassificationResults(results);
    logger.info(`Successfully saved all results to database`, null, 'DATABASE_SAVE');
  } catch (error) {
    logger.error(`Failed to save results to database`, error, 'DATABASE_SAVE');
    // Don't throw here - we still want to return the results even if database save fails
  }

  // Generate pre-generated files for instant download
  if (jobId) {
    try {
      logger.info(`Generating pre-generated files for job ${jobId}`, { jobId }, 'FILE_GENERATION');
      const fileResult = await PreGeneratedFileService.generateAndStoreFiles(jobId, batchResult);
      
      if (fileResult.error) {
        logger.error(`File generation failed: ${fileResult.error}`, null, 'FILE_GENERATION');
      } else {
        logger.info(`Pre-generated files created successfully for instant downloads`, null, 'FILE_GENERATION');
      }
    } catch (error) {
      logger.error(`Error generating pre-generated files`, error, 'FILE_GENERATION');
      // Don't throw - files can be generated on-demand later
    }
  }

  const businessCount = results.filter(r => r.result.classification === 'Business').length;
  const sicCoverage = businessCount > 0 ? Math.round((sicCodeCount / businessCount) * 100) : 0;
  
  performanceLogger.endTiming(processingId);
  
  logger.info(`Batch processing complete: ${successCount} success, ${failureCount} failures`, 
    { successCount, failureCount, businessCount, sicCodeCount, sicCoverage }, 'BATCH_PROCESSING');

  return batchResult;
}

// Export the function that was missing from other files
export { exportResultsWithOriginalDataV3 } from './batchExporter';