
import { useState } from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface BatchJobState {
  jobs: BatchJob[];
  payeeDataMap: Record<string, PayeeRowData>;
  processing: Set<string>;
  errors: Record<string, string>;
  isLoaded: boolean;
}

export const useBatchJobState = () => {
  const [state, setState] = useState<BatchJobState>({
    jobs: [],
    payeeDataMap: {},
    processing: new Set(),
    errors: {},
    isLoaded: false
  });

  const updateJobs = (jobs: BatchJob[]) => {
    setState(prev => ({ ...prev, jobs }));
  };

  const updatePayeeDataMap = (payeeDataMap: Record<string, PayeeRowData>) => {
    setState(prev => ({ ...prev, payeeDataMap }));
  };

  const addJob = (job: BatchJob, payeeRowData: PayeeRowData) => {
    setState(prev => ({
      ...prev,
      jobs: [...prev.jobs, job],
      payeeDataMap: { ...prev.payeeDataMap, [job.id]: payeeRowData }
    }));
  };

  const updateJob = (updatedJob: BatchJob) => {
    setState(prev => ({
      ...prev,
      jobs: prev.jobs.map(job => job.id === updatedJob.id ? updatedJob : job)
    }));
  };

  const removeJob = (jobId: string) => {
    setState(prev => {
      const updatedJobs = prev.jobs.filter(job => job.id !== jobId);
      const updatedPayeeDataMap = Object.fromEntries(
        Object.entries(prev.payeeDataMap).filter(([id]) => id !== jobId)
      );
      const updatedErrors = Object.fromEntries(
        Object.entries(prev.errors).filter(([id]) => id !== jobId)
      );
      
      return {
        ...prev,
        jobs: updatedJobs,
        payeeDataMap: updatedPayeeDataMap,
        errors: updatedErrors
      };
    });
  };

  const clearAllJobs = () => {
    setState({
      jobs: [],
      payeeDataMap: {},
      processing: new Set(),
      errors: {},
      isLoaded: true
    });
  };

  const setLoaded = (isLoaded: boolean) => {
    setState(prev => ({ ...prev, isLoaded }));
  };

  const setError = (jobId: string, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [jobId]: error }
    }));
  };

  return {
    state,
    setState,
    updateJobs,
    updatePayeeDataMap,
    addJob,
    updateJob,
    removeJob,
    clearAllJobs,
    setLoaded,
    setError
  };
};
