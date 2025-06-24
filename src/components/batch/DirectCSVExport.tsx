
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

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
      console.log(`[DIRECT CSV] Starting main download for job ${job.id}`);
      
      if (typeof onDownloadResults === 'function') {
        await onDownloadResults();
        toast({
          title: "Download Started",
          description: "Downloading processed classification results...",
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
      console.error('[DIRECT CSV] Main download error:', error);
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
      console.log(`[DIRECT CSV] Exporting original data for job ${job.id}`);
      
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
      link.setAttribute('download', `original_data_${job.id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.csv`);
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
      console.error('[DIRECT CSV] Export original error:', error);
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
    <div className="pl-4 border-l-2 border-muted">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
        <div className="text-sm">
          <p className="font-medium">Download Options</p>
          <p className="text-muted-foreground text-xs">
            Get processed results or export original data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleMainDownload}
            disabled={isDownloading}
          >
            <Download className={`h-3 w-3 mr-1 ${isDownloading ? 'animate-pulse' : ''}`} />
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportOriginal}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            {isExporting ? 'Exporting...' : 'Export Original'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DirectCSVExport;
