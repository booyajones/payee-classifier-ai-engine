-- Clean up jobs with invalid ID format (should start with "batch_" followed by long ID)
-- OpenAI batch job IDs have format like "batch_abc123def456..." (much longer)
DELETE FROM batch_jobs 
WHERE id LIKE 'batch_%' 
AND LENGTH(id) < 20;
