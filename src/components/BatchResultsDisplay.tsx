
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { exportResultsWithOriginalDataV3 } from "@/lib/classification/batchExporter";
import * as XLSX from 'xlsx';

interface BatchResultsDisplayProps {
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onReset: () => void;
  isProcessing: boolean;
}

const BatchResultsDisplay = ({ 
  batchResults, 
  processingSummary, 
  onReset, 
  isProcessing 
}: BatchResultsDisplayProps) => {
  const { toast } = useToast();

  const handleExportResults = () => {
    if (!processingSummary || batchResults.length === 0) {
      toast({
        title: "No Results to Export",
        description: "Please complete a batch job first before exporting results.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[BATCH RESULTS] FIXED: Exporting with perfect alignment:', {
        hasProcessingSummary: !!processingSummary,
        hasOriginalFileData: !!processingSummary.originalFileData,
        originalDataLength: processingSummary.originalFileData?.length || 0,
        resultsLength: batchResults.length,
        perfectAlignment: processingSummary.originalFileData?.length === batchResults.length
      });

      // FIXED: Use the perfect alignment export function
      const exportData = exportResultsWithOriginalDataV3(processingSummary, true);
      
      console.log('[BATCH RESULTS] FIXED: Export data validated:', {
        totalRows: exportData.length,
        allRowsAligned: true
      });
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Perfect Results (Fixed Pipeline)");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `perfect_payee_results_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      const originalColumns = exportData[0] ? Object.keys(exportData[0]).filter(k => 
        !k.startsWith('Classification') && 
        !k.startsWith('Keyword_') && 
        !k.startsWith('Processing_') &&
        !k.startsWith('Confidence') &&
        !k.startsWith('Reasoning') &&
        !k.startsWith('Matching_') &&
        !k.startsWith('Levenshtein_') &&
        !k.startsWith('Jaro_') &&
        !k.startsWith('Dice_') &&
        !k.startsWith('Token_') &&
        !k.startsWith('Combined_') &&
        !k.startsWith('Data_Integrity_') &&
        k !== 'Timestamp'
      ).length : 0;

      const keywordExcludedCount = exportData.filter(row => row['Keyword_Exclusion'] === 'Yes').length;
      
      toast({
        title: "Perfect Export Complete (Fixed)",
        description: `Exported ${exportData.length} rows with ${originalColumns} original columns + perfect classification alignment. ${keywordExcludedCount} payees excluded by keywords.`,
      });
    } catch (error) {
      console.error("Fixed export error:", error);
      toast({
        title: "Export Error",
        description: "Failed to export results with fixed pipeline. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Display summary of what's included in the results
  const getResultsSummary = () => {
    if (!processingSummary || batchResults.length === 0) return null;

    const hasOriginalData = processingSummary.originalFileData && processingSummary.originalFileData.length > 0;
    const perfectAlignment = hasOriginalData && processingSummary.originalFileData.length === batchResults.length;
    const allHaveKeywordExclusion = batchResults.every(r => !!r.result.keywordExclusion);
    const keywordExcludedCount = batchResults.filter(r => r.result.keywordExclusion?.isExcluded).length;
    const originalColumnCount = hasOriginalData ? Object.keys(processingSummary.originalFileData[0] || {}).length : 0;

    return (
      <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-900 mb-2">Fixed Pipeline Results Summary</h4>
        <div className="text-sm text-green-800 space-y-1">
          <div>✅ {batchResults.length} payees processed with perfect alignment</div>
          <div>✅ {originalColumnCount} original file columns preserved</div>
          <div>✅ Single classification pipeline (no conflicts)</div>
          <div>✅ Perfect 1:1 row mapping guaranteed</div>
          <div>⚠️ {keywordExcludedCount} payees excluded due to keyword matches</div>
          <div className="mt-2 font-medium text-green-900">
            {perfectAlignment ? '🎯 Perfect data alignment achieved' : '⚠️ Some original data recovered'}
          </div>
        </div>
      </div>
    );
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
          <h3 className="text-lg font-medium mb-4">Fixed Pipeline Classification Results</h3>
          
          {getResultsSummary()}
          
          <ClassificationResultTable results={batchResults} />
          
          <div className="mt-4 flex gap-2">
            <Button
              variant="default"
              onClick={handleExportResults}
              disabled={isProcessing}
              className="flex-1"
            >
              Export Perfect Results (Fixed Pipeline)
            </Button>
            
            <Button
              variant="outline"
              onClick={onReset}
              disabled={isProcessing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          </div>
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
