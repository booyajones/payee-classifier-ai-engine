import { productionLogger } from '@/lib/logging/productionLogger';
import { startWorker, stopWorker, getQueueStatus } from '@/workers/fileGenerationWorker';

/**
 * Wrapper service used by the React app to query worker status.
 * The actual queue processing logic lives in `src/workers/fileGenerationWorker.ts`.
 */
export class BackgroundFileGenerationService {
  private static running = false;

  static start(): void {
    if (this.running) {
      productionLogger.warn('Background file generation service already running', undefined, 'BACKGROUND_FILE_GEN');
      return;
    }
    this.running = true;
    productionLogger.info('Starting background file generation service', undefined, 'BACKGROUND_FILE_GEN');
    startWorker();
  }

  static stop(): void {
    if (!this.running) return;
    this.running = false;
    stopWorker();
    productionLogger.info('Stopped background file generation service', undefined, 'BACKGROUND_FILE_GEN');
  }

  static async getQueueStatus() {
    return getQueueStatus();
  }
}
