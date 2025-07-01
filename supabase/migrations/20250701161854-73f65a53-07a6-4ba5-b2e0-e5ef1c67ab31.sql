
-- Add file storage columns to batch_jobs table for pre-generated files
ALTER TABLE public.batch_jobs 
ADD COLUMN csv_file_url TEXT,
ADD COLUMN excel_file_url TEXT,
ADD COLUMN file_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN file_size_bytes BIGINT;

-- Create a storage bucket for batch result files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('batch-results', 'batch-results', true);

-- Create storage policies for the batch-results bucket
CREATE POLICY "Allow public read access to batch result files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'batch-results');

CREATE POLICY "Allow authenticated users to upload batch result files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'batch-results');

CREATE POLICY "Allow authenticated users to delete batch result files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'batch-results');
