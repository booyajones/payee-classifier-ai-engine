
-- Create table for storing batch job metadata and payee row data
CREATE TABLE public.batch_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at_timestamp BIGINT NOT NULL,
  in_progress_at_timestamp BIGINT,
  finalizing_at_timestamp BIGINT,
  completed_at_timestamp BIGINT,
  failed_at_timestamp BIGINT,
  expired_at_timestamp BIGINT,
  cancelled_at_timestamp BIGINT,
  request_counts_total INTEGER NOT NULL DEFAULT 0,
  request_counts_completed INTEGER NOT NULL DEFAULT 0,
  request_counts_failed INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  errors JSONB,
  output_file_id TEXT,
  
  -- Payee row data (previously stored in localStorage)
  unique_payee_names TEXT[] NOT NULL,
  original_file_data JSONB NOT NULL,
  row_mappings JSONB NOT NULL,
  file_name TEXT,
  file_headers TEXT[],
  selected_payee_column TEXT,
  
  -- Timestamps for our app
  app_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  app_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies (assuming this is a multi-user app)
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on batch_jobs" 
  ON public.batch_jobs 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_batch_jobs_updated_at
  BEFORE UPDATE ON public.batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_batch_jobs_status ON public.batch_jobs(status);
CREATE INDEX idx_batch_jobs_created_at ON public.batch_jobs(app_created_at DESC);
