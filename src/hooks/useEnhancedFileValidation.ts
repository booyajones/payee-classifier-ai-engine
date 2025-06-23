
import { useState, useCallback } from 'react';
import { handleError, FileValidationError, ERROR_CODES } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';

interface FileValidationResult {
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

interface ValidationOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  requireHeaders?: boolean;
  minRows?: number;
  maxRows?: number;
}

export const useEnhancedFileValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const validateFile = useCallback(async (
    file: File,
    options: ValidationOptions = {}
  ): Promise<FileValidationResult> => {
    const {
      maxFileSize = 100 * 1024 * 1024, // 100MB
      allowedTypes = ['.xlsx', '.xls', '.csv'],
      requireHeaders = true,
      minRows = 1,
      maxRows = 1000000
    } = options;

    setIsValidating(true);

    try {
      console.log(`[FILE VALIDATION] Validating file: ${file.name}`);

      // Basic file checks
      if (!file) {
        throw new FileValidationError(
          ERROR_CODES.INVALID_FILE_FORMAT,
          'No file provided',
          'File is null or undefined'
        );
      }

      if (file.size === 0) {
        throw new FileValidationError(
          ERROR_CODES.EMPTY_FILE,
          'File is empty',
          `File "${file.name}" has no content`
        );
      }

      if (file.size > maxFileSize) {
        throw new FileValidationError(
          ERROR_CODES.FILE_TOO_LARGE,
          `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size (${(maxFileSize / 1024 / 1024).toFixed(2)}MB)`,
          `File size: ${file.size} bytes, Max allowed: ${maxFileSize} bytes`
        );
      }

      // File type validation
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        throw new FileValidationError(
          ERROR_CODES.INVALID_FILE_FORMAT,
          `File type "${fileExtension}" is not supported. Allowed types: ${allowedTypes.join(', ')}`,
          `File: ${file.name}, Type: ${fileExtension}`
        );
      }

      // Advanced validation - peek at file content
      const fileInfo = await analyzeFileStructure(file);

      if (requireHeaders && !fileInfo.hasHeaders) {
        throw new FileValidationError(
          ERROR_CODES.INVALID_FILE_FORMAT,
          'File appears to be missing headers',
          'First row does not contain valid column headers'
        );
      }

      if (fileInfo.estimatedRows && fileInfo.estimatedRows < minRows) {
        throw new FileValidationError(
          ERROR_CODES.EMPTY_FILE,
          `File contains too few rows (${fileInfo.estimatedRows}). Minimum required: ${minRows}`,
          `Estimated rows: ${fileInfo.estimatedRows}`
        );
      }

      if (fileInfo.estimatedRows && fileInfo.estimatedRows > maxRows) {
        throw new FileValidationError(
          ERROR_CODES.FILE_TOO_LARGE,
          `File contains too many rows (${fileInfo.estimatedRows}). Maximum allowed: ${maxRows}`,
          `Estimated rows: ${fileInfo.estimatedRows}`
        );
      }

      // Generate warnings
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

      console.log(`[FILE VALIDATION] File validated successfully:`, fileInfo);

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        fileInfo: {
          ...fileInfo,
          size: file.size,
          type: file.type || fileExtension,
          lastModified: new Date(file.lastModified)
        }
      };

    } catch (error) {
      const appError = error instanceof FileValidationError 
        ? error 
        : handleError(error, 'File Validation');
      
      console.error(`[FILE VALIDATION] Validation failed:`, appError);
      
      return {
        isValid: false,
        error: appError as FileValidationError
      };
    } finally {
      setIsValidating(false);
    }
  }, [toast]);

  const analyzeFileStructure = async (file: File) => {
    return new Promise<{
      hasHeaders?: boolean;
      estimatedRows?: number;
      columns?: string[];
      encoding?: string;
    }>((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            resolve({ hasHeaders: false, estimatedRows: 0 });
            return;
          }

          // Analyze first few lines
          const firstLine = lines[0];
          const secondLine = lines[1];
          
          // Simple heuristic for headers
          const hasHeaders = firstLine && secondLine && 
            !isNumeric(firstLine.split(',')[0]) && 
            (isNumeric(secondLine.split(',')[0]) || secondLine.split(',')[0].length > 0);

          // Extract columns from first line
          const columns = firstLine ? firstLine.split(',').map(col => col.trim().replace(/"/g, '')) : [];

          resolve({
            hasHeaders,
            estimatedRows: lines.length - (hasHeaders ? 1 : 0),
            columns: columns.length > 0 ? columns : undefined,
            encoding: 'UTF-8' // Simple assumption
          });
        } catch (error) {
          console.warn('[FILE VALIDATION] Could not analyze file structure:', error);
          resolve({});
        }
      };

      reader.onerror = () => {
        resolve({});
      };

      // Read first 1KB for analysis
      const blob = file.slice(0, 1024);
      reader.readAsText(blob);
    });
  };

  const isNumeric = (str: string): boolean => {
    return !isNaN(Number(str)) && !isNaN(parseFloat(str));
  };

  return {
    validateFile,
    isValidating
  };
};
