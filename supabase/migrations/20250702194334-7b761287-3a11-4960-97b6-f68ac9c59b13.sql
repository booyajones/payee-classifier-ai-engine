-- Create a trigger function to automatically generate files when jobs complete
CREATE OR REPLACE FUNCTION public.auto_generate_files_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger for completed jobs with completed requests and no existing files
  IF NEW.status = 'completed' 
     AND NEW.request_counts_completed > 0 
     AND (NEW.csv_file_url IS NULL OR NEW.excel_file_url IS NULL) 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Set file generation timestamp
    NEW.file_generated_at = now();
    
    -- Log the trigger activation (will be processed by background services)
    INSERT INTO public.file_generation_queue (batch_job_id, status, created_at)
    VALUES (NEW.id, 'pending', now())
    ON CONFLICT (batch_job_id) DO UPDATE SET
      status = 'pending',
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a queue table for file generation tasks
CREATE TABLE IF NOT EXISTS public.file_generation_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_job_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on file generation queue
ALTER TABLE public.file_generation_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for file generation queue
CREATE POLICY "Allow all operations on file_generation_queue" 
ON public.file_generation_queue 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger on batch_jobs table
DROP TRIGGER IF EXISTS trigger_auto_generate_files ON public.batch_jobs;
CREATE TRIGGER trigger_auto_generate_files
  BEFORE UPDATE ON public.batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_files_on_completion();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_file_generation_queue_status ON public.file_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_file_generation_queue_created_at ON public.file_generation_queue(created_at);

-- Update function to handle file generation queue updates
CREATE OR REPLACE FUNCTION public.update_file_generation_queue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at on file generation queue
DROP TRIGGER IF EXISTS trigger_update_file_generation_queue_updated_at ON public.file_generation_queue;
CREATE TRIGGER trigger_update_file_generation_queue_updated_at
  BEFORE UPDATE ON public.file_generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_file_generation_queue_updated_at();