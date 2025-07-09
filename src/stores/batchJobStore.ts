import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { PayeeClassification, BatchProcessingResult } from '@/lib/types';

interface BatchJobState {
  jobs: BatchJob[];
  payeeDataMap: Record<string, PayeeRowData>;
  processing: Set<string>;
  errors: Record<string, string>;
  isLoaded: boolean;
  selectedJobId: string | null;
  autoPollingJobs: Set<string>;
}

interface BatchJobActions {
  // Job management
  setJobs: (jobs: BatchJob[]) => void;
  addJob: (job: BatchJob) => void;
  updateJob: (job: BatchJob) => void;
  removeJob: (jobId: string) => void;
  clearAllJobs: () => void;
  
  // Enhanced job management with validation
  addJobWithValidation: (job: BatchJob) => boolean;
  removeJobsById: (jobIds: string[]) => void;
  validateJobIntegrity: () => string[];
  
  // Payee data management
  setPayeeDataMap: (map: Record<string, PayeeRowData>) => void;
  setPayeeData: (jobId: string, data: PayeeRowData) => void;
  
  // Processing state
  setProcessing: (jobId: string, processing: boolean) => void;
  setError: (jobId: string, error: string) => void;
  clearError: (jobId: string) => void;
  
  // UI state
  setLoaded: (loaded: boolean) => void;
  setSelectedJobId: (jobId: string | null) => void;
  
  // Auto polling
  startAutoPolling: (jobId: string) => void;
  stopAutoPolling: (jobId: string) => void;
  
  // Utilities
  getJob: (jobId: string) => BatchJob | undefined;
  getPayeeData: (jobId: string) => PayeeRowData | undefined;
  isProcessing: (jobId: string) => boolean;
  hasError: (jobId: string) => boolean;
  getError: (jobId: string) => string | undefined;
}

export const useBatchJobStore = create<BatchJobState & BatchJobActions>()(
  subscribeWithSelector((set, get) => ({
    // State
    jobs: [],
    payeeDataMap: {},
    processing: new Set(),
    errors: {},
    isLoaded: false,
    selectedJobId: null,
    autoPollingJobs: new Set(),

    // Job management
    setJobs: (jobs) => set({ jobs }),
    addJob: (job) => set((state) => ({ 
      jobs: [...state.jobs.filter(j => j.id !== job.id), job] 
    })),
    updateJob: (job) => set((state) => {
      console.log(`[STORE] Updating job ${job.id.substring(0, 8)} with status: ${job.status}`);
      
      // RESPONSIVENESS FIX: Allow data updates to flow through more freely
      const isEmergencyActive = typeof window !== 'undefined' && (window as any).__EMERGENCY_STOP_ACTIVE;
      if (isEmergencyActive) {
        console.log(`[STORE] Emergency stop active - allowing data update for ${job.id.substring(0, 8)}`);
        // Continue with update - only block extreme rendering loops, not data flow
      }

      // Smart filtering for completed jobs - only skip if truly no changes
      if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
        const existingJob = state.jobs.find(j => j.id === job.id);
        if (existingJob && 
            existingJob.status === job.status && 
            existingJob.request_counts?.completed === job.request_counts?.completed &&
            existingJob.output_file_id === job.output_file_id &&
            existingJob.metadata === job.metadata) {
          console.log(`[STORE] Skipping identical update for completed job ${job.id.substring(0, 8)}`);
          return state; // No meaningful changes for completed jobs
        }
      }

      // Extended job age limit to 24 hours for better user experience
      const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
      if (jobAge > 24 * 60 * 60 * 1000) {
        console.warn(`[STORE] Blocking update for very old job ${job.id.substring(0, 8)} (age: ${Math.round(jobAge/3600000)}h)`);
        return state;
      }

      // RESPONSIVENESS FIX: More permissive updates for active jobs
      const existingJob = state.jobs.find(j => j.id === job.id);
      const isActiveJob = ['validating', 'in_progress', 'finalizing'].includes(job.status);
      
      // Always allow updates for active jobs to ensure responsive UI
      if (isActiveJob) {
        console.log(`[STORE] Allowing update for active job ${job.id.substring(0, 8)}: ${job.status}`);
      } else if (existingJob && ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
        const statusChanged = existingJob.status !== job.status;
        const progressChanged = existingJob.request_counts?.completed !== job.request_counts?.completed;
        const outputChanged = existingJob.output_file_id !== job.output_file_id;
        
        if (!statusChanged && !progressChanged && !outputChanged) {
          console.log(`[STORE] Skipping non-critical update for completed job ${job.id.substring(0, 8)}`);
          return state; // Skip update if no critical changes for completed jobs
        }
      }

      // Update job with better logging
      let updatedJobs = state.jobs.map(j => j.id === job.id ? job : j);
      
      // If adding new job, ensure we don't exceed limit
      if (!existingJob) {
        console.log(`[STORE] Adding new job ${job.id.substring(0, 8)} to store`);
        updatedJobs = [...updatedJobs, job];
        
        // Keep only latest 50 jobs to prevent memory issues
        if (updatedJobs.length > 50) {
          updatedJobs = updatedJobs
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, 50);
          console.log(`[STORE] Trimmed job store to 50 jobs`);
        }
      } else {
        console.log(`[STORE] Updated existing job ${job.id.substring(0, 8)}: ${existingJob.status} -> ${job.status}`);
      }

      return { jobs: updatedJobs };
    }),
    removeJob: (jobId) => set((state) => ({
      jobs: state.jobs.filter(j => j.id !== jobId),
      payeeDataMap: Object.fromEntries(
        Object.entries(state.payeeDataMap).filter(([key]) => key !== jobId)
      ),
      processing: new Set(Array.from(state.processing).filter(id => id !== jobId)),
      errors: Object.fromEntries(
        Object.entries(state.errors).filter(([key]) => key !== jobId)
      )
    })),
    clearAllJobs: () => {
      console.log('[STORE] Clearing all jobs and resetting store state');
      set({
        jobs: [],
        payeeDataMap: {},
        processing: new Set(),
        errors: {},
        selectedJobId: null,
        isLoaded: false
      });
    },

    // Enhanced job management with validation
    addJobWithValidation: (job) => {
      const state = get();
      
      // Validation guards
      if (!job.id || !job.status) {
        console.warn(`[STORE] Rejected invalid job: missing id or status`);
        return false;
      }

      // Check for duplicates
      if (state.jobs.find(j => j.id === job.id)) {
        console.warn(`[STORE] Job ${job.id} already exists, updating instead`);
        state.updateJob(job);
        return true;
      }

      // Age validation (don't add very old jobs)
      const jobAge = Date.now() - new Date(job.created_at * 1000).getTime();
      if (jobAge > 7 * 24 * 60 * 60 * 1000) { // 7 days
        console.warn(`[STORE] Rejected very old job ${job.id} (age: ${Math.round(jobAge/86400000)} days)`);
        return false;
      }

      console.log(`[STORE] Adding validated job ${job.id.substring(0, 8)} with status: ${job.status}`);
      set((state) => ({ jobs: [...state.jobs, job] }));
      return true;
    },

    removeJobsById: (jobIds) => set((state) => {
      console.log(`[STORE] Removing jobs: ${jobIds.map(id => id.substring(0, 8)).join(', ')}`);
      return {
        jobs: state.jobs.filter(j => !jobIds.includes(j.id)),
        payeeDataMap: Object.fromEntries(
          Object.entries(state.payeeDataMap).filter(([key]) => !jobIds.includes(key))
        ),
        processing: new Set(Array.from(state.processing).filter(id => !jobIds.includes(id))),
        errors: Object.fromEntries(
          Object.entries(state.errors).filter(([key]) => !jobIds.includes(key))
        )
      };
    }),

    validateJobIntegrity: () => {
      const state = get();
      const issues: string[] = [];

      state.jobs.forEach(job => {
        // Check required fields
        if (!job.id) issues.push(`Job missing ID`);
        if (!job.status) issues.push(`Job ${job.id} missing status`);
        if (!job.created_at) issues.push(`Job ${job.id} missing created_at`);
        
        // Check for orphaned processing states
        if (state.processing.has(job.id) && ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
          issues.push(`Job ${job.id} has orphaned processing state`);
        }
      });

      // Check for orphaned payee data
      Object.keys(state.payeeDataMap).forEach(jobId => {
        if (!state.jobs.find(j => j.id === jobId)) {
          issues.push(`Orphaned payee data for job ${jobId}`);
        }
      });

      if (issues.length > 0) {
        console.warn(`[STORE] Integrity issues found:`, issues);
      }
      
      return issues;
    },

    // Payee data management
    setPayeeDataMap: (map) => set({ payeeDataMap: map }),
    setPayeeData: (jobId, data) => set((state) => ({
      payeeDataMap: { ...state.payeeDataMap, [jobId]: data }
    })),

    // Processing state
    setProcessing: (jobId, processing) => set((state) => {
      const newProcessing = new Set(state.processing);
      if (processing) {
        newProcessing.add(jobId);
      } else {
        newProcessing.delete(jobId);
      }
      return { processing: newProcessing };
    }),
    setError: (jobId, error) => set((state) => ({
      errors: { ...state.errors, [jobId]: error }
    })),
    clearError: (jobId) => set((state) => ({
      errors: Object.fromEntries(
        Object.entries(state.errors).filter(([key]) => key !== jobId)
      )
    })),

    // UI state
    setLoaded: (loaded) => set({ isLoaded: loaded }),
    setSelectedJobId: (jobId) => set({ selectedJobId: jobId }),

    // Auto polling
    startAutoPolling: (jobId) => set((state) => ({
      autoPollingJobs: new Set(state.autoPollingJobs).add(jobId)
    })),
    stopAutoPolling: (jobId) => set((state) => {
      const newSet = new Set(state.autoPollingJobs);
      newSet.delete(jobId);
      return { autoPollingJobs: newSet };
    }),

    // Utilities
    getJob: (jobId) => get().jobs.find(j => j.id === jobId),
    getPayeeData: (jobId) => get().payeeDataMap[jobId],
    isProcessing: (jobId) => get().processing.has(jobId),
    hasError: (jobId) => Boolean(get().errors[jobId]),
    getError: (jobId) => get().errors[jobId],
  }))
);