
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, CheckCircle } from "lucide-react";
import { PayeeClassification } from "@/lib/types";
import { exportResultsWithOriginalDataV3 } from "@/lib/classification/batchExporter";
import * as XLSX from 'xlsx';
import { useToast } from "@/components/ui/use-toast";

interface ExportButtonsProps {
  results: PayeeClassification[];
}

const ExportButtons = ({ results }: ExportButtonsProps) => {
  const { toast } = useToast();

  // FIXED: Enhanced data validation before export
  const validateExportData = () => {
    const validation = {
      isValid: true,
      issues: [] as string[],
      warnings: [] as string[]
    };

    // Check for missing original data
    const missingOriginalData = results.filter(r => !r.originalData).length;
    if (missingOriginalData > 0) {
      validation.warnings.push(`${missingOriginalData} results missing original data`);
    }

    // Check for missing keyword exclusions
    const missingKeywordExclusion = results.filter(r => !r.result.keywordExclusion).length;
    if (missingKeywordExclusion > 0) {
      validation.issues.push(`${missingKeywordExclusion} results missing keyword exclusion data`);
    }

    // Check for missing row indexes
    const missingRowIndex = results.filter(r => typeof r.rowIndex !== 'number').length;
    if (missingRowIndex > 0) {
      validation.issues.push(`${missingRowIndex} results missing row index`);
    }

    if (validation.issues.length > 0) {
      validation.isValid = false;
    }

    return validation;
  };

  const performExport = (exportType: 'csv' | 'json' | 'excel') => {
    try {
      // FIXED: Validate data before export
      const validation = validateExportData();
      
      if (!validation.isValid) {
        toast({
          title: "Data Integrity Warning",
          description: `Export may be incomplete: ${validation.issues.join(', ')}`,
          variant: "destructive",
        });
      }

      // Create a mock batch result to use the FIXED export function
      const batchResult = {
        results,
        successCount: results.length,
        failureCount: 0,
        originalFileData: results.map(r => r.originalData).filter(Boolean)
      };

      const exportData = exportResultsWithOriginalDataV3(batchResult, true);
      
      console.log('[EXPORT BUTTONS] FIXED: Export validation completed:', {
        totalRows: exportData.length,
        hasDataIntegrityStatus: exportData.every(row => row['Data_Integrity_Status']),
        validatedRows: exportData.filter(row => row['Data_Integrity_Status'] === 'Validated_Merge').length,
        fallbackRows: exportData.filter(row => row['Data_Integrity_Status'] === 'Fallback_Applied').length,
        unmatchedRows: exportData.filter(row => row['Data_Integrity_Status'] === 'Unmatched_Result').length
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
        link.setAttribute('download', `payee_results_fixed_${timestamp}.csv`);
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
        link.setAttribute('download', `payee_results_fixed_${timestamp}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportType === 'excel') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, "Fixed Complete Results");
        
        const timestampForFile = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `payee_results_fixed_${timestampForFile}.xlsx`;
        
        XLSX.writeFile(workbook, filename);
      }

      // ENHANCED: Success message with data integrity info
      const integrityStats = {
        validated: exportData.filter(row => row['Data_Integrity_Status'] === 'Validated_Merge').length,
        fallback: exportData.filter(row => row['Data_Integrity_Status'] === 'Fallback_Applied').length,
        unmatched: exportData.filter(row => row['Data_Integrity_Status'] === 'Unmatched_Result').length
      };

      toast({
        title: `${exportType.toUpperCase()} Export Complete (FIXED)`,
        description: `Exported ${exportData.length} rows with enhanced data integrity. Validated: ${integrityStats.validated}, Fallback: ${integrityStats.fallback}, Unmatched: ${integrityStats.unmatched}`,
      });

      if (validation.warnings.length > 0) {
        toast({
          title: "Export Warnings",
          description: validation.warnings.join(', '),
          variant: "default",
        });
      }

    } catch (error) {
      console.error(`FIXED Export error (${exportType}):`, error);
      toast({
        title: "Export Error",
        description: `Failed to export ${exportType.toUpperCase()}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Check data integrity status
  const validation = validateExportData();
  const hasIntegrityIssues = !validation.isValid || validation.warnings.length > 0;

  return (
    <div className="space-y-2">
      {hasIntegrityIssues && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          <AlertTriangle className="w-4 h-4" />
          <span>Data integrity issues detected. Export will include fixes and markers.</span>
        </div>
      )}
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => performExport('csv')}>
          <Download className="w-4 h-4 mr-2" /> 
          {hasIntegrityIssues ? 'Export CSV (Fixed)' : 'Export CSV'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => performExport('json')}>
          <Download className="w-4 h-4 mr-2" /> 
          {hasIntegrityIssues ? 'Export JSON (Fixed)' : 'Export JSON'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => performExport('excel')}>
          <Download className="w-4 h-4 mr-2" /> 
          {hasIntegrityIssues ? 'Export Excel (Fixed)' : 'Export Excel'}
        </Button>
      </div>
      
      {!hasIntegrityIssues && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Data integrity validated - export ready</span>
        </div>
      )}
    </div>
  );
};

export default ExportButtons;
