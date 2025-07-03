-- Emergency reset of stalled queue items
UPDATE file_generation_queue 
SET 
  status = 'pending',
  retry_count = 0,
  last_error = 'Emergency reset - system recovery',
  updated_at = now()
WHERE status = 'processing' 
  AND updated_at < now() - interval '5 minutes';
