-- Add processing_results status validation for batch_jobs
-- This ensures jobs go through proper processing phases before completion

-- Add a check constraint to validate status values including the new processing_results status
ALTER TABLE public.batch_jobs 
DROP CONSTRAINT IF EXISTS batch_jobs_status_check;

ALTER TABLE public.batch_jobs 
ADD CONSTRAINT batch_jobs_status_check 
CHECK (status IN ('validating', 'in_progress', 'finalizing', 'processing_results', 'completed', 'failed', 'expired', 'cancelled'));

-- Update the auto_generate_files_on_completion function to handle the new flow
CREATE OR REPLACE FUNCTION public.auto_generate_files_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- When OpenAI job completes, set to processing_results instead of completed
  IF NEW.status = 'completed' 
     AND NEW.request_counts_completed > 0 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Change status to processing_results to indicate we're now processing
    NEW.status = 'processing_results';
    
    -- Set processing timestamp
    NEW.file_generated_at = now();
    
    -- Queue for background processing
    INSERT INTO public.file_generation_queue (batch_job_id, status, created_at)
    VALUES (NEW.id, 'pending', now())
    ON CONFLICT (batch_job_id) DO UPDATE SET
      status = 'pending',
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;