
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ClassificationConfig } from "@/lib/types";
import { createBatchJob, BatchJob } from "@/lib/openai/trueBatchAPI";

interface BatchTextInputProps {
  payeeNames: string;
  setPayeeNames: (value: string) => void;
  onBatchJobCreated: (batchJob: BatchJob, payeeNames: string[]) => void;
  onReset: () => void;
  config: ClassificationConfig;
}

const BatchTextInput = ({ 
  payeeNames, 
  setPayeeNames, 
  onBatchJobCreated, 
  onReset,
  config 
}: BatchTextInputProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const payeeCount = payeeNames.split("\n").filter(name => name.trim() !== "").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payeeNames.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a list of payee names to classify.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const names = payeeNames.split("\n").map(name => name.trim()).filter(name => name !== "");
      console.log(`[BATCH TEXT INPUT] Creating batch job for ${names.length} names:`, names);
      
      const { generateContextualBatchJobName } = await import('@/lib/services/batchJobNameGenerator');
      const jobName = generateContextualBatchJobName(names.length, 'text');
      const batchJob = await createBatchJob(names, `Text input batch: ${names.length} payees`, jobName);
      console.log(`[BATCH TEXT INPUT] Batch job created:`, batchJob);

      onBatchJobCreated(batchJob, names);

      toast({
        title: "Batch Job Created",
        description: `Successfully submitted ${names.length} payees for batch processing. Job ID: ${batchJob.id.slice(-8)}`,
      });
    } catch (error) {
      console.error("Batch job creation error:", error);
      toast({
        title: "Batch Job Creation Error",
        description: error instanceof Error ? error.message : "An error occurred while creating the batch job.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="payeeNames">Payee Names (one per line)</Label>
          <Textarea
            id="payeeNames"
            placeholder="e.g.,&#x0a;John Smith&#x0a;Acme Corporation&#x0a;Jane Doe"
            value={payeeNames}
            onChange={(e) => setPayeeNames(e.target.value)}
            disabled={isProcessing}
            className="min-h-[150px]"
          />
        </div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Batch Processing Information</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• 50% cost savings compared to real-time processing</li>
          <li>• Results delivered within 24 hours</li>
          <li>• Processing queue managed by OpenAI</li>
          <li>• You can monitor progress in the Batch Jobs tab</li>
        </ul>
      </div>
      
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isProcessing || payeeCount === 0}>
          {isProcessing ? "Creating Batch Job..." : `Submit ${payeeCount} Payees for Batch Processing`}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isProcessing}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </form>
  );
};

export default BatchTextInput;
