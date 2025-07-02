import { supabase } from '@/integrations/supabase/client';
import { BackgroundFileGenerationService } from './backgroundFileGenerationService';
import { productionLogger } from '@/lib/logging/productionLogger';

export interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  fileGeneration: {
    status: 'healthy' | 'warning' | 'critical';
    pendingCount: number;
    failedCount: number;
    processingCount: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    connectionOk: boolean;
    lastError?: string;
  };
  completedJobsWithoutFiles: number;
  issues: Array<{
    type: 'warning' | 'critical';
    message: string;
    suggestion: string;
  }>;
}

export class SystemHealthService {
  /**
   * Perform comprehensive system health check
   */
  static async getSystemHealth(): Promise<SystemHealthStatus> {
    const health: SystemHealthStatus = {
      overall: 'healthy',
      fileGeneration: {
        status: 'healthy',
        pendingCount: 0,
        failedCount: 0,
        processingCount: 0
      },
      database: {
        status: 'healthy',
        connectionOk: true
      },
      completedJobsWithoutFiles: 0,
      issues: []
    };

    try {
      // Check file generation queue
      const queueStatus = await BackgroundFileGenerationService.getQueueStatus();
      health.fileGeneration = {
        ...health.fileGeneration,
        pendingCount: queueStatus.pending,
        failedCount: queueStatus.failed,
        processingCount: queueStatus.processing
      };

      // Evaluate file generation health
      if (queueStatus.failed > 5) {
        health.fileGeneration.status = 'critical';
        health.issues.push({
          type: 'critical',
          message: `${queueStatus.failed} file generation tasks have failed`,
          suggestion: 'Check error logs and consider manual retry'
        });
      } else if (queueStatus.failed > 0 || queueStatus.pending > 10) {
        health.fileGeneration.status = 'warning';
        health.issues.push({
          type: 'warning',
          message: `${queueStatus.failed} failed and ${queueStatus.pending} pending file generation tasks`,
          suggestion: 'Monitor queue processing progress'
        });
      }

      // Check for completed jobs without files
      const { data: jobsWithoutFiles, error: jobsError } = await supabase
        .from('batch_jobs')
        .select('id')
        .eq('status', 'completed')
        .gt('request_counts_completed', 0)
        .or('csv_file_url.is.null,excel_file_url.is.null');

      if (jobsError) {
        health.database.status = 'warning';
        health.database.lastError = jobsError.message;
        health.issues.push({
          type: 'warning',
          message: 'Database query error while checking job status',
          suggestion: 'Check database connectivity and permissions'
        });
      } else {
        health.completedJobsWithoutFiles = jobsWithoutFiles?.length || 0;
        
        if (health.completedJobsWithoutFiles > 10) {
          health.issues.push({
            type: 'critical',
            message: `${health.completedJobsWithoutFiles} completed jobs are missing download files`,
            suggestion: 'Run batch file generation process to fix missing files'
          });
        } else if (health.completedJobsWithoutFiles > 0) {
          health.issues.push({
            type: 'warning',
            message: `${health.completedJobsWithoutFiles} completed jobs are missing download files`,
            suggestion: 'Files should be generated automatically within a few minutes'
          });
        }
      }

      // Test database connection
      try {
        await supabase.from('batch_jobs').select('id').limit(1);
        health.database.connectionOk = true;
      } catch (error) {
        health.database.status = 'critical';
        health.database.connectionOk = false;
        health.database.lastError = error instanceof Error ? error.message : 'Unknown error';
        health.issues.push({
          type: 'critical',
          message: 'Database connection failed',
          suggestion: 'Check network connectivity and database status'
        });
      }

      // Determine overall health
      const hasCriticalIssues = health.issues.some(issue => issue.type === 'critical');
      const hasWarningIssues = health.issues.some(issue => issue.type === 'warning');

      if (hasCriticalIssues) {
        health.overall = 'critical';
      } else if (hasWarningIssues) {
        health.overall = 'warning';
      } else {
        health.overall = 'healthy';
      }

      productionLogger.info('System health check completed', {
        overall: health.overall,
        issueCount: health.issues.length,
        completedJobsWithoutFiles: health.completedJobsWithoutFiles
      }, 'SYSTEM_HEALTH');

      return health;

    } catch (error) {
      productionLogger.error('System health check failed', error, 'SYSTEM_HEALTH');
      
      return {
        overall: 'critical',
        fileGeneration: {
          status: 'critical',
          pendingCount: 0,
          failedCount: 0,
          processingCount: 0
        },
        database: {
          status: 'critical',
          connectionOk: false,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        },
        completedJobsWithoutFiles: 0,
        issues: [{
          type: 'critical',
          message: 'System health check failed to execute',
          suggestion: 'Check application logs for detailed error information'
        }]
      };
    }
  }

  /**
   * Attempt to auto-fix common issues
   */
  static async autoFix(): Promise<{
    success: boolean;
    fixedIssues: string[];
    remainingIssues: string[];
  }> {
    const fixedIssues: string[] = [];
    const remainingIssues: string[] = [];

    try {
      // Auto-fix: Add missing completed jobs to file generation queue
      const { data: missedJobs } = await supabase
        .from('batch_jobs')
        .select('id')
        .eq('status', 'completed')
        .gt('request_counts_completed', 0)
        .or('csv_file_url.is.null,excel_file_url.is.null');

      if (missedJobs && missedJobs.length > 0) {
        for (const job of missedJobs) {
          await supabase
            .from('file_generation_queue')
            .upsert({
              batch_job_id: job.id,
              status: 'pending',
              retry_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'batch_job_id'
            });
        }
        fixedIssues.push(`Added ${missedJobs.length} completed jobs to file generation queue`);
      }

      // Auto-fix: Reset failed queue items that haven't been retried recently
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: stalledFailed } = await supabase
        .from('file_generation_queue')
        .select('id')
        .eq('status', 'failed')
        .lt('updated_at', oneHourAgo);

      if (stalledFailed && stalledFailed.length > 0) {
        await supabase
          .from('file_generation_queue')
          .update({
            status: 'pending',
            retry_count: 0,
            last_error: null,
            updated_at: new Date().toISOString()
          })
          .in('id', stalledFailed.map(item => item.id));

        fixedIssues.push(`Reset ${stalledFailed.length} stalled failed queue items for retry`);
      }

      productionLogger.info('Auto-fix completed', { fixedIssues, remainingIssues }, 'SYSTEM_HEALTH');

      return {
        success: true,
        fixedIssues,
        remainingIssues
      };

    } catch (error) {
      productionLogger.error('Auto-fix failed', error, 'SYSTEM_HEALTH');
      return {
        success: false,
        fixedIssues,
        remainingIssues: ['Auto-fix process failed to execute']
      };
    }
  }
}