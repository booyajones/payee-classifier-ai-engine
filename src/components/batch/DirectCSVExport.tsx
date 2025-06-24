
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface DirectCSVExportProps {
  job: BatchJob;
  payeeData: PayeeRowData;
  onDownloadResults?: () => void;
}

const DirectCSVExport = ({ job, payeeData, onDownloadResults }: DirectCSVExportProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleDirectCSVExport = async () => {
    setIsExporting(true);
    try {
      console.log(`[DIRECT CSV] Exporting job ${job.id} with ${payeeData.originalFileData.length} rows`);
      
      if (!payeeData.originalFileData || payeeData.originalFileData.length === 0) {
        throw new Error('No original file data available for export');
      }

      // Get all column names from the first row
      const firstRow = payeeData.originalFileData[0];
      const originalColumns = Object.keys(firstRow);
      
      // Add classification columns
      const classificationColumns = [
        'classification',
        'confidence',
        'processingTier',
        'reasoning',
        'processingMethod',
        'keywordExclusion',
        'matchedKeywords',
        'keywordConfidence',
        'keywordReasoning',
        'timestamp'
      ];
      
      const allColumns = [...originalColumns, ...classificationColumns];
      
      // Create CSV content
      const csvRows = [
        // Header row
        allColumns.map(col => `"${col}"`).join(','),
        // Data rows
        ...payeeData.originalFileData.map(row => {
          const csvRow = [];
          
          // Add original data
          originalColumns.forEach(col => {
            const value = row[col] || '';
            csvRow.push(`"${String(value).replace(/"/g, '""')}"`);
          });
          
          // Add placeholder classification data
          csvRow.push('"Pending"'); // classification
          csvRow.push('"0"'); // confidence
          csvRow.push('"AI-Powered"'); // processingTier
          csvRow.push('"Export original data - download results for classifications"'); // reasoning
          csvRow.push('"OpenAI Batch API"'); // processingMethod
          csvRow.push('"No"'); // keywordExclusion
          csvRow.push('""'); // matchedKeywords
          csvRow.push('"0"'); // keywordConfidence
          csvRow.push('"No keyword exclusion applied"'); // keywordReasoning
          csvRow.push(`"${new Date().toISOString()}"`); // timestamp
          
          return csvRow.join(',');
        })
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `payee_data_original_${job.id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "CSV Export Complete",
        description: `Exported ${payeeData.originalFileData.length} rows with original data.`,
      });
      
    } catch (error) {
      console.error('[DIRECT CSV] Export error:', error);
      toast({
        title: "Export Error",
        description: `Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadWithResults = async () => {
    try {
      if (typeof onDownloadResults === 'function') {
        await onDownloadResults();
        toast({
          title: "Download Started",
          description: "Downloading classification results from OpenAI...",
        });
      } else {
        console.error('[DIRECT CSV] onDownloadResults is not a function');
        toast({
          title: "Download Error",
          description: "Download function not available",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[DIRECT CSV] Download error:', error);
      toast({
        title: "Download Error",
        description: `Failed to start download: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="pl-4 border-l-2 border-muted">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
        <div className="text-sm">
          <p className="font-medium">Export Options</p>
          <p className="text-muted-foreground text-xs">
            Export original data now or download processed results
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDirectCSVExport}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            {isExporting ? 'Exporting...' : 'Export Original'}
          </Button>
          
          {job.status === 'completed' && onDownloadResults && (
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadWithResults}
            >
              <Download className="h-3 w-3 mr-1" />
              Download Results
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectCSVExport;
