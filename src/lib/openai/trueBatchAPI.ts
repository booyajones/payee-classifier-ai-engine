
import { getOpenAIClient } from './client';
import { makeAPIRequest, logMemoryUsage } from './apiUtils';
import { CLASSIFICATION_MODEL } from './config';

export interface BatchJob {
  id: string;
  status: 'validating' | 'failed' | 'in_progress' | 'finalizing' | 'completed' | 'expired' | 'cancelling' | 'cancelled';
  created_at: number;
  completed_at?: number;
  failed_at?: number;
  expired_at?: number;
  finalizing_at?: number;
  in_progress_at?: number;
  cancelled_at?: number;
  output_file_id?: string;
  error_file_id?: string;
  errors?: any;
  input_file_id?: string;
  completion_window?: string;
  request_counts: {
    total: number;
    completed: number;
    failed: number;
  };
  metadata?: {
    payee_count: number;
    description: string;
    job_name?: string;
  };
}

export interface BatchJobResult {
  custom_id: string;
  response?: {
    status_code: number;
    body: {
      id: string;
      object: string;
      created: number;
      model: string;
      choices: Array<{
        index: number;
        message: {
          role: string;
          content: string;
        };
        finish_reason: string;
      }>;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TrueBatchClassificationResult {
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  status: 'success' | 'failed';
  error?: string;
  sicCode?: string;
  sicDescription?: string;
}

/**
 * Create a batch job using the true OpenAI Batch API with SIC code support
 */
export async function createBatchJob(
  payeeNames: string[],
  description?: string,
  jobName?: string
): Promise<BatchJob> {
  logMemoryUsage('createBatchJob');
  
  return makeAPIRequest(async () => {
    const client = getOpenAIClient();
    
    // Generate creative job name if not provided
    const { generateContextualBatchJobName } = await import('@/lib/services/batchJobNameGenerator');
    const finalJobName = jobName || generateContextualBatchJobName(payeeNames.length, 'file');
    
    console.log(`[TRUE BATCH API] Creating batch job "${finalJobName}" for ${payeeNames.length} payees with SIC codes using model: ${CLASSIFICATION_MODEL}`);
    
    // Create batch requests in JSONL format with enhanced SIC code system prompt
    const batchRequests = payeeNames.map((name, index) => ({
      custom_id: `payee-${index}-${Date.now()}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: CLASSIFICATION_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert at classifying payee names as either "Business" or "Individual". 

For BUSINESS entities, you must also assign a 4-digit SIC (Standard Industrial Classification) code and description based on the business type.

Common SIC codes:
- 7372: Prepackaged Software
- 8742: Management Consulting Services  
- 5411: Grocery Stores
- 8011: Offices of Doctors of Medicine
- 6021: National Commercial Banks
- 7011: Hotels and Motels
- 5812: Eating Places
- 1521: General Contractors-Single Family Houses
- 7381: Detective Guard & Armored Car Services
- 8999: Services, Not Elsewhere Classified

Return ONLY a JSON object with these exact fields:
- classification: "Business" or "Individual"
- confidence: number (0-100)
- reasoning: string explaining the classification
- sicCode: string (4-digit code, only for businesses, null for individuals)
- sicDescription: string (description, only for businesses, null for individuals)

Example responses:
{"classification": "Business", "confidence": 95, "reasoning": "Contains LLC suffix indicating business entity", "sicCode": "8742", "sicDescription": "Management Consulting Services"}
{"classification": "Individual", "confidence": 90, "reasoning": "Appears to be a person's name with first and last name", "sicCode": null, "sicDescription": null}`
          },
          {
            role: 'user',
            content: `Classify this payee name and assign SIC code if it's a business: "${name}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      }
    }));
    
    // Convert to JSONL format
    const jsonlContent = batchRequests.map(req => JSON.stringify(req)).join('\n');
    
    // Create a file with the batch requests
    const file = await client.files.create({
      file: new File([jsonlContent], 'batch_requests_with_sic.jsonl', { type: 'application/jsonl' }),
      purpose: 'batch'
    });
    
    console.log(`[TRUE BATCH API] Created input file with SIC code support: ${file.id}`);
    
    // Create the batch job
    const batch = await client.batches.create({
      input_file_id: file.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
      metadata: {
        payee_count: payeeNames.length.toString(),
        description: description || 'Payee classification batch with SIC codes',
        job_name: finalJobName
      }
    });
    
    console.log(`[TRUE BATCH API] Created batch job with SIC codes: ${batch.id}`);
    
    return {
      id: batch.id,
      status: batch.status as BatchJob['status'],
      created_at: batch.created_at,
      completed_at: batch.completed_at || undefined,
      failed_at: batch.failed_at || undefined,
      expired_at: batch.expired_at || undefined,
      finalizing_at: batch.finalizing_at || undefined,
      in_progress_at: batch.in_progress_at || undefined,
      cancelled_at: batch.cancelled_at || undefined,
      output_file_id: batch.output_file_id || undefined,
      error_file_id: batch.error_file_id || undefined,
      errors: batch.errors || undefined,
      input_file_id: file.id,
      completion_window: '24h',
      request_counts: {
        total: batch.request_counts?.total || payeeNames.length,
        completed: batch.request_counts?.completed || 0,
        failed: batch.request_counts?.failed || 0
      },
      metadata: {
        payee_count: payeeNames.length,
        description: description || 'Payee classification batch with SIC codes',
        job_name: finalJobName
      }
    };
  }, { timeout: 60000, retries: 2 });
}

/**
 * Check the status of a batch job
 */
export async function checkBatchJobStatus(batchId: string): Promise<BatchJob> {
  return makeAPIRequest(async () => {
    const client = getOpenAIClient();
    
    const batch = await client.batches.retrieve(batchId);
    
    return {
      id: batch.id,
      status: batch.status as BatchJob['status'],
      created_at: batch.created_at,
      completed_at: batch.completed_at || undefined,
      failed_at: batch.failed_at || undefined,
      expired_at: batch.expired_at || undefined,
      finalizing_at: batch.finalizing_at || undefined,
      in_progress_at: batch.in_progress_at || undefined,
      cancelled_at: batch.cancelled_at || undefined,
      output_file_id: batch.output_file_id || undefined,
      error_file_id: batch.error_file_id || undefined,
      errors: batch.errors || undefined,
      input_file_id: batch.input_file_id || undefined,
      completion_window: batch.completion_window || undefined,
      request_counts: {
        total: batch.request_counts?.total || 0,
        completed: batch.request_counts?.completed || 0,
        failed: batch.request_counts?.failed || 0
      },
      metadata: batch.metadata ? {
        payee_count: parseInt(batch.metadata.payee_count || '0'),
        description: batch.metadata.description || 'Payee classification batch',
        job_name: batch.metadata.job_name
      } : undefined
    };
  }, { timeout: 15000, retries: 1 }); // Shorter timeout for status checks
}

/**
 * Retrieve and parse batch job results with SIC code extraction
 */
export async function getBatchJobResults(
  batchJob: BatchJob,
  payeeNames: string[]
): Promise<TrueBatchClassificationResult[]> {
  if (batchJob.status !== 'completed' || !batchJob.output_file_id) {
    throw new Error(`Batch job is not completed or has no output file. Status: ${batchJob.status}`);
  }
  
  return makeAPIRequest(async () => {
    const client = getOpenAIClient();
    
    console.log(`[TRUE BATCH API] Retrieving SIC code results from file: ${batchJob.output_file_id}`);
    
    // Get the output file content
    const fileContent = await client.files.content(batchJob.output_file_id!);
    const responseText = await fileContent.text();
    
    // Parse JSONL results
    const results: BatchJobResult[] = responseText
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error('[TRUE BATCH API] Error parsing result line:', line, error);
          return null;
        }
      })
      .filter(result => result !== null);
    
    console.log(`[TRUE BATCH API] Parsed ${results.length} results with SIC code support`);
    logMemoryUsage('getBatchJobResults');
    
    // Map results back to payee names with SIC code extraction
    const classificationResults: TrueBatchClassificationResult[] = payeeNames.map((name, index) => {
      const result = results.find(r => r.custom_id.startsWith(`payee-${index}-`));
      
      if (!result) {
        return {
          payeeName: name,
          classification: 'Individual',
          confidence: 0,
          reasoning: 'No result found in batch output',
          status: 'failed',
          error: 'Missing result'
        };
      }
      
      if (result.error) {
        return {
          payeeName: name,
          classification: 'Individual',
          confidence: 0,
          reasoning: `Batch processing error: ${result.error.message}`,
          status: 'failed',
          error: result.error.message
        };
      }
      
      if (!result.response) {
        return {
          payeeName: name,
          classification: 'Individual',
          confidence: 0,
          reasoning: 'No response in batch result',
          status: 'failed',
          error: 'Missing response'
        };
      }
      
      try {
        const content = result.response.body.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          
          // Debug SIC code extraction
          console.log(`[SIC EXTRACTION] Payee: "${name}" | Classification: ${parsed.classification} | SIC: ${parsed.sicCode || 'None'} | Description: ${parsed.sicDescription || 'None'}`);
          
          return {
            payeeName: name,
            classification: parsed.classification || 'Individual',
            confidence: parsed.confidence || 50,
            reasoning: parsed.reasoning || 'Classified via OpenAI Batch API with SIC codes',
            status: 'success',
            sicCode: parsed.sicCode || undefined,
            sicDescription: parsed.sicDescription || undefined
          };
        }
      } catch (error) {
        console.error(`[TRUE BATCH API] Error parsing result for ${name}:`, error);
      }
      
      return {
        payeeName: name,
        classification: 'Individual',
        confidence: 0,
        reasoning: 'Failed to parse batch result',
        status: 'failed',
        error: 'Parse error'
      };
    });
    
    // Log SIC code statistics
    const businessResults = classificationResults.filter(r => r.classification === 'Business');
    const sicResults = classificationResults.filter(r => r.sicCode);
    console.log(`[TRUE BATCH API] SIC Code Statistics: ${sicResults.length}/${businessResults.length} businesses have SIC codes`);
    
    return classificationResults;
  }, { timeout: 120000, retries: 2 });
}

/**
 * Cancel a batch job
 */
export async function cancelBatchJob(batchId: string): Promise<BatchJob> {
  return makeAPIRequest(async () => {
    const client = getOpenAIClient();
    
    const batch = await client.batches.cancel(batchId);
    
    return {
      id: batch.id,
      status: batch.status as BatchJob['status'],
      created_at: batch.created_at,
      completed_at: batch.completed_at || undefined,
      failed_at: batch.failed_at || undefined,
      expired_at: batch.expired_at || undefined,
      finalizing_at: batch.finalizing_at || undefined,
      in_progress_at: batch.in_progress_at || undefined,
      cancelled_at: batch.cancelled_at || undefined,
      output_file_id: batch.output_file_id || undefined,
      error_file_id: batch.error_file_id || undefined,
      errors: batch.errors || undefined,
      input_file_id: batch.input_file_id || undefined,
      completion_window: batch.completion_window || undefined,
      request_counts: {
        total: batch.request_counts?.total || 0,
        completed: batch.request_counts?.completed || 0,
        failed: batch.request_counts?.failed || 0
      },
      metadata: batch.metadata ? {
        payee_count: parseInt(batch.metadata.payee_count || '0'),
        description: batch.metadata.description || 'Payee classification batch',
        job_name: batch.metadata.job_name
      } : undefined
    };
  }, { timeout: 30000, retries: 1 });
}

/**
 * Poll a batch job until completion
 */
export async function pollBatchJob(
  batchId: string,
  onProgress?: (job: BatchJob) => void,
  pollInterval: number = 5000
): Promise<BatchJob> {
  console.log(`[TRUE BATCH API] Starting to poll batch job: ${batchId}`);
  
  while (true) {
    const job = await checkBatchJobStatus(batchId);
    
    if (onProgress) {
      onProgress(job);
    }
    
    console.log(`[TRUE BATCH API] Batch job ${batchId} status: ${job.status}`);
    
    if (['completed', 'failed', 'expired', 'cancelled'].includes(job.status)) {
      return job;
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}
