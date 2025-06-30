
import { BatchProcessingResult, PayeeClassification } from '../types';
import { exportResultsWithOriginalDataV3, exportDirectCSV } from '../classification/batchExporter';

/**
 * Comprehensive SIC code testing and validation
 */
export async function testSicCodePipeline(batchResult: BatchProcessingResult): Promise<void> {
  console.log('=== COMPREHENSIVE SIC CODE PIPELINE TEST ===');
  
  // Test 1: Validate input data
  console.log('TEST 1: Input Data Validation');
  const inputBusinesses = batchResult.results.filter(r => r.result.classification === 'Business');
  const inputSicCodes = batchResult.results.filter(r => r.result.sicCode);
  
  console.log(`Input: ${inputBusinesses.length} businesses, ${inputSicCodes.length} with SIC codes`);
  
  if (inputSicCodes.length > 0) {
    console.log('Sample input SIC codes:', inputSicCodes.slice(0, 3).map(r => ({
      payee: r.payeeName,
      sicCode: r.result.sicCode,
      sicDescription: r.result.sicDescription?.substring(0, 50)
    })));
  } else {
    console.error('❌ TEST 1 FAILED: No SIC codes in input data!');
  }
  
  // Test 2: Export function
  console.log('\nTEST 2: Export Function Test');
  try {
    const exportData = await exportResultsWithOriginalDataV3(batchResult, true);
    const exportBusinesses = exportData.filter(row => row.classification === 'Business');
    const exportSicCodes = exportData.filter(row => row.sicCode && row.sicCode !== '');
    
    console.log(`Export: ${exportBusinesses.length} businesses, ${exportSicCodes.length} with SIC codes`);
    
    if (exportSicCodes.length > 0) {
      console.log('✅ TEST 2 PASSED: SIC codes found in export');
      console.log('Sample export SIC codes:', exportSicCodes.slice(0, 3).map(row => ({
        classification: row.classification,
        sicCode: row.sicCode,
        sicSource: row.sicSource
      })));
    } else {
      console.error('❌ TEST 2 FAILED: No SIC codes in export data!');
    }
  } catch (error) {
    console.error('❌ TEST 2 ERROR:', error);
  }
  
  // Test 3: CSV Export
  console.log('\nTEST 3: CSV Export Test');
  try {
    const csvData = await exportDirectCSV(batchResult);
    const sicColumnIndex = csvData.headers.indexOf('sicCode');
    const sicDescriptionIndex = csvData.headers.indexOf('sicDescription');
    
    console.log(`CSV: ${csvData.headers.length} headers, ${csvData.rows.length} rows`);
    console.log(`SIC column index: ${sicColumnIndex}, SIC description index: ${sicDescriptionIndex}`);
    
    if (sicColumnIndex >= 0) {
      const csvSicCount = csvData.rows.filter(row => row[sicColumnIndex] && row[sicColumnIndex] !== '').length;
      console.log(`CSV SIC codes: ${csvSicCount} rows have SIC codes`);
      
      if (csvSicCount > 0) {
        console.log('✅ TEST 3 PASSED: SIC codes found in CSV');
        console.log('Sample CSV SIC codes:', csvData.rows
          .filter(row => row[sicColumnIndex] && row[sicColumnIndex] !== '')
          .slice(0, 3)
          .map(row => ({ sicCode: row[sicColumnIndex], sicDescription: row[sicDescriptionIndex]?.substring(0, 50) }))
        );
      } else {
        console.error('❌ TEST 3 FAILED: No SIC codes in CSV rows!');
      }
    } else {
      console.error('❌ TEST 3 FAILED: No SIC code column in CSV!');
    }
  } catch (error) {
    console.error('❌ TEST 3 ERROR:', error);
  }
  
  console.log('=== SIC CODE PIPELINE TEST COMPLETE ===');
}

/**
 * Test SIC code generation in OpenAI responses
 */
export function testOpenAIResponse(rawResult: any, payeeName: string): void {
  console.log(`[SIC TEST] Testing OpenAI response for "${payeeName}"`);
  
  if (!rawResult.response?.body?.choices?.[0]?.message?.content) {
    console.error(`[SIC TEST] ❌ No content in OpenAI response for "${payeeName}"`);
    return;
  }
  
  const content = rawResult.response.body.choices[0].message.content;
  console.log(`[SIC TEST] Raw content: ${content.substring(0, 200)}...`);
  
  try {
    const parsed = JSON.parse(content);
    console.log(`[SIC TEST] Parsed fields:`, {
      classification: parsed.classification,
      confidence: parsed.confidence,
      hasSicCode: !!parsed.sicCode,
      sicCode: parsed.sicCode,
      hasReasoning: !!parsed.reasoning,
      allKeys: Object.keys(parsed)
    });
    
    if (parsed.classification === 'Business' && !parsed.sicCode) {
      console.error(`[SIC TEST] ❌ Business "${payeeName}" missing SIC code in OpenAI response!`);
    } else if (parsed.classification === 'Business' && parsed.sicCode) {
      console.log(`[SIC TEST] ✅ Business "${payeeName}" has SIC code: ${parsed.sicCode}`);
    }
  } catch (error) {
    console.error(`[SIC TEST] ❌ JSON parse error for "${payeeName}":`, error);
  }
}
