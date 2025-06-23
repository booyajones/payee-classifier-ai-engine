
import { Button } from "@/components/ui/button";
import { RotateCcw, Download, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { exportResultsWithOriginalDataV3, exportDirectCSV } from "@/lib/classification/batchExporter";
import * as XLSX from 'xlsx';

interface BatchResultsDisplayProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
  isDownloading?: boolean;
  downloadProgress?: { current: number; total: number };
  onCancelDownload?: () => void;
}

const BatchResultsDisplay = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing,
  isDownloading = false,
  downloadProgress,
  onCancelDownload
}: BatchResultsDisplayProps) => {
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!processingSummary || batchResults.length === 0) {
      toast({
        title: "No Results to Export",
        description: "Please complete a batch job first before exporting results.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[CSV EXPORT] Starting direct CSV export:', {
        resultsCount: batchResults.length,
        summaryOriginalCount: processingSummary.originalFileData?.length || 0
      });

      const csvData = exportDirectCSV(processingSummary);
      
      const timestamp = new Date().toISOString().slice(0, 10);
      const csvContent = [
        csvData.headers.join(','),
        ...csvData.rows.map(row => 
          row.map(cell => {
            const value = cell || '';
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payee_results_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "CSV Export Complete",
        description: `Exported ${csvData.rows.length} rows successfully.`,
      });
    } catch (error) {
      console.error("CSV export error:", error);
      toast({
        title: "CSV Export Error",
        description: `Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    if (!processingSummary || batchResults.length === 0) {
      toast({
        title: "No Results to Export",
        description: "Please complete a batch job first before exporting results.",
        variant: "destructive",
      });
      return;
    }

    try {
      const invalidResults = batchResults.filter(r => !r.originalData);
      if (invalidResults.length > 0) {
        throw new Error(`${invalidResults.length} results missing original data`);
      }

      console.log('[EXCEL EXPORT] Pre-export validation:', {
        resultsCount: batchResults.length,
        summaryOriginalCount: processingSummary.originalFileData?.length || 0
      });

      const exportData = exportResultsWithOriginalDataV3(processingSummary, true);
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `payee_results_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Excel Export Complete",
        description: `Exported exactly ${exportData.length} rows.`,
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Excel Export Error",
        description: `Failed to export Excel: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {processingSummary && (
        <div className="mb-6">
          <BatchProcessingSummary summary={processingSummary} />
        </div>
      )}

      {/* Download Progress Display */}
      {isDownloading && downloadProgress && (
        <div className="mb-4 p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Downloading Results...</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {downloadProgress.current} / {downloadProgress.total}
              </span>
              {onCancelDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelDownload}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${downloadProgress.total > 0 ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` 
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Large files are processed in chunks to prevent timeouts. You can cancel if needed.
          </p>
        </div>
      )}

      {batchResults.length > 0 ? (
        <div>
          <h3 className="text-lg font-medium mb-4">Classification Results</h3>
          
          <ClassificationResultTable results={batchResults} />
          
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button
              variant="default"
              onClick={handleExportCSV}
              disabled={isProcessing || isDownloading}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isProcessing || isDownloading}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            
            <Button
              variant="outline"
              onClick={onReset}
              disabled={isProcessing || isDownloading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            CSV export is faster and more reliable for large files. Excel export includes formatting but may be slower.
          </p>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">
            No batch results yet. Complete a batch job to see results here.
          </p>
        </div>
      )}
    </>
  );
};

export default BatchResultsDisplay;
