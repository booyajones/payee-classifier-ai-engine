import { supabase } from '@/integrations/supabase/client';
import { BatchJob } from '@/lib/openai/trueBatchAPI';

export interface PhantomJobReport {
  phantomJobs: string[];
  validJobs: string[];
  errors: string[];
  totalChecked: number;
}

export class PhantomJobDetector {
  /**
   * Validate that UI jobs exist in the database
   */
  static async validateJobs(jobs: BatchJob[]): Promise<PhantomJobReport> {
    const report: PhantomJobReport = {
      phantomJobs: [],
      validJobs: [],
      errors: [],
      totalChecked: jobs.length
    };

    if (jobs.length === 0) {
      return report;
    }

    try {
      // Get all job IDs from database
      const { data: dbJobs, error } = await supabase
        .from('batch_jobs')
        .select('id')
        .in('id', jobs.map(j => j.id));

      if (error) {
        console.error('[PHANTOM DETECTOR] Database error:', error);
        report.errors.push(`Database error: ${error.message}`);
        return report;
      }

      const dbJobIds = new Set(dbJobs?.map(job => job.id) || []);

      // Check each UI job against database
      for (const job of jobs) {
        if (dbJobIds.has(job.id)) {
          report.validJobs.push(job.id);
        } else {
          console.warn(`[PHANTOM DETECTOR] Found phantom job: ${job.id}`);
          report.phantomJobs.push(job.id);
        }
      }

      console.log(`[PHANTOM DETECTOR] Validation complete: ${report.validJobs.length} valid, ${report.phantomJobs.length} phantom jobs`);
      
    } catch (error) {
      console.error('[PHANTOM DETECTOR] Validation error:', error);
      report.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return report;
  }

  /**
   * Check if a single job exists in the database
   */
  static async validateSingleJob(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('id')
        .eq('id', jobId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`[PHANTOM DETECTOR] Error validating job ${jobId}:`, error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error(`[PHANTOM DETECTOR] Exception validating job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get database jobs that aren't in the UI store
   */
  static async findMissingUIJobs(uiJobIds: string[]): Promise<BatchJob[]> {
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('*')
        .not('id', 'in', `(${uiJobIds.map(id => `"${id}"`).join(',')})`)
        .order('app_created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[PHANTOM DETECTOR] Error finding missing UI jobs:', error);
        return [];
      }

      // Convert to BatchJob format
      return (data || []).map(record => ({
        id: record.id,
        status: record.status as BatchJob['status'],
        created_at: record.created_at_timestamp,
        completed_at: record.completed_at_timestamp || undefined,
        failed_at: record.failed_at_timestamp || undefined,
        expired_at: record.expired_at_timestamp || undefined,
        finalizing_at: record.finalizing_at_timestamp || undefined,
        in_progress_at: record.in_progress_at_timestamp || undefined,
        cancelled_at: record.cancelled_at_timestamp || undefined,
        output_file_id: record.output_file_id || undefined,
        error_file_id: undefined,
        errors: record.errors || undefined,
        input_file_id: undefined,
        completion_window: '24h',
        request_counts: {
          total: record.request_counts_total,
          completed: record.request_counts_completed,
          failed: record.request_counts_failed
        },
        metadata: record.metadata as any
      }));
    } catch (error) {
      console.error('[PHANTOM DETECTOR] Exception finding missing UI jobs:', error);
      return [];
    }
  }
}