/**
 * Instant Download Service - Main API
 * 
 * Provides a unified interface for instant download functionality
 * while delegating to specialized modules for different operations.
 */

import { InstantDownloadChecker, type InstantDownloadStatus } from './instantDownload/instantDownloadChecker';
import { BulkJobProcessor, type BulkProcessingResult } from './instantDownload/bulkJobProcessor';
import { SingleJobProcessor, type SingleJobResult } from './instantDownload/singleJobProcessor';

export class InstantDownloadService {
  /**
   * Check if a job has instant download files ready
   */
  static async hasInstantDownload(jobId: string): Promise<InstantDownloadStatus> {
    return InstantDownloadChecker.hasInstantDownload(jobId);
  }

  /**
   * Process all existing completed jobs to ensure they have instant downloads
   */
  static async processExistingCompletedJobs(): Promise<BulkProcessingResult> {
    return BulkJobProcessor.processExistingCompletedJobs();
  }

  /**
   * Ensure a specific job has instant download ready
   */
  static async ensureJobReady(jobId: string): Promise<SingleJobResult> {
    return SingleJobProcessor.ensureJobReady(jobId);
  }
}

// Export types for convenience
export type { InstantDownloadStatus, BulkProcessingResult, SingleJobResult };