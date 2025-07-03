-- Complete System Cleanup and Reset
-- Stop all active processing and delete all data

-- Step 1: Clear the file generation queue (stop all stuck processes)
DELETE FROM file_generation_queue;

-- Step 2: Delete all payee classifications 
DELETE FROM payee_classifications;

-- Step 3: Delete all batch jobs (this will stop the in-progress job and clean up all data)
DELETE FROM batch_jobs;

-- Step 4: Reset any auto-increment sequences if needed
-- (No sequences to reset in this schema)

-- Verification queries (these will run but not return data since we're in a migration)
-- After migration, you can run these to verify cleanup:
-- SELECT COUNT(*) FROM batch_jobs; -- Should return 0
-- SELECT COUNT(*) FROM file_generation_queue; -- Should return 0  
-- SELECT COUNT(*) FROM payee_classifications; -- Should return 0
