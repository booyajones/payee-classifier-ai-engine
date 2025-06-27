
import { useState, useCallback } from 'react';

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
            console.warn('[FILE STRUCTURE ANALYZER] Could not analyze file structure:', error);
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
