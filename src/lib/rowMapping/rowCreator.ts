/**
 * Row creation utilities for mapping classification results to original data
 */

/**
 * Creates a mapped row with all necessary data - PRESERVES ALL ORIGINAL COLUMNS
 */
export function createMappedRow(originalRow: any, classificationResult: any, mapping: any, payeeRowData?: any): any {
  // CRITICAL: Start with ALL original columns to preserve data integrity
  const mappedRow = {
    ...originalRow, // Preserve every single original column
  };
  
  // Append classification data as new columns (don't overwrite any originals)
  mappedRow.ai_classification = classificationResult.result?.classification || 'Individual';
  mappedRow.ai_confidence = classificationResult.result?.confidence || 50;
  mappedRow.ai_reasoning = classificationResult.result?.reasoning || 'No classification result';
  mappedRow.ai_processing_tier = classificationResult.result?.processingTier || 'Failed';
  mappedRow.ai_processing_method = classificationResult.result?.processingMethod || 'Unknown';
  mappedRow.ai_timestamp = classificationResult.timestamp instanceof Date ? classificationResult.timestamp.toISOString() : new Date().toISOString();
  
  // Keyword exclusion data as new columns
  mappedRow.keyword_exclusion_applied = classificationResult.result?.keywordExclusion?.isExcluded ? 'Yes' : 'No';
  mappedRow.matched_keywords = classificationResult.result?.keywordExclusion?.matchedKeywords?.join('; ') || '';
  mappedRow.keyword_confidence = classificationResult.result?.keywordExclusion?.confidence?.toString() || '0';
  mappedRow.keyword_reasoning = classificationResult.result?.keywordExclusion?.reasoning || 'No keyword exclusion applied';
  
  // SIC code fields as new columns
  mappedRow.sic_code = classificationResult.result?.sicCode || '';
  mappedRow.sic_description = classificationResult.result?.sicDescription || '';
  
  // Standardization fields as new columns
  if (mapping.normalizedPayeeName) {
    mappedRow.normalized_payee_name = mapping.normalizedPayeeName;
    mappedRow.original_payee_name = mapping.payeeName;
    mappedRow.standardization_steps = mapping.standardizationResult?.cleaningSteps?.join(', ') || '';
    mappedRow.standardization_steps_count = mapping.standardizationResult?.cleaningSteps?.length || 0;
    mappedRow.data_quality_improved = mapping.standardizationResult?.original !== mapping.standardizationResult?.normalized ? 'Yes' : 'No';
  }
  
  // DUPLICATE DETECTION DATA - Find duplicate info by INDEX, not name
  if (payeeRowData?.duplicateDetectionResults) {
    productionLogger.debug(`[ROW MAPPER] Searching for duplicate data for "${mapping.payeeName}" (index ${mapping.uniquePayeeIndex})`);
    productionLogger.debug(`[ROW MAPPER] Available duplicate records:`, payeeRowData.duplicateDetectionResults.processed_records.length);
    
    // Map duplicate detection results by unique payee index
    const duplicateRecord = payeeRowData.duplicateDetectionResults.processed_records.find(
      (record: any) => {
        // Extract payee index from payee_id (format: "payee_0", "payee_1", etc.)
        const recordIndex = parseInt(record.payee_id.replace('payee_', ''));
        return recordIndex === mapping.uniquePayeeIndex;
      }
    );
    
    if (duplicateRecord) {
      productionLogger.debug(`[ROW MAPPER] ✅ Found duplicate data for "${mapping.payeeName}" (index ${mapping.uniquePayeeIndex}):`, {
        is_potential_duplicate: duplicateRecord.is_potential_duplicate,
        judgement_method: duplicateRecord.judgement_method,
        final_duplicate_score: duplicateRecord.final_duplicate_score
      });
      
      mappedRow.is_potential_duplicate = duplicateRecord.is_potential_duplicate ? 'Yes' : 'No';
      mappedRow.duplicate_of_payee_name = duplicateRecord.duplicate_of_payee_name || '';
      mappedRow.duplicate_confidence_score = duplicateRecord.final_duplicate_score || 0;
      mappedRow.duplicate_detection_method = duplicateRecord.judgement_method || 'Algorithmic Analysis';
      mappedRow.duplicate_group_id = duplicateRecord.duplicate_group_id || '';
      mappedRow.ai_duplicate_reasoning = duplicateRecord.ai_judgment?.reasoning || duplicateRecord.ai_judgement_reasoning || '';
      
      // If this is a duplicate, try to find the name of what it's a duplicate of
      if (duplicateRecord.is_potential_duplicate && duplicateRecord.duplicate_of_payee_id) {
        const duplicateOfIndex = parseInt(duplicateRecord.duplicate_of_payee_id.replace('payee_', ''));
        const duplicateOfRecord = payeeRowData.duplicateDetectionResults.processed_records.find(
          (r: any) => parseInt(r.payee_id.replace('payee_', '')) === duplicateOfIndex
        );
        if (duplicateOfRecord) {
          mappedRow.duplicate_of_payee_name = duplicateOfRecord.payee_name;
        }
      }
    } else {
      productionLogger.warn(`[ROW MAPPER] ❌ No duplicate data found for "${mapping.payeeName}" (index ${mapping.uniquePayeeIndex})`);
      // Default duplicate values if no duplicate detection was run
      mappedRow.is_potential_duplicate = 'No';
      mappedRow.duplicate_of_payee_name = '';
      mappedRow.duplicate_confidence_score = 0;
      mappedRow.duplicate_detection_method = 'Not Analyzed';
      mappedRow.duplicate_group_id = '';
      mappedRow.ai_duplicate_reasoning = '';
    }
  } else {
    productionLogger.warn(`[ROW MAPPER] ❌ No duplicate detection results available for any records`);
    // Default duplicate values if no duplicate detection results available
    mappedRow.is_potential_duplicate = 'No';
    mappedRow.duplicate_of_payee_name = '';
    mappedRow.duplicate_confidence_score = 0;
    mappedRow.duplicate_detection_method = 'Not Analyzed';
    mappedRow.duplicate_group_id = '';
    mappedRow.ai_duplicate_reasoning = '';
  }
  
  // Quality metrics as new columns
  mappedRow.processing_quality_score = classificationResult.result?.confidence >= 90 ? 'High' : 
                                      classificationResult.result?.confidence >= 70 ? 'Medium' : 'Low';
  mappedRow.requires_review = (classificationResult.result?.confidence || 0) < 85 ? 'Yes' : 'No';
  
  productionLogger.debug(`[ROW MAPPER] Created mapped row with ${Object.keys(mappedRow).length} total columns (${Object.keys(originalRow).length} original + ${Object.keys(mappedRow).length - Object.keys(originalRow).length} new)`);
  
  return mappedRow;
}
