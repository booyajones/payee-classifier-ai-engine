-- Complete System Cleanup and Reset
-- Stop all active processing and delete all data

-- Step 1: Clear the file generation queue (stop all stuck processes)
DELETE FROM file_generation_queue;

-- Step 2: Delete all payee classifications 
DELETE FROM payee_classifications;

-- Step 3: Delete all batch jobs (this will stop the in-progress job and clean up all data)
DELETE FROM batch_jobs;