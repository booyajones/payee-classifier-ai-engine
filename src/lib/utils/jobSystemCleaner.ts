import { PhantomJobDetector, PhantomJobReport } from './phantomJobDetector';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

export interface CleanupReport {
  phantomJobsRemoved: string[];
  validJobsKept: string[];
  missingJobsAdded: string[];
  payeeDataCleaned: string[];
  errors: string[];
  totalProcessed: number;
}

export interface JobStoreOperations {
  removeJob: (jobId: string) => void;
  addJob: (job: BatchJob) => void;
  setJobs: (jobs: BatchJob[]) => void;
  getJob: (jobId: string) => BatchJob | undefined;
  setPayeeDataMap: (map: Record<string, PayeeRowData>) => void;
  getPayeeData: (jobId: string) => PayeeRowData | undefined;
}

export class JobSystemCleaner {
  /**
   * Comprehensive cleanup of job system
   */
  static async performFullCleanup(
    currentJobs: BatchJob[],
    currentPayeeData: Record<string, PayeeRowData>,
    storeOps: JobStoreOperations
  ): Promise<CleanupReport> {
    console.log('[JOB CLEANER] Starting comprehensive cleanup...');
    
    const report: CleanupReport = {
      phantomJobsRemoved: [],
      validJobsKept: [],
      missingJobsAdded: [],
      payeeDataCleaned: [],
      errors: [],
      totalProcessed: currentJobs.length
    };

    try {
      // Phase 1: Detect phantom jobs
      const phantomReport = await PhantomJobDetector.validateJobs(currentJobs);
      
      // Phase 2: Remove phantom jobs from UI
      for (const phantomJobId of phantomReport.phantomJobs) {
        try {
          console.log(`[JOB CLEANER] Removing phantom job: ${phantomJobId}`);
          storeOps.removeJob(phantomJobId);
          report.phantomJobsRemoved.push(phantomJobId);
        } catch (error) {
          console.error(`[JOB CLEANER] Error removing phantom job ${phantomJobId}:`, error);
          report.errors.push(`Failed to remove phantom job ${phantomJobId}`);
        }
      }

      // Phase 3: Keep valid jobs
      report.validJobsKept = phantomReport.validJobs;

      // Phase 4: Find and add missing jobs from database
      const validJobIds = currentJobs
        .filter(job => !phantomReport.phantomJobs.includes(job.id))
        .map(job => job.id);
      
      const missingJobs = await PhantomJobDetector.findMissingUIJobs(validJobIds);
      
      for (const missingJob of missingJobs) {
        try {
          console.log(`[JOB CLEANER] Adding missing job: ${missingJob.id}`);
          storeOps.addJob(missingJob);
          report.missingJobsAdded.push(missingJob.id);
        } catch (error) {
          console.error(`[JOB CLEANER] Error adding missing job ${missingJob.id}:`, error);
          report.errors.push(`Failed to add missing job ${missingJob.id}`);
        }
      }

      // Phase 5: Clean up orphaned payee data
      const validJobSet = new Set([
        ...report.validJobsKept,
        ...report.missingJobsAdded
      ]);

      const cleanedPayeeData: Record<string, PayeeRowData> = {};
      
      for (const [jobId, payeeData] of Object.entries(currentPayeeData)) {
        if (validJobSet.has(jobId)) {
          cleanedPayeeData[jobId] = payeeData;
        } else {
          console.log(`[JOB CLEANER] Removing orphaned payee data: ${jobId}`);
          report.payeeDataCleaned.push(jobId);
        }
      }

      storeOps.setPayeeDataMap(cleanedPayeeData);

      // Add any errors from phantom detection
      report.errors.push(...phantomReport.errors);

      console.log(`[JOB CLEANER] Cleanup complete:`, {
        phantomRemoved: report.phantomJobsRemoved.length,
        validKept: report.validJobsKept.length,
        missingAdded: report.missingJobsAdded.length,
        payeeDataCleaned: report.payeeDataCleaned.length,
        errors: report.errors.length
      });

    } catch (error) {
      console.error('[JOB CLEANER] Cleanup failed:', error);
      report.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return report;
  }

  /**
   * Quick validation and cleanup of specific jobs
   */
  static async quickCleanup(
    jobIds: string[],
    storeOps: JobStoreOperations
  ): Promise<{ removed: string[]; errors: string[] }> {
    const removed: string[] = [];
    const errors: string[] = [];

    for (const jobId of jobIds) {
      try {
        const exists = await PhantomJobDetector.validateSingleJob(jobId);
        if (!exists) {
          const job = storeOps.getJob(jobId);
          if (job) {
            console.log(`[JOB CLEANER] Quick removal of phantom job: ${jobId}`);
            storeOps.removeJob(jobId);
            removed.push(jobId);
          }
        }
      } catch (error) {
        console.error(`[JOB CLEANER] Error in quick cleanup for ${jobId}:`, error);
        errors.push(`Failed to validate ${jobId}`);
      }
    }

    return { removed, errors };
  }
}
