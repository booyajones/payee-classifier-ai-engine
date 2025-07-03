
// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import { generateDownloadFilename } from '@/lib/utils/batchIdentifierGenerator';

interface DirectCSVExportProps {
  job: BatchJob;
  payeeData: PayeeRowData;
  onDownloadResults: () => Promise<void>;
}

const DirectCSVExport = ({ job, payeeData, onDownloadResults }: DirectCSVExportProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleMainDownload = async () => {
    setIsDownloading(true);
    try {
      productionLogger.debug(`[DIRECT CSV] Starting main download for job ${job.id}`);
      productionLogger.debug(`[DIRECT CSV] onDownloadResults type:`, typeof onDownloadResults);
      
      if (typeof onDownloadResults !== 'function') {
        const errorMsg = `onDownloadResults is not a function (type: ${typeof onDownloadResults})`;
        productionLogger.error(`[DIRECT CSV] ${errorMsg}`);
        toast({
          title: "Download Error",
          description: "Download function is not available. Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      await onDownloadResults();
      toast({
        title: "Download Started",
        description: "Downloading processed classification results...",
      });
    } catch (error) {
      productionLogger.error('[DIRECT CSV] Main download error:', error);
      toast({
        title: "Download Error",
        description: `Failed to download results: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportOriginal = async () => {
    setIsExporting(true);
    try {
      productionLogger.debug(`[DIRECT CSV] Exporting original data for job ${job.id}`);
      
      if (!payeeData.originalFileData || payeeData.originalFileData.length === 0) {
        throw new Error('No original file data available for export');
      }

      // Get all column names from the first row
      const firstRow = payeeData.originalFileData[0];
      const originalColumns = Object.keys(firstRow);
      
      // Create CSV content with just original data
      const csvRows = [
        // Header row
        originalColumns.map(col => `"${col}"`).join(','),
        // Data rows
        ...payeeData.originalFileData.map(row => {
          return originalColumns.map(col => {
            const value = row[col] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',');
        })
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', generateDownloadFilename('original_data', job.id, 'csv'));
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Exported ${payeeData.originalFileData.length} rows of original data.`,
      });
      
    } catch (error) {
      productionLogger.error('[DIRECT CSV] Export original error:', error);
      toast({
        title: "Export Error",
        description: `Failed to export original data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-background">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-foreground">Download Results</h4>
          <p className="text-sm text-muted-foreground">
            CSV file with AI classifications and SIC codes
          </p>
        </div>
      </div>
      
      <div className="flex gap-3">
        <Button
          onClick={handleMainDownload}
          disabled={isDownloading}
          className="flex-1"
        >
          <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-pulse' : ''}`} />
          {isDownloading ? 'Downloading...' : 'Download CSV'}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleExportOriginal}
          disabled={isExporting}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Original'}
        </Button>
      </div>
    </div>
  );
};

export default DirectCSVExport;
