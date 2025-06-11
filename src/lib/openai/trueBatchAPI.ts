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
  cancelled_at?: number; // Added missing property
  output_file_id?: string;
  error_file_id?: string;
  errors?: any; // Added missing property
  input_file_id?: string; // Added missing property
  completion_window?: string; // Added missing property
  request_counts: {
    total: number;
    completed: number;
    failed: number;
  };
  metadata?: {
    payee_count: number;
    description: string;
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
}

/**
 * Create a batch job using the true OpenAI Batch API
 */
export async function createBatchJob(
  payeeNames: string[],
  description?: string
): Promise<BatchJob> {
  logMemoryUsage('createBatchJob');
  
  return makeAPIRequest(async () => {
    const client = getOpenAIClient();
    
    console.log(`[TRUE BATCH API] Creating batch job for ${payeeNames.length} payees with model: ${CLASSIFICATION_MODEL}`);
    
    // Create batch requests in JSONL format
    const batchRequests = payeeNames.map((name, index) => ({
      custom_id: `payee-${index}-${Date.now()}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: CLASSIFICATION_MODEL, // Use the configured model
        messages: [
          {
            role: 'system',
            content: 'You are an expert at classifying payee names. Classify each name as either "Business" or "Individual". Return only a JSON object with classification, confidence (0-100), and reasoning.'
          },
          {
            role: 'user',
            content: `Classify this payee name: "${name}"\n\nReturn ONLY a JSON object like: {"classification": "Business", "confidence": 95, "reasoning": "Contains LLC suffix indicating business entity"}`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      }
    }));
    
    // Convert to JSONL format
    const jsonlContent = batchRequests.map(req => JSON.stringify(req)).join('\n');
    
    // Create a file with the batch requests
    const file = await client.files.create({
      file: new File([jsonlContent], 'batch_requests.jsonl', { type: 'application/jsonl' }),
      purpose: 'batch'
    });
    
    console.log(`[TRUE BATCH API] Created input file: ${file.id} using model: ${CLASSIFICATION_MODEL}`);
    
    // Create the batch job
    const batch = await client.batches.create({
      input_file_id: file.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
      metadata: {
        payee_count: payeeNames.length.toString(),
        description: description || 'Payee classification batch'
      }
    });
    
    console.log(`[TRUE BATCH API] Created batch job: ${batch.id} with updated model`);
    
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
        description: description || 'Payee classification batch'
      }
    };
  }, { timeout: 60000, retries: 2 }); // 60s timeout with 2 retries
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
        description: batch.metadata.description || 'Payee classification batch'
      } : undefined
    };
  }, { timeout: 15000, retries: 1 }); // Shorter timeout for status checks
}

/**
 * Retrieve and parse batch job results
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
    
    console.log(`[TRUE BATCH API] Retrieving results from file: ${batchJob.output_file_id}`);
    
    // Get the output file content
    const fileContent = await client.files.content(batchJob.output_file_id!);
    const responseText = await fileContent.text();
    
    // Parse JSONL results
    const results: BatchJobResult[] = responseText
      .trim()
      .split('\n')
      .filter(line => line.trim()) // Remove empty lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error('[TRUE BATCH API] Error parsing result line:', line, error);
          return null;
        }
      })
      .filter(result => result !== null);
    
    console.log(`[TRUE BATCH API] Parsed ${results.length} results`);
    logMemoryUsage('getBatchJobResults');
    
    // Map results back to payee names
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
          return {
            payeeName: name,
            classification: parsed.classification || 'Individual',
            confidence: parsed.confidence || 50,
            reasoning: parsed.reasoning || 'Classified via OpenAI Batch API',
            status: 'success'
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
    
    return classificationResults;
  }, { timeout: 120000, retries: 2 }); // 2 minute timeout for large files
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
        description: batch.metadata.description || 'Payee classification batch'
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
