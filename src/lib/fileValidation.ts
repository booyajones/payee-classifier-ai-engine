import { FileValidationError, ERROR_CODES } from './errorHandler';

export interface FileValidationResult {
  isValid: boolean;
  error?: FileValidationError;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    rowCount?: number;
    columnCount?: number;
    estimatedProcessingTime?: string;
    sizeWarning?: string;
  };
}

// Phase 1: Increased limits for better file handling
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // Increased to 100MB
export const MAX_ROWS = 100000; // Increased to 100K rows
export const LARGE_FILE_WARNING_SIZE = 25 * 1024 * 1024; // 25MB warning threshold
export const LARGE_ROW_WARNING_COUNT = 25000; // 25K rows warning threshold
export const SUPPORTED_EXTENSIONS = ['xlsx', 'xls', 'csv'];

/**
 * Estimate processing time based on file characteristics
 */
export const estimateProcessingTime = (fileSize: number, rowCount?: number): string => {
  // Base estimation: ~1 second per MB + ~0.1 second per 100 rows
  const sizeSeconds = Math.ceil(fileSize / (1024 * 1024)) * 60; // 1 minute per MB for batch processing
  const rowSeconds = rowCount ? Math.ceil(rowCount / 100) * 6 : 0; // 6 seconds per 100 rows
  
  const totalSeconds = Math.max(sizeSeconds, rowSeconds, 30); // Minimum 30 seconds
  
  if (totalSeconds < 120) {
    return `${Math.ceil(totalSeconds / 60)} minute${totalSeconds >= 120 ? 's' : ''}`;
  } else if (totalSeconds < 3600) {
    return `${Math.ceil(totalSeconds / 60)} minutes`;
  } else {
    const hours = Math.ceil(totalSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
};

/**
 * Generate size warning messages for large files
 */
export const generateSizeWarning = (fileSize: number, rowCount?: number): string | undefined => {
  if (fileSize > LARGE_FILE_WARNING_SIZE || (rowCount && rowCount > LARGE_ROW_WARNING_COUNT)) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    const rowText = rowCount ? ` with ${rowCount.toLocaleString()} rows` : '';
    return `Large file detected (${sizeMB}MB${rowText}). Processing may take significant time and consume more resources.`;
  }
  return undefined;
};

export const validateFile = (file: File): FileValidationResult => {
  console.log(`[FILE VALIDATION] Validating file: ${file.name}, size: ${file.size} bytes`);

  // Check file size
  if (file.size === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.EMPTY_FILE,
        'The selected file is empty. Please choose a file with data.',
        `File size: ${file.size} bytes`
      )
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.FILE_TOO_LARGE,
        `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        `File size: ${file.size} bytes, limit: ${MAX_FILE_SIZE} bytes`
      )
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.INVALID_FILE_FORMAT,
        `Unsupported file format. Please upload ${SUPPORTED_EXTENSIONS.join(', ')} files only.`,
        `File extension: ${extension}`
      )
    };
  }

  // Check MIME type for additional validation
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv'
  ];

  if (file.type && !validMimeTypes.includes(file.type)) {
    console.warn(`[FILE VALIDATION] Unexpected MIME type: ${file.type}, but extension is valid`);
  }

  // Generate initial file info with estimates
  const estimatedTime = estimateProcessingTime(file.size);
  const sizeWarning = generateSizeWarning(file.size);

  return {
    isValid: true,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type || 'unknown',
      estimatedProcessingTime: estimatedTime,
      sizeWarning
    }
  };
};

export const validatePayeeData = (data: any[], selectedColumn: string): FileValidationResult => {
  console.log(`[PAYEE VALIDATION] Validating ${data.length} rows for column: ${selectedColumn}`);

  if (!data || data.length === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.EMPTY_FILE,
        'The file appears to be empty or has no data rows.',
        `Rows found: ${data.length}`
      )
    };
  }

  if (data.length > MAX_ROWS) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.FILE_TOO_LARGE,
        `Too many rows (${data.length.toLocaleString()}). Maximum allowed is ${MAX_ROWS.toLocaleString()} payee names.`,
        `Rows: ${data.length}, limit: ${MAX_ROWS}`
      )
    };
  }

  // Extract and validate payee names
  const payeeNames = data
    .map(row => {
      const value = row[selectedColumn];
      return typeof value === 'string' ? value.trim() : String(value || '').trim();
    })
    .filter(name => name.length > 0);

  if (payeeNames.length === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.NO_VALID_PAYEES,
        `No valid payee names found in the "${selectedColumn}" column. Please check your data and column selection.`,
        `Total rows: ${data.length}, valid payees: ${payeeNames.length}`
      )
    };
  }

  // Check for reasonable minimum
  if (payeeNames.length < 1) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.NO_VALID_PAYEES,
        'At least one valid payee name is required for processing.',
        `Valid payees found: ${payeeNames.length}`
      )
    };
  }

  // Remove duplicates and count
  const uniquePayees = [...new Set(payeeNames)];
  const duplicateCount = payeeNames.length - uniquePayees.length;

  console.log(`[PAYEE VALIDATION] Found ${payeeNames.length} total payees, ${uniquePayees.length} unique, ${duplicateCount} duplicates`);

  // Generate enhanced file info with processing estimates
  const dataSize = JSON.stringify(data).length;
  const estimatedTime = estimateProcessingTime(dataSize, data.length);
  const sizeWarning = generateSizeWarning(dataSize, data.length);

  return {
    isValid: true,
    fileInfo: {
      name: 'payee-data',
      size: data.length,
      type: 'payee-list',
      rowCount: data.length,
      columnCount: Object.keys(data[0] || {}).length,
      estimatedProcessingTime: estimatedTime,
      sizeWarning
    }
  };
};

// ... keep existing code (cleanPayeeNames function)
export const cleanPayeeNames = (payeeNames: string[]): string[] => {
  return [...new Set(
    payeeNames
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .filter(name => name.length <= 200) // Reasonable max length
  )];
};
