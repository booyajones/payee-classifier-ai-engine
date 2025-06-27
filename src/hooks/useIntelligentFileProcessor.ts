
import { useState, useCallback } from 'react';
import { parseUploadedFile } from '@/lib/utils';
import { validateFile, validatePayeeData } from '@/lib/fileValidation';
import { createPayeeRowMapping, PayeeRowData } from '@/lib/rowMapping';
import { useToast } from '@/hooks/use-toast';

interface FileProcessingResult {
  success: boolean;
  payeeRowData?: PayeeRowData;
  selectedColumn?: string;
  errorMessage?: string;
  suggestions?: string[];
}

export const useIntelligentFileProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const autoDetectPayeeColumn = useCallback((columns: string[]): string | null => {
    // Priority order for payee column detection
    const patterns = [
      /^payee$/i,
      /payee/i,
      /vendor/i,
      /supplier/i,
      /recipient/i,
      /^name$/i,
      /company.*name/i,
      /business.*name/i,
      /entity.*name/i,
      /merchant/i,
      /contractor/i
    ];

    for (const pattern of patterns) {
      const match = columns.find(col => pattern.test(col));
      if (match) return match;
    }

    // Fallback: any column with "name" in it
    const nameColumn = columns.find(col => col.toLowerCase().includes('name'));
    if (nameColumn) return nameColumn;

    return null;
  }, []);

  const cleanAndValidateData = useCallback((data: any[], columnName: string) => {
    // Enhanced data cleaning with comprehensive standardization
    const cleanedData = data.map((row, index) => {
      const cleanedRow = { ...row };
      
      // Apply basic cleaning to the payee name (this will be enhanced by standardization)
      if (cleanedRow[columnName]) {
        let payeeName = String(cleanedRow[columnName]).trim();
        
        // Remove common prefixes/suffixes (basic cleaning)
        payeeName = payeeName.replace(/^(payment to|paid to|check to)\s+/i, '');
        payeeName = payeeName.replace(/\s+(payment|check|invoice)$/i, '');
        
        // Fix encoding issues
        payeeName = payeeName.replace(/â€™/g, "'").replace(/â€œ/g, '"').replace(/â€/g, '"');
        
        cleanedRow[columnName] = payeeName;
      }
      
      return cleanedRow;
    });

    return cleanedData;
  }, []);

  const processFileIntelligently = useCallback(async (file: File): Promise<FileProcessingResult> => {
    setIsProcessing(true);
    
    try {
      console.log(`[INTELLIGENT PROCESSOR] Processing file with comprehensive standardization and SIC code support: ${file.name}`);

      // Step 1: Validate file
      const fileValidation = validateFile(file);
      if (!fileValidation.isValid) {
        return {
          success: false,
          errorMessage: fileValidation.error!.message,
          suggestions: getSuggestions(fileValidation.error!.code)
        };
      }

      // Step 2: Parse headers and auto-detect structure
      const headers = await parseUploadedFile(file, true);
      if (!headers || headers.length === 0) {
        return {
          success: false,
          errorMessage: 'No columns found in the file. Please check if the file has data.',
          suggestions: ['Ensure the file has a header row', 'Try a different file format']
        };
      }

      // Step 3: Auto-detect payee column
      const detectedColumn = autoDetectPayeeColumn(headers);
      if (!detectedColumn) {
        return {
          success: false,
          errorMessage: 'Could not automatically detect a payee name column.',
          suggestions: [
            'Rename your payee column to include "payee", "vendor", or "name"',
            'Ensure the column contains company/person names',
            `Available columns: ${headers.join(', ')}`
          ]
        };
      }

      // Step 4: Parse full data and clean it
      const originalData = await parseUploadedFile(file);
      const cleanedData = cleanAndValidateData(originalData, detectedColumn);

      // Step 5: Validate payee data
      const dataValidation = validatePayeeData(cleanedData, detectedColumn);
      if (!dataValidation.isValid) {
        return {
          success: false,
          errorMessage: dataValidation.error!.message,
          suggestions: getSuggestions(dataValidation.error!.code)
        };
      }

      // Step 6: Create row mapping WITH COMPREHENSIVE STANDARDIZATION
      console.log(`[INTELLIGENT PROCESSOR] Creating payee mappings with comprehensive data standardization and SIC code preparation...`);
      const payeeRowData = createPayeeRowMapping(cleanedData, detectedColumn);

      // Enhanced logging with standardization stats
      const { standardizationStats } = payeeRowData;
      console.log(`[INTELLIGENT PROCESSOR] Successfully processed with standardization:`, {
        totalRows: cleanedData.length,
        uniquePayees: payeeRowData.uniquePayeeNames.length,
        namesImproved: standardizationStats.changesDetected,
        improvementRate: `${(standardizationStats.changesDetected / standardizationStats.totalProcessed * 100).toFixed(1)}%`,
        avgCleaningSteps: standardizationStats.averageStepsPerName.toFixed(1),
        commonSteps: standardizationStats.mostCommonSteps.slice(0, 3).map(s => s.step)
      });

      toast({
        title: "File Processed with Enhanced Classification",
        description: `Auto-detected "${detectedColumn}" column. Processed ${payeeRowData.uniquePayeeNames.length} unique payees with ${standardizationStats.changesDetected} names improved through standardization. Ready for business/individual classification with SIC code assignment.`,
      });

      return {
        success: true,
        payeeRowData,
        selectedColumn: detectedColumn
      };

    } catch (error) {
      console.error('[INTELLIGENT PROCESSOR] Processing failed:', error);
      return {
        success: false,
        errorMessage: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: ['Try a different file', 'Check file format and encoding']
      };
    } finally {
      setIsProcessing(false);
    }
  }, [autoDetectPayeeColumn, cleanAndValidateData, toast]);

  const getSuggestions = (errorCode: string): string[] => {
    switch (errorCode) {
      case 'FILE_TOO_LARGE':
        return ['Try splitting the file into smaller chunks', 'Remove unnecessary columns', 'Use CSV format instead of Excel'];
      case 'INVALID_FILE_FORMAT':
        return ['Use .xlsx, .xls, or .csv format', 'Check if the file is corrupted', 'Export from your accounting software again'];
      case 'NO_VALID_PAYEES':
        return ['Ensure the payee column contains names', 'Check for empty cells', 'Remove header/footer rows'];
      default:
        return ['Try re-saving the file', 'Check file permissions', 'Use a different browser'];
    }
  };

  return {
    processFileIntelligently,
    isProcessing
  };
};
