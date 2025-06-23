
import { MemoryOptimizer } from '@/lib/performance/memoryOptimization';

export interface StreamingOptions {
  chunkSize?: number;
  memoryThreshold?: number;
  onProgress?: (progress: number, stage: string) => void;
  onChunk?: (chunk: any[], chunkIndex: number) => Promise<void>;
}

export class StreamingFileProcessor {
  private static readonly DEFAULT_CHUNK_SIZE = 1000;
  private static readonly MEMORY_CHECK_INTERVAL = 100;

  static async processFileStream<T>(
    file: File,
    processor: (chunk: any[]) => Promise<T[]>,
    options: StreamingOptions = {}
  ): Promise<T[]> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      memoryThreshold = 0.8,
      onProgress,
      onChunk
    } = options;

    console.log(`[STREAMING] Starting stream processing for ${file.name} (${file.size} bytes)`);
    
    const results: T[] = [];
    let processedItems = 0;
    let chunkIndex = 0;

    try {
      // Create streaming reader
      const reader = await this.createStreamingReader(file);
      const totalSize = file.size;
      let bytesRead = 0;

      while (true) {
        // Check memory pressure
        if (processedItems % this.MEMORY_CHECK_INTERVAL === 0) {
          const memoryStats = MemoryOptimizer.getMemoryStats();
          if (memoryStats.memoryPressure === 'high') {
            console.warn('[STREAMING] High memory pressure, forcing cleanup');
            MemoryOptimizer.suggestGarbageCollection();
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Read next chunk
        const chunk = await this.readNextChunk(reader, chunkSize);
        
        if (!chunk || chunk.length === 0) {
          break; // End of file
        }

        bytesRead += this.estimateChunkSize(chunk);
        
        // Process chunk
        try {
          const chunkResults = await processor(chunk);
          results.push(...chunkResults);
          
          // Optional chunk callback
          if (onChunk) {
            await onChunk(chunk, chunkIndex);
          }
          
          processedItems += chunk.length;
          chunkIndex++;
          
          // Progress update
          const progress = (bytesRead / totalSize) * 100;
          onProgress?.(progress, `Processed ${processedItems} items`);
          
        } catch (error) {
          console.error(`[STREAMING] Chunk ${chunkIndex} processing failed:`, error);
          throw new Error(`Chunk processing failed at item ${processedItems}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      console.log(`[STREAMING] Stream processing complete: ${results.length} items processed`);
      return results;

    } catch (error) {
      console.error('[STREAMING] Stream processing failed:', error);
      throw error;
    }
  }

  private static async createStreamingReader(file: File) {
    // For now, we'll use a simple approach with FileReader
    // In a real implementation, we'd use ReadableStream for true streaming
    const reader = new FileReader();
    const text = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

    return {
      text,
      position: 0,
      size: text.length
    };
  }

  private static async readNextChunk(reader: any, chunkSize: number): Promise<any[] | null> {
    const { text, position, size } = reader;
    
    if (position >= size) {
      return null;
    }

    // Simple CSV parsing for demonstration
    const lines = text.split('\n');
    const startLine = Math.floor(position / (size / lines.length));
    const endLine = Math.min(startLine + chunkSize, lines.length);
    
    const chunk = lines.slice(startLine, endLine)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',');
        return values.reduce((obj, value, index) => {
          obj[`col_${index}`] = value.trim();
          return obj;
        }, {} as any);
      });

    reader.position = (endLine / lines.length) * size;
    
    return chunk;
  }

  private static estimateChunkSize(chunk: any[]): number {
    // Rough estimation
    return JSON.stringify(chunk).length;
  }

  static getOptimalChunkSize(fileSize: number, availableMemory: number): number {
    const memoryRatio = availableMemory / (1024 * 1024 * 1024); // GB
    const baseChunkSize = Math.max(500, Math.min(5000, fileSize / 1000));
    
    if (memoryRatio > 4) return Math.floor(baseChunkSize * 2);
    if (memoryRatio > 2) return baseChunkSize;
    return Math.floor(baseChunkSize * 0.5);
  }
}
