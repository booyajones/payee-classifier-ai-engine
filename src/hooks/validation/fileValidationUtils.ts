
import { FileValidationError, ERROR_CODES } from '@/lib/errorHandler';

export interface FileValidationResult {
  isValid: boolean;
  error?: FileValidationError;
  warnings?: string[];
  fileInfo?: {
    size: number;
    type: string;
    lastModified: Date;
    encoding?: string;
    hasHeaders?: boolean;
    estimatedRows?: number;
    columns?: string[];
  };
}

export interface ValidationOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  requireHeaders?: boolean;
  minRows?: number;
  maxRows?: number;
}

export const validateBasicFileProperties = (file: File, options: ValidationOptions): FileValidationResult | null => {
  const {
    maxFileSize = 100 * 1024 * 1024, // 100MB
    allowedTypes = ['.xlsx', '.xls', '.csv']
  } = options;

  console.log(`[FILE VALIDATION] Validating file: ${file.name}`);

  // Basic file checks
  if (!file) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.INVALID_FILE_FORMAT,
        'No file provided',
        'File is null or undefined'
      )
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.EMPTY_FILE,
        'File is empty',
        `File "${file.name}" has no content`
      )
    };
  }

  if (file.size > maxFileSize) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.FILE_TOO_LARGE,
        `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size (${(maxFileSize / 1024 / 1024).toFixed(2)}MB)`,
        `File size: ${file.size} bytes, Max allowed: ${maxFileSize} bytes`
      )
    };
  }

  // File type validation
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.INVALID_FILE_FORMAT,
        `File type "${fileExtension}" is not supported. Allowed types: ${allowedTypes.join(', ')}`,
        `File: ${file.name}, Type: ${fileExtension}`
      )
    };
  }

  return null; // No basic validation errors
};

export const validateFileStructure = (
  fileInfo: any,
  options: ValidationOptions
): FileValidationResult | null => {
  const { requireHeaders = true, minRows = 1, maxRows = 1000000 } = options;

  if (requireHeaders && !fileInfo.hasHeaders) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.INVALID_FILE_FORMAT,
        'File appears to be missing headers',
        'First row does not contain valid column headers'
      )
    };
  }

  if (fileInfo.estimatedRows && fileInfo.estimatedRows < minRows) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.EMPTY_FILE,
        `File contains too few rows (${fileInfo.estimatedRows}). Minimum required: ${minRows}`,
        `Estimated rows: ${fileInfo.estimatedRows}`
      )
    };
  }

  if (fileInfo.estimatedRows && fileInfo.estimatedRows > maxRows) {
    return {
      isValid: false,
      error: new FileValidationError(
        ERROR_CODES.FILE_TOO_LARGE,
        `File contains too many rows (${fileInfo.estimatedRows}). Maximum allowed: ${maxRows}`,
        `Estimated rows: ${fileInfo.estimatedRows}`
      )
    };
  }

  return null; // No structure validation errors
};

export const generateValidationWarnings = (file: File, fileInfo: any): string[] => {
  const warnings: string[] = [];
  
  if (file.size > 50 * 1024 * 1024) { // 50MB
    warnings.push('Large file detected. Processing may take longer than usual.');
  }
  
  if (fileInfo.estimatedRows && fileInfo.estimatedRows > 50000) {
    warnings.push('Large dataset detected. Consider using batch processing for better performance.');
  }

  if (fileInfo.columns && fileInfo.columns.length > 20) {
    warnings.push('Many columns detected. Only select the columns you need for processing.');
  }

  return warnings;
};
