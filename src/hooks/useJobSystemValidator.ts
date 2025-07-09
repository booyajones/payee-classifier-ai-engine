import { useState, useEffect, useCallback } from 'react';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { JobSystemCleaner, CleanupReport } from '@/lib/utils/jobSystemCleaner';
import { PhantomJobDetector } from '@/lib/utils/phantomJobDetector';

export interface ValidationState {
  isValidating: boolean;
  isCleaningUp: boolean;
  lastCleanup: CleanupReport | null;
  autoValidationEnabled: boolean;
  validationErrors: string[];
}

export const useJobSystemValidator = () => {
  const {
    jobs,
    payeeDataMap,
    removeJob,
    addJob,
    setJobs,
    getJob,
    setPayeeDataMap,
    getPayeeData,
    isLoaded
  } = useBatchJobStore();

  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isCleaningUp: false,
    lastCleanup: null,
    autoValidationEnabled: true,
    validationErrors: []
  });

  // Store operations interface
  const storeOps = {
    removeJob,
    addJob,
    setJobs,
    getJob,
    setPayeeDataMap,
    getPayeeData
  };

  // Validate jobs without cleanup
  const validateJobs = useCallback(async () => {
    if (validationState.isValidating || jobs.length === 0) return null;

    setValidationState(prev => ({ ...prev, isValidating: true, validationErrors: [] }));

    try {
      const report = await PhantomJobDetector.validateJobs(jobs);
      console.log('[JOB VALIDATOR] Validation complete:', report);
      
      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        validationErrors: report.errors
      }));

      return report;
    } catch (error) {
      console.error('[JOB VALIDATOR] Validation failed:', error);
      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        validationErrors: [error instanceof Error ? error.message : 'Validation failed']
      }));
      return null;
    }
  }, [jobs, validationState.isValidating]);

  // Perform full cleanup
  const performCleanup = useCallback(async (force = false) => {
    if (!force && validationState.isCleaningUp) return null;

    setValidationState(prev => ({ ...prev, isCleaningUp: true }));

    try {
      const report = await JobSystemCleaner.performFullCleanup(
        jobs,
        payeeDataMap,
        storeOps
      );

      console.log('[JOB VALIDATOR] Cleanup complete:', report);
      
      setValidationState(prev => ({
        ...prev,
        isCleaningUp: false,
        lastCleanup: report
      }));

      return report;
    } catch (error) {
      console.error('[JOB VALIDATOR] Cleanup failed:', error);
      setValidationState(prev => ({
        ...prev,
        isCleaningUp: false,
        validationErrors: [error instanceof Error ? error.message : 'Cleanup failed']
      }));
      return null;
    }
  }, [jobs, payeeDataMap, validationState.isCleaningUp, storeOps]);

  // Quick cleanup for specific jobs
  const quickCleanup = useCallback(async (jobIds: string[]) => {
    try {
      const result = await JobSystemCleaner.quickCleanup(jobIds, storeOps);
      console.log('[JOB VALIDATOR] Quick cleanup complete:', result);
      return result;
    } catch (error) {
      console.error('[JOB VALIDATOR] Quick cleanup failed:', error);
      return { removed: [], errors: [error instanceof Error ? error.message : 'Quick cleanup failed'] };
    }
  }, [storeOps]);

  // Auto-validation on startup
  useEffect(() => {
    if (!isLoaded || !validationState.autoValidationEnabled || jobs.length === 0) return;

    const timer = setTimeout(() => {
      console.log('[JOB VALIDATOR] Starting auto-validation...');
      validateJobs().then(report => {
        if (report && report.phantomJobs.length > 0) {
          console.log(`[JOB VALIDATOR] Found ${report.phantomJobs.length} phantom jobs, starting auto-cleanup...`);
          performCleanup();
        }
      });
    }, 2000); // Wait 2 seconds after load

    return () => clearTimeout(timer);
  }, [isLoaded, validationState.autoValidationEnabled, jobs.length, validateJobs, performCleanup]);

  // Toggle auto-validation
  const toggleAutoValidation = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      autoValidationEnabled: !prev.autoValidationEnabled
    }));
  }, []);

  // Clear validation errors
  const clearValidationErrors = useCallback(() => {
    setValidationState(prev => ({ ...prev, validationErrors: [] }));
  }, []);

  return {
    validationState,
    validateJobs,
    performCleanup,
    quickCleanup,
    toggleAutoValidation,
    clearValidationErrors,
    hasPhantomJobs: validationState.lastCleanup?.phantomJobsRemoved.length ?? 0 > 0
  };
};