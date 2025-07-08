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
      
      // Only block updates during true emergencies (rendering issues), not normal operation
      const isEmergencyActive = typeof window !== 'undefined' && (window as any).__EMERGENCY_STOP_ACTIVE;
      if (isEmergencyActive) {
        console.log(`[STORE] Emergency stop active but allowing data update for ${job.id.substring(0, 8)}`);
        // Allow data updates but log them during emergency stop
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

      // More permissive change detection - allow updates for active jobs
      const existingJob = state.jobs.find(j => j.id === job.id);
      if (existingJob && ['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
        const statusChanged = existingJob.status !== job.status;
        const progressChanged = existingJob.request_counts?.completed !== job.request_counts?.completed;
        const outputChanged = existingJob.output_file_id !== job.output_file_id;
        
        if (!statusChanged && !progressChanged && !outputChanged) {
          console.log(`[STORE] Skipping non-critical update for ${job.id.substring(0, 8)}`);
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
    clearAllJobs: () => set({
      jobs: [],
      payeeDataMap: {},
      processing: new Set(),
      errors: {},
      selectedJobId: null
    }),

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