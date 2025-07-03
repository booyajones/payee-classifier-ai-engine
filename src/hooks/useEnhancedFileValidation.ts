
import { useState, useCallback } from 'react';
import { handleError, FileValidationError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';
import { useFileStructureAnalyzer } from './validation/useFileStructureAnalyzer';
import {
  FileValidationResult,
  ValidationOptions,
  validateBasicFileProperties,
  validateFileStructure,
  generateValidationWarnings
} from './validation/fileValidationUtils';

export const useEnhancedFileValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  const { analyzeFileStructure } = useFileStructureAnalyzer();

  const validateFile = useCallback(async (
    file: File,
    options: ValidationOptions = {}
  ): Promise<FileValidationResult> => {
    setIsValidating(true);

    try {
      productionLogger.debug(`[FILE VALIDATION DEBUG] Starting validation for: ${file.name}`);

      // Basic file validation
      const basicValidationError = validateBasicFileProperties(file, options);
      if (basicValidationError) {
        productionLogger.debug(`[FILE VALIDATION DEBUG] Basic validation failed:`, basicValidationError);
        return basicValidationError;
      }

      // Advanced validation - peek at file content
      const fileInfo = await analyzeFileStructure(file);
      productionLogger.debug(`[FILE VALIDATION DEBUG] File structure analysis:`, fileInfo);

      // Structure validation
      const structureValidationError = validateFileStructure(fileInfo, options);
      if (structureValidationError) {
        productionLogger.debug(`[FILE VALIDATION DEBUG] Structure validation failed:`, structureValidationError);
        return structureValidationError;
      }

      // Generate warnings (but filter out MIME type warnings to prevent false error toasts)
      const warnings = generateValidationWarnings(file, fileInfo)
        .filter(warning => !warning.toLowerCase().includes('mime type') && !warning.toLowerCase().includes('unexpected mime type'));

      productionLogger.debug(`[FILE VALIDATION DEBUG] Validation completed successfully:`, {
        fileInfo,
        warningCount: warnings.length,
        hasWarnings: warnings.length > 0
      });

      return {
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        fileInfo: {
          ...fileInfo,
          size: file.size,
          type: file.type || ('.' + file.name.split('.').pop()?.toLowerCase()),
          lastModified: new Date(file.lastModified)
        }
      };

    } catch (error) {
      productionLogger.error(`[FILE VALIDATION DEBUG] Validation failed with error:`, error);
      
      const appError = error instanceof FileValidationError 
        ? error 
        : handleError(error, 'File Validation');
      
      return {
        isValid: false,
        error: appError as FileValidationError
      };
    } finally {
      setIsValidating(false);
    }
  }, [analyzeFileStructure]);

  return {
    validateFile,
    isValidating
  };
};
