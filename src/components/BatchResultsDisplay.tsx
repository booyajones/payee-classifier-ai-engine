
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BatchProcessingSummary from "./BatchProcessingSummary";
import ClassificationResultTable from "./ClassificationResultTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
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
      const exportData = batchResults.map(result => ({
        'Payee_Name': result.payeeName,
        'Classification': result.result.classification,
        'Confidence_%': result.result.confidence,
        'Processing_Tier': result.result.processingTier,
        'Reasoning': result.result.reasoning,
        'Processing_Method': 'OpenAI Batch API',
        'Timestamp': result.timestamp.toISOString()
      }));
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Batch Classification Results");
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `batch_payee_classification_${timestamp}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Export Complete",
        description: `Results exported to ${filename} with batch processing data.`,
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

  return (
    <>
      {processingSummary && (
        <div className="mb-6">
          <BatchProcessingSummary summary={processingSummary} />
        </div>
      )}

      {batchResults.length > 0 ? (
        <div>
          <h3 className="text-lg font-medium mb-2">Batch Classification Results</h3>
          <ClassificationResultTable results={batchResults} />
          
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportResults}
              disabled={isProcessing}
              className="flex-1"
            >
              Export Batch Results
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
