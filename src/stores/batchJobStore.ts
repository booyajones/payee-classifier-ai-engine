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
    updateJob: (job) => set((state) => ({
      jobs: state.jobs.map(j => j.id === job.id ? job : j)
    })),
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