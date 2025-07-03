-- Database Cleanup and Reversion Plan Implementation

-- Phase 1: Stop Automated Processing
-- Drop the problematic trigger that automatically changes job statuses
DROP TRIGGER IF EXISTS trigger_auto_generate_files ON public.batch_jobs;

-- Phase 2: Clean Up Status Issues
-- Reset any jobs stuck in 'processing_results' back to 'completed'
UPDATE public.batch_jobs 
SET status = 'completed'
WHERE status = 'processing_results' 
  AND request_counts_completed > 0;

-- Clear all entries from the file generation queue to prevent conflicts
DELETE FROM public.file_generation_queue;

-- Phase 3: Simplify Database Functions
-- Drop the problematic auto-generation function
DROP FUNCTION IF EXISTS public.auto_generate_files_on_completion();

-- Phase 4: Data Integrity Restoration
-- Ensure the specific batch job maintains completed status
UPDATE public.batch_jobs 
SET status = 'completed'
WHERE id = 'batch_68669d65a048819096999bba3842fda5'
  AND status != 'completed';

-- Phase 5: Keep only essential triggers
-- Ensure the updated_at trigger still works for batch_jobs
CREATE OR REPLACE FUNCTION public.update_batch_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create the simple updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_batch_jobs_updated_at ON public.batch_jobs;
CREATE TRIGGER trigger_update_batch_jobs_updated_at
  BEFORE UPDATE ON public.batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_batch_jobs_updated_at();

-- Log the cleanup completion
INSERT INTO public.file_generation_queue (batch_job_id, status, created_at, last_error)
VALUES ('cleanup_completed', 'completed', now(), 'Database cleanup and reversion completed successfully');