
import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

interface FileStructureInfo {
  hasHeaders?: boolean;
  estimatedRows?: number;
  columns?: string[];
  encoding?: string;
}

export const useFileStructureAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeFileStructure = useCallback(async (file: File): Promise<FileStructureInfo> => {
    setIsAnalyzing(true);
    
    try {
      return new Promise<FileStructureInfo>((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            if (!data) {
              resolve({ hasHeaders: false, estimatedRows: 0 });
              return;
            }

            // Determine file type by extension
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            const isExcelFile = fileExtension === 'xlsx' || fileExtension === 'xls';
            
            if (isExcelFile) {
              // Handle Excel files using XLSX library
              try {
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Parse as array of arrays to get raw data
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length === 0) {
                  resolve({ hasHeaders: false, estimatedRows: 0 });
                  return;
                }

                // Get headers from first row
                const firstRow = jsonData[0] as string[];
                const secondRow = jsonData[1] as string[];
                
                // Excel files typically have headers if first row contains strings and second row contains different data
                const hasHeaders = firstRow && firstRow.length > 0 && 
                  firstRow.some(cell => typeof cell === 'string' && cell.trim().length > 0);

                const columns = hasHeaders ? firstRow.map(col => String(col || '').trim()) : [];

                resolve({
                  hasHeaders,
                  estimatedRows: Math.max(0, jsonData.length - (hasHeaders ? 1 : 0)),
                  columns: columns.length > 0 ? columns : undefined,
                  encoding: 'Excel Format'
                });
              } catch (excelError) {
                productionLogger.warn('[FILE STRUCTURE ANALYZER] Excel parsing failed:', excelError);
                resolve({
                  hasHeaders: false,
                  estimatedRows: 0,
                  encoding: 'Excel Format (Parse Error)'
                });
              }
            } else {
              // Handle CSV files with text parsing
              const content = data as string;
              const lines = content.split('\n').filter(line => line.trim());
              
              if (lines.length === 0) {
                resolve({ hasHeaders: false, estimatedRows: 0 });
                return;
              }

              // Analyze first few lines for CSV
              const firstLine = lines[0];
              const secondLine = lines[1];
              
              // Simple heuristic for headers in CSV
              const hasHeaders = firstLine && secondLine && 
                !isNumeric(firstLine.split(',')[0]) && 
                (isNumeric(secondLine.split(',')[0]) || secondLine.split(',')[0].length > 0);

              // Extract columns from first line
              const columns = firstLine ? firstLine.split(',').map(col => col.trim().replace(/"/g, '')) : [];

              resolve({
                hasHeaders,
                estimatedRows: lines.length - (hasHeaders ? 1 : 0),
                columns: columns.length > 0 ? columns : undefined,
                encoding: 'UTF-8'
              });
            }
          } catch (error) {
            productionLogger.warn('[FILE STRUCTURE ANALYZER] Could not analyze file structure:', error);
            resolve({});
          }
        };

        reader.onerror = () => {
          resolve({});
        };

        // Use appropriate reading method based on file type
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isExcelFile = fileExtension === 'xlsx' || fileExtension === 'xls';
        
        if (isExcelFile) {
          // Read Excel files as binary string for XLSX library
          const blob = file.slice(0, 50000); // Read more data for Excel files (50KB)
          reader.readAsBinaryString(blob);
        } else {
          // Read CSV files as text
          const blob = file.slice(0, 1024); // Read first 1KB for CSV analysis
          reader.readAsText(blob);
        }
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const isNumeric = (str: string): boolean => {
    return !isNaN(Number(str)) && !isNaN(parseFloat(str));
  };

  return {
    analyzeFileStructure,
    isAnalyzing
  };
};
