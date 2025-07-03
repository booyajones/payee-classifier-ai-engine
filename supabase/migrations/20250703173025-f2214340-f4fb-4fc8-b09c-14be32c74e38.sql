-- Fix the stuck job by updating its status to completed
UPDATE batch_jobs 
SET 
  status = 'completed',
  completed_at_timestamp = EXTRACT(EPOCH FROM NOW())::bigint,
  app_updated_at = NOW()
WHERE id = 'batch_68669d65a048819096999bba3842fda5' 
  AND status = 'processing_results';