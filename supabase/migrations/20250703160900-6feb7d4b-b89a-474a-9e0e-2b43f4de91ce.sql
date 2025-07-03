-- Create table to store generated file blobs for each batch job
CREATE TABLE public.batch_job_files (
  job_id TEXT PRIMARY KEY REFERENCES public.batch_jobs(id) ON DELETE CASCADE,
  csv_data BYTEA,
  excel_data BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger to keep updated_at current
CREATE TRIGGER update_batch_job_files_updated_at
  BEFORE UPDATE ON public.batch_job_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS and allow all operations for now
ALTER TABLE public.batch_job_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on batch_job_files"
  ON public.batch_job_files
  FOR ALL
  USING (true)
  WITH CHECK (true);
