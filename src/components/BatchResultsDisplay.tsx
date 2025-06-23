
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
      // STRICT VALIDATION: Check all results have original data
      const invalidResults = batchResults.filter(r => !r.originalData);
      if (invalidResults.length > 0) {
        throw new Error(`${invalidResults.length} results missing original data`);
      }

      console.log('[BATCH RESULTS DISPLAY] Pre-export validation:', {
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
        title: "Export Complete",
        description: `Exported exactly ${exportData.length} rows with consistent column naming.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Error",
        description: `Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
          <h3 className="text-lg font-medium mb-4">Classification Results</h3>
          
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
