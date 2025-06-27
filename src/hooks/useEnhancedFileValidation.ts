
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
      console.log(`[FILE VALIDATION] Validating file: ${file.name}`);

      // Basic file validation
      const basicValidationError = validateBasicFileProperties(file, options);
      if (basicValidationError) {
        return basicValidationError;
      }

      // Advanced validation - peek at file content
      const fileInfo = await analyzeFileStructure(file);

      // Structure validation
      const structureValidationError = validateFileStructure(fileInfo, options);
      if (structureValidationError) {
        return structureValidationError;
      }

      // Generate warnings
      const warnings = generateValidationWarnings(file, fileInfo);

      console.log(`[FILE VALIDATION] File validated successfully:`, fileInfo);

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
  }, [analyzeFileStructure]);

  return {
    validateFile,
    isValidating
  };
};
