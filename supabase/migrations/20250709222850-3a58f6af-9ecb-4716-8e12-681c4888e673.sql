-- Complete System Reset - Clear All Data and Start Fresh

-- Step 1: Stop any active processing by clearing the file generation queue
DELETE FROM file_generation_queue;

-- Step 2: Clear all payee classifications 
DELETE FROM payee_classifications;

-- Step 3: Clear all batch jobs (this will stop the in-progress job and clean up all data)
DELETE FROM batch_jobs;

-- Step 4: Reset any sequences or auto-generated data
-- (No sequences to reset in this schema)

-- Verification: After migration, all tables should be empty
-- You can verify with:
-- SELECT COUNT(*) FROM batch_jobs; -- Should return 0
-- SELECT COUNT(*) FROM payee_classifications; -- Should return 0  
-- SELECT COUNT(*) FROM file_generation_queue; -- Should return 0