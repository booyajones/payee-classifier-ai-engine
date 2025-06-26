
-- Phase 1: Add JSONB indexes for faster large data operations
CREATE INDEX IF NOT EXISTS idx_batch_jobs_original_file_data_gin 
ON batch_jobs USING GIN (original_file_data);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_row_mappings_gin 
ON batch_jobs USING GIN (row_mappings);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_metadata_gin 
ON batch_jobs USING GIN (metadata);

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status 
ON batch_jobs (status);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status_created_at 
ON batch_jobs (status, app_created_at DESC);

-- Increase statement timeout for large JSONB operations (5 minutes)
-- This needs to be set at the session level, so we'll handle it in the application code
