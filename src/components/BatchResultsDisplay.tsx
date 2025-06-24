
import { Button } from "@/components/ui/button";
import { RotateCcw, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { exportDirectCSV } from "@/lib/classification/batchExporter";
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
      const csvData = exportDirectCSV(processingSummary);
      
      // Convert to object format for Excel
      const exportData = csvData.rows.map(row => {
        const obj: any = {};
        csvData.headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `payee_results_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Excel Export Complete",
        description: `Exported ${exportData.length} rows.`,
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

      {batchResults.length > 0 ? (
        <div>
          <div className="text-center py-8 border rounded-md mb-4">
            <h3 className="text-lg font-medium mb-2">Results Ready</h3>
            <p className="text-muted-foreground mb-4">
              Your classification results are ready. The CSV file should have downloaded automatically.
            </p>
            <p className="text-sm text-muted-foreground">
              {batchResults.length} results processed successfully
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="default"
              onClick={handleExportCSV}
              disabled={isProcessing || isDownloading}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isProcessing || isDownloading}
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel
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
            CSV files are automatically downloaded when batch jobs complete. You can also manually download them here.
          </p>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md">
          <p className="text-muted-foreground">
            No batch results yet. Complete a batch job to get your CSV file.
          </p>
        </div>
      )}
    </>
  );
};

export default BatchResultsDisplay;
