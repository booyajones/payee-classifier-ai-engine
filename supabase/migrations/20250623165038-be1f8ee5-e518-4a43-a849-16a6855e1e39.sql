
-- Add the missing updated_at column to the batch_jobs table
ALTER TABLE public.batch_jobs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create or replace the trigger function to handle updated_at
CREATE OR REPLACE FUNCTION public.update_batch_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_batch_jobs_updated_at_trigger ON public.batch_jobs;

CREATE TRIGGER update_batch_jobs_updated_at_trigger
    BEFORE UPDATE ON public.batch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_batch_jobs_updated_at();
