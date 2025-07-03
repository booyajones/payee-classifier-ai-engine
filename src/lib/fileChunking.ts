
import { PayeeRowData } from './rowMapping';
import { BatchJob } from './openai/trueBatchAPI';

export const MAX_PAYEES_PER_CHUNK = 45000; // Buffer below OpenAI's 50K limit

export interface FileChunk {
  chunkIndex: number;
  totalChunks: number;
  uniquePayeeNames: string[];
  originalFileData: any[];
  rowMappings: any[]; // Keep as RowMapping[] equivalent
  chunkId: string;
}

export interface ChunkJobResult {
  chunkIndex: number;
  job: BatchJob;
  payeeRowData: PayeeRowData;
}

/**
 * Split a large PayeeRowData into smaller chunks
 */
export const chunkPayeeData = (payeeRowData: PayeeRowData): FileChunk[] => {
  const { uniquePayeeNames, originalFileData, rowMappings } = payeeRowData;
  
  if (uniquePayeeNames.length <= MAX_PAYEES_PER_CHUNK) {
    // No chunking needed
    return [{
      chunkIndex: 0,
      totalChunks: 1,
      uniquePayeeNames,
      originalFileData,
      rowMappings,
      chunkId: 'chunk-0'
    }];
  }

  const totalChunks = Math.ceil(uniquePayeeNames.length / MAX_PAYEES_PER_CHUNK);
  const chunks: FileChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const startIndex = i * MAX_PAYEES_PER_CHUNK;
    const endIndex = Math.min(startIndex + MAX_PAYEES_PER_CHUNK, uniquePayeeNames.length);
    
    const chunkPayeeNames = uniquePayeeNames.slice(startIndex, endIndex);
    
    // Create a set of unique payee indices for this chunk
    const chunkPayeeIndices = new Set<number>();
    for (let j = startIndex; j < endIndex; j++) {
      chunkPayeeIndices.add(j);
    }
    
    // Filter row mappings to only include rows for payees in this chunk
    const chunkRowMappings = rowMappings.filter(mapping => 
      chunkPayeeIndices.has(mapping.uniquePayeeIndex)
    );
    
    // Get the original file data rows that correspond to this chunk
    const chunkOriginalRowIndices = new Set(chunkRowMappings.map(mapping => mapping.originalRowIndex));
    const chunkOriginalData = originalFileData.filter((_, index) => 
      chunkOriginalRowIndices.has(index)
    );

    chunks.push({
      chunkIndex: i,
      totalChunks,
      uniquePayeeNames: chunkPayeeNames,
      originalFileData: chunkOriginalData,
      rowMappings: chunkRowMappings,
      chunkId: `chunk-${i}`
    });
  }

  productionLogger.debug(`[FILE CHUNKING] Split ${uniquePayeeNames.length} payees into ${totalChunks} chunks`);
  return chunks;
};

/**
 * Create PayeeRowData from a file chunk
 */
export const createPayeeRowDataFromChunk = (chunk: FileChunk, originalPayeeRowData: PayeeRowData): PayeeRowData => {
  return {
    uniquePayeeNames: chunk.uniquePayeeNames,
    uniqueNormalizedNames: chunk.uniquePayeeNames, // Default to same as original for chunks
    originalFileData: chunk.originalFileData,
    rowMappings: chunk.rowMappings,
    standardizationStats: {
      totalProcessed: chunk.uniquePayeeNames.length,
      changesDetected: 0,
      averageStepsPerName: 0,
      mostCommonSteps: []
    }
  };
};

/**
 * Calculate overall progress from multiple chunks
 */
export const calculateChunkedProgress = (
  chunkProgress: Record<string, { current: number; total: number; status: string }>
): { overall: number; status: string; completedChunks: number; totalChunks: number } => {
  const chunks = Object.values(chunkProgress);
  if (chunks.length === 0) return { overall: 0, status: 'Ready', completedChunks: 0, totalChunks: 0 };

  const totalItems = chunks.reduce((sum, chunk) => sum + chunk.total, 0);
  const completedItems = chunks.reduce((sum, chunk) => sum + chunk.current, 0);
  const completedChunks = chunks.filter(chunk => chunk.current >= chunk.total).length;

  const overall = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  let status = 'Processing chunks...';
  if (completedChunks === chunks.length) {
    status = 'All chunks completed!';
  } else if (completedChunks > 0) {
    status = `${completedChunks}/${chunks.length} chunks completed`;
  }

  return {
    overall,
    status,
    completedChunks,
    totalChunks: chunks.length
  };
};
