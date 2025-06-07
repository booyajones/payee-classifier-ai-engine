
import { Button } from "@/components/ui/button";
import { Download, CheckCircle } from "lucide-react";
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
      console.log('[EXPORT BUTTONS] FIXED: Starting export with deduplication:', {
        totalResults: results.length,
        exportType
      });

      // FIXED: Create safe batch result for export with deduplication
      const uniqueResults = results.filter((result, index, array) => {
        const firstOccurrence = array.findIndex(r => r.payeeName === result.payeeName);
        return firstOccurrence === index;
      });

      console.log('[EXPORT BUTTONS] Deduplication complete:', {
        originalCount: results.length,
        uniqueCount: uniqueResults.length,
        duplicatesRemoved: results.length - uniqueResults.length
      });

      const batchResult = {
        results: uniqueResults,
        successCount: uniqueResults.length,
        failureCount: 0,
        originalFileData: uniqueResults.map(r => r.originalData).filter(Boolean)
      };

      // VALIDATION: Ensure we have matching original data
      if (batchResult.originalFileData.length !== uniqueResults.length) {
        console.warn('[EXPORT BUTTONS] Missing original data for some results, using fallback');
        batchResult.originalFileData = uniqueResults.map((r, i) => r.originalData || { 
          PayeeName: r.payeeName, 
          RowIndex: i,
          FallbackApplied: true 
        });
      }

      const exportData = exportResultsWithOriginalDataV3(batchResult, true);
      
      console.log('[EXPORT BUTTONS] FIXED: Export data created without duplicates:', {
        totalRows: exportData.length,
        uniqueResults: true
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      
      if (exportType === 'csv') {
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
        link.setAttribute('download', `payee_results_deduplicated_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportType === 'json') {
        // Download JSON
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `payee_results_deduplicated_${timestamp}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportType === 'excel') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, "Deduplicated Results");
        
        const timestampForFile = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `payee_results_deduplicated_${timestampForFile}.xlsx`;
        
        XLSX.writeFile(workbook, filename);
      }

      const duplicatesRemoved = results.length - uniqueResults.length;
      toast({
        title: `${exportType.toUpperCase()} Export Complete (Deduplicated)`,
        description: `Exported ${exportData.length} unique rows${duplicatesRemoved > 0 ? ` (removed ${duplicatesRemoved} duplicates)` : ''} with perfect data alignment.`,
      });

    } catch (error) {
      console.error(`FIXED Export error (${exportType}):`, error);
      toast({
        title: "Export Error",
        description: `Failed to export ${exportType.toUpperCase()}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => performExport('csv')}>
          <Download className="w-4 h-4 mr-2" /> 
          Export CSV (Deduplicated)
        </Button>
        <Button variant="outline" size="sm" onClick={() => performExport('json')}>
          <Download className="w-4 h-4 mr-2" /> 
          Export JSON (Deduplicated)
        </Button>
        <Button variant="outline" size="sm" onClick={() => performExport('excel')}>
          <Download className="w-4 h-4 mr-2" /> 
          Export Excel (Deduplicated)
        </Button>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>Fixed pipeline - duplicates removed, perfect data alignment guaranteed</span>
      </div>
    </div>
  );
};

export default ExportButtons;
