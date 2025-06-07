
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
      console.log('[BATCH RESULTS] Exporting results:', {
        hasProcessingSummary: !!processingSummary,
        hasOriginalFileData: !!processingSummary.originalFileData,
        originalDataLength: processingSummary.originalFileData?.length || 0,
        resultsLength: batchResults.length
      });

      const exportData = exportResultsWithOriginalDataV3(processingSummary, true);
      
      console.log('[BATCH RESULTS] Export data created:', {
        totalRows: exportData.length
      });
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `payee_results_${timestamp}.xlsx`;
      
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
        k !== 'Timestamp' &&
        k !== 'Row_Index'
      ).length : 0;

      const keywordExcludedCount = exportData.filter(row => row['Keyword_Exclusion'] === 'Yes').length;
      
      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} rows with ${originalColumns} original columns. ${keywordExcludedCount} payees excluded by keywords.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Error",
        description: "Failed to export results. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Display summary of what's included in the results
  const getResultsSummary = () => {
    if (!processingSummary || batchResults.length === 0) return null;

    const hasOriginalData = processingSummary.originalFileData && processingSummary.originalFileData.length > 0;
    const allHaveKeywordExclusion = batchResults.every(r => !!r.result.keywordExclusion);
    const keywordExcludedCount = batchResults.filter(r => r.result.keywordExclusion?.isExcluded).length;
    const originalColumnCount = hasOriginalData ? Object.keys(processingSummary.originalFileData[0] || {}).length : 0;

    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Results Summary</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• {batchResults.length} payees processed</div>
          <div>• {originalColumnCount} original file columns preserved</div>
          <div>• {allHaveKeywordExclusion ? 'Keyword exclusion applied to all results' : 'Some results missing keyword exclusion data'}</div>
          <div>• {keywordExcludedCount} payees excluded due to keyword matches</div>
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
          <h3 className="text-lg font-medium mb-4">Classification Results</h3>
          
          {getResultsSummary()}
          
          <ClassificationResultTable results={batchResults} />
          
          <div className="mt-4 flex gap-2">
            <Button
              variant="default"
              onClick={handleExportResults}
              disabled={isProcessing}
              className="flex-1"
            >
              Export Results
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
