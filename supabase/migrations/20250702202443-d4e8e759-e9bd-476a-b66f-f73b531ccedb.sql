-- Enable realtime updates for batch_jobs table
-- Set REPLICA IDENTITY FULL to capture complete row data during updates
ALTER TABLE public.batch_jobs REPLICA IDENTITY FULL;

-- Add batch_jobs table to supabase_realtime publication to enable real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_jobs;