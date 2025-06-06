
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PayeeClassification } from "@/lib/types";
import { exportResultsWithOriginalDataV3 } from "@/lib/classification/batchExporter";
import * as XLSX from 'xlsx';
import { useToast } from "@/components/ui/use-toast";

interface ExportButtonsProps {
  results: PayeeClassification[];
}

const ExportButtons = ({ results }: ExportButtonsProps) => {
  const { toast } = useToast();

  const downloadCSV = () => {
    try {
      // Create a mock batch result to use the enhanced export function
      const batchResult = {
        results,
        successCount: results.length,
        failureCount: 0,
        originalFileData: results.map(r => r.originalData).filter(Boolean)
      };

      const exportData = exportResultsWithOriginalDataV3(batchResult, true);
      
      // Convert to CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape values that contain commas or quotes
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payee_results_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "CSV Export Complete",
        description: `Exported ${exportData.length} rows with all original and classification fields.`,
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: "Export Error",
        description: "Failed to export CSV. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadJSON = () => {
    try {
      // Create a mock batch result to use the enhanced export function
      const batchResult = {
        results,
        successCount: results.length,
        failureCount: 0,
        originalFileData: results.map(r => r.originalData).filter(Boolean)
      };

      const exportData = exportResultsWithOriginalDataV3(batchResult, true);
      
      // Download JSON
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payee_results_${new Date().toISOString().slice(0, 10)}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "JSON Export Complete",
        description: `Exported ${exportData.length} rows with all original and classification fields.`,
      });
    } catch (error) {
      console.error('JSON export error:', error);
      toast({
        title: "Export Error",
        description: "Failed to export JSON. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadExcel = () => {
    try {
      // Create a mock batch result to use the enhanced export function
      const batchResult = {
        results,
        successCount: results.length,
        failureCount: 0,
        originalFileData: results.map(r => r.originalData).filter(Boolean)
      };

      const exportData = exportResultsWithOriginalDataV3(batchResult, true);
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Complete Results");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `payee_results_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Excel Export Complete",
        description: `Exported ${exportData.length} rows with all original and classification fields.`,
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Error",
        description: "Failed to export Excel. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={downloadCSV}>
        <Download className="w-4 h-4 mr-2" /> Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadJSON}>
        <Download className="w-4 h-4 mr-2" /> Export JSON
      </Button>
      <Button variant="outline" size="sm" onClick={downloadExcel}>
        <Download className="w-4 h-4 mr-2" /> Export Excel
      </Button>
    </div>
  );
};

export default ExportButtons;
