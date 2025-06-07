
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

  const performExport = (exportType: 'csv' | 'json' | 'excel') => {
    try {
      const batchResult = {
        results: results,
        successCount: results.length,
        failureCount: 0,
        originalFileData: results.map(r => r.originalData).filter(Boolean)
      };

      if (batchResult.originalFileData.length !== results.length) {
        batchResult.originalFileData = results.map((r, i) => r.originalData || { 
          PayeeName: r.payeeName, 
          RowIndex: i 
        });
      }

      const exportData = exportResultsWithOriginalDataV3(batchResult, true);
      
      const timestamp = new Date().toISOString().slice(0, 10);
      
      if (exportType === 'csv') {
        const headers = Object.keys(exportData[0] || {});
        const csvContent = [
          headers.join(','),
          ...exportData.map(row => 
            headers.map(header => {
              const value = row[header] || '';
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
      } else if (exportType === 'json') {
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `payee_results_${timestamp}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportType === 'excel') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
        
        const timestampForFile = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `payee_results_${timestampForFile}.xlsx`;
        
        XLSX.writeFile(workbook, filename);
      }

      toast({
        title: `Export Complete`,
        description: `Exported ${exportData.length} rows.`,
      });

    } catch (error) {
      console.error(`Export error (${exportType}):`, error);
      toast({
        title: "Export Error",
        description: `Failed to export. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => performExport('csv')}>
        <Download className="w-4 h-4 mr-2" /> 
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => performExport('json')}>
        <Download className="w-4 h-4 mr-2" /> 
        Export JSON
      </Button>
      <Button variant="outline" size="sm" onClick={() => performExport('excel')}>
        <Download className="w-4 h-4 mr-2" /> 
        Export Excel
      </Button>
    </div>
  );
};

export default ExportButtons;
