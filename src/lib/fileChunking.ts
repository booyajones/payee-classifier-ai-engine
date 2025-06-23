
import { PayeeRowData } from './rowMapping';
import { BatchJob } from './openai/trueBatchAPI';

export const MAX_PAYEES_PER_CHUNK = 45000; // Buffer below OpenAI's 50K limit

export interface FileChunk {
  chunkIndex: number;
  totalChunks: number;
  uniquePayeeNames: string[];
  originalFileData: any[];
  rowMappings: Record<string, number[]>;
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
    
    // Create row mappings for this chunk
    const chunkRowMappings: Record<string, number[]> = {};
    const chunkOriginalData: any[] = [];
    
    chunkPayeeNames.forEach(payeeName => {
      if (rowMappings[payeeName]) {
        chunkRowMappings[payeeName] = rowMappings[payeeName];
        // Add corresponding original data rows
        rowMappings[payeeName].forEach(rowIndex => {
          if (!chunkOriginalData.some((_, idx) => idx === rowIndex)) {
            chunkOriginalData[rowIndex] = originalFileData[rowIndex];
          }
        });
      }
    });

    chunks.push({
      chunkIndex: i,
      totalChunks,
      uniquePayeeNames: chunkPayeeNames,
      originalFileData: chunkOriginalData,
      rowMappings: chunkRowMappings,
      chunkId: `chunk-${i}`
    });
  }

  console.log(`[FILE CHUNKING] Split ${uniquePayeeNames.length} payees into ${totalChunks} chunks`);
  return chunks;
};

/**
 * Create PayeeRowData from a file chunk
 */
export const createPayeeRowDataFromChunk = (chunk: FileChunk, originalPayeeRowData: PayeeRowData): PayeeRowData => {
  return {
    uniquePayeeNames: chunk.uniquePayeeNames,
    originalFileData: chunk.originalFileData,
    rowMappings: chunk.rowMappings
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
