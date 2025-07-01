
import React from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { exportDirectCSV } from "@/lib/classification/batchExporter";
import * as XLSX from 'xlsx';

interface BatchResultsActionsProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
  isDownloading?: boolean;
}

const BatchResultsActions = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing,
  isDownloading = false
}: BatchResultsActionsProps) => {
  const { toast } = useToast();

  const handleExportCSV = async () => {
    if (!processingSummary || batchResults.length === 0) {
      toast({
        title: "No Results to Export",
        description: "Please complete a batch job first before exporting results.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the enhanced CSV export that includes database SIC data
      const csvData = await exportDirectCSV(processingSummary);
      
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
      
      // Count SIC codes from the actual export data
      const sicCodeIndex = csvData.headers.indexOf('sicCode');
      const sicCount = sicCodeIndex >= 0 ? csvData.rows.filter(row => row[sicCodeIndex] && row[sicCodeIndex] !== '').length : 0;
      
      toast({
        title: "CSV Export Complete",
        description: `Exported ${csvData.rows.length} rows with ${sicCount} SIC codes included.`,
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

  const handleExportExcel = async () => {
    if (!processingSummary || batchResults.length === 0) {
      toast({
        title: "No Results to Export",
        description: "Please complete a batch job first before exporting results.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the enhanced CSV export for data, then convert to Excel
      const csvData = await exportDirectCSV(processingSummary);
      
      // Convert to object format for Excel
      const exportData = csvData.rows.map(row => {
        const obj: any = {};
        csvData.headers.forEach((header, headerIndex) => {
          obj[header] = row[headerIndex] || '';
        });
        return obj;
      });
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `payee_results_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      // Count SIC codes from the actual export data
      const sicCount = exportData.filter(row => row.sicCode && row.sicCode !== '').length;
      
      toast({
        title: "Excel Export Complete",
        description: `Exported ${exportData.length} rows with ${sicCount} SIC codes included.`,
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
        CSV and Excel files now include SIC codes and descriptions for business classifications.
      </p>
    </>
  );
};

export default BatchResultsActions;
