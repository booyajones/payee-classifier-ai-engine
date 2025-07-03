/**
 * Random Batch Identifier Generator
 * Creates unique, memorable identifiers for batch job downloads and exports
 */

/**
 * Generate a random alphanumeric identifier
 */
function generateRandomCode(length: number = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars like O, 0, I, 1
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique batch identifier with timestamp
 */
export function generateBatchIdentifier(jobId?: string): string {
  const date = new Date();
  const dateString = date.toISOString().slice(0, 10); // YYYY-MM-DD format
  const randomCode = generateRandomCode(4);
  
  // If jobId provided, use a hash-based approach for consistency
  if (jobId) {
    // Create a consistent but random-looking identifier from job ID
    let hash = 0;
    for (let i = 0; i < jobId.length; i++) {
      const char = jobId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to a 4-character code
    const hashCode = Math.abs(hash).toString(36).toUpperCase().slice(0, 4).padEnd(4, 'X');
    return `${hashCode}_${dateString}`;
  }
  
  return `${randomCode}_${dateString}`;
}

/**
 * Generate a batch identifier for export filenames
 */
export function generateExportIdentifier(jobId: string, exportType: 'csv' | 'excel' | 'original' = 'csv'): string {
  const baseId = generateBatchIdentifier(jobId);
  const typePrefix = exportType === 'excel' ? 'XL' : exportType === 'original' ? 'OG' : 'CS';
  return `${typePrefix}_${baseId}`;
}

/**
 * Extract job metadata from batch identifier (if stored consistently)
 */
export function parseBatchIdentifier(identifier: string): {
  code: string;
  date: string;
  isValid: boolean;
} {
  const parts = identifier.split('_');
  if (parts.length !== 2) {
    return { code: '', date: '', isValid: false };
  }
  
  const [code, date] = parts;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  return {
    code,
    date,
    isValid: dateRegex.test(date) && code.length >= 2
  };
}

/**
 * Generate a memorable filename for downloads
 */
export function generateDownloadFilename(
  baseName: string,
  jobId: string,
  extension: 'csv' | 'xlsx' = 'csv'
): string {
  const identifier = generateBatchIdentifier(jobId);
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `${cleanBaseName}_${identifier}.${extension}`;
}