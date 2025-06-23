
// Web Worker for heavy file processing operations
import { parseUploadedFile } from '../utils';
import { createPayeeRowMapping } from '../rowMapping';

export interface WorkerMessage {
  type: 'PARSE_FILE' | 'CREATE_MAPPINGS' | 'PROCESS_CHUNK';
  payload: any;
  taskId: string;
}

export interface WorkerResponse {
  type: 'PROGRESS' | 'SUCCESS' | 'ERROR';
  taskId: string;
  data?: any;
  error?: string;
  progress?: number;
}

class FileProcessingWorker {
  private processingTasks = new Map<string, AbortController>();

  async handleMessage(message: WorkerMessage): Promise<WorkerResponse> {
    const { type, payload, taskId } = message;
    
    try {
      switch (type) {
        case 'PARSE_FILE':
          return await this.parseFile(payload.file, taskId);
        
        case 'CREATE_MAPPINGS':
          return await this.createMappings(payload.fileData, payload.column, taskId);
        
        case 'PROCESS_CHUNK':
          return await this.processChunk(payload.chunk, payload.processor, taskId);
        
        default:
          throw new Error(`Unknown task type: ${type}`);
      }
    } catch (error) {
      return {
        type: 'ERROR',
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async parseFile(file: File, taskId: string): Promise<WorkerResponse> {
    const controller = new AbortController();
    this.processingTasks.set(taskId, controller);

    try {
      // Send progress updates
      this.sendProgress(taskId, 10);
      
      const data = await parseUploadedFile(file);
      
      this.sendProgress(taskId, 100);
      
      return {
        type: 'SUCCESS',
        taskId,
        data
      };
    } finally {
      this.processingTasks.delete(taskId);
    }
  }

  private async createMappings(fileData: any[], column: string, taskId: string): Promise<WorkerResponse> {
    const controller = new AbortController();
    this.processingTasks.set(taskId, controller);

    try {
      this.sendProgress(taskId, 20);
      
      const mappings = createPayeeRowMapping(fileData, column);
      
      this.sendProgress(taskId, 100);
      
      return {
        type: 'SUCCESS',
        taskId,
        data: mappings
      };
    } finally {
      this.processingTasks.delete(taskId);
    }
  }

  private async processChunk(chunk: any[], processor: string, taskId: string): Promise<WorkerResponse> {
    const controller = new AbortController();
    this.processingTasks.set(taskId, controller);

    try {
      // Simulate chunk processing with progress updates
      const results = [];
      for (let i = 0; i < chunk.length; i++) {
        if (controller.signal.aborted) {
          throw new Error('Task aborted');
        }
        
        // Process item (placeholder)
        results.push(chunk[i]);
        
        if (i % 100 === 0) {
          this.sendProgress(taskId, (i / chunk.length) * 100);
        }
      }
      
      return {
        type: 'SUCCESS',
        taskId,
        data: results
      };
    } finally {
      this.processingTasks.delete(taskId);
    }
  }

  private sendProgress(taskId: string, progress: number) {
    self.postMessage({
      type: 'PROGRESS',
      taskId,
      progress
    });
  }

  cancelTask(taskId: string) {
    const controller = this.processingTasks.get(taskId);
    if (controller) {
      controller.abort();
      this.processingTasks.delete(taskId);
    }
  }
}

const worker = new FileProcessingWorker();

self.addEventListener('message', async (event) => {
  const message = event.data as WorkerMessage;
  const response = await worker.handleMessage(message);
  self.postMessage(response);
});

export default worker;
