
// Web Worker for heavy file processing operations
import { parseUploadedFile } from '../utils';
import { createPayeeRowMapping, type PayeeRowData } from '../rowMapping';

// Basic representation of a row from the uploaded file
export interface FileDataRow {
  [key: string]: unknown;
}

// Payload structures for different worker tasks
export interface ParseFilePayload {
  file: File;
}

export interface CreateMappingsPayload {
  fileData: FileDataRow[];
  column: string;
}

export interface ProcessChunkPayload {
  chunk: FileDataRow[];
  processor: string;
}

export type WorkerMessage =
  | { type: 'PARSE_FILE'; payload: ParseFilePayload; taskId: string }
  | { type: 'CREATE_MAPPINGS'; payload: CreateMappingsPayload; taskId: string }
  | { type: 'PROCESS_CHUNK'; payload: ProcessChunkPayload; taskId: string };

export type WorkerResponse<T = unknown> =
  | { type: 'PROGRESS'; taskId: string; progress: number }
  | { type: 'SUCCESS'; taskId: string; data: T }
  | { type: 'ERROR'; taskId: string; error: string };

// Mapping between task types, their payloads and expected results
export interface WorkerTaskMap {
  PARSE_FILE: { payload: ParseFilePayload; response: FileDataRow[] };
  CREATE_MAPPINGS: { payload: CreateMappingsPayload; response: PayeeRowData };
  PROCESS_CHUNK: { payload: ProcessChunkPayload; response: FileDataRow[] };
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

  private async parseFile(file: File, taskId: string): Promise<WorkerResponse<FileDataRow[]>> {
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

  private async createMappings(fileData: FileDataRow[], column: string, taskId: string): Promise<WorkerResponse<PayeeRowData>> {
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

  private async processChunk(chunk: FileDataRow[], processor: string, taskId: string): Promise<WorkerResponse<FileDataRow[]>> {
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
