
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { PayeeRowData } from "@/lib/rowMapping";
import SmartFileUpload from "../SmartFileUpload";
import BatchJobManager from "../BatchJobManager";
import BatchResultsDisplay from "../BatchResultsDisplay";

interface BatchFormTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  batchJobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  batchResults: PayeeClassification[];
  processingSummary: BatchProcessingResult | null;
  onFileUploadBatchJob: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  onJobUpdate: (job: BatchJob) => void;
  onJobComplete: (results: PayeeClassification[], summary: BatchProcessingResult, jobId: string) => void;
  onJobDelete: (jobId: string) => void;
  onReset: () => void;
}

const BatchFormTabs = ({
  activeTab,
  onTabChange,
  batchJobs,
  payeeRowDataMap,
  batchResults,
  processingSummary,
  onFileUploadBatchJob,
  onJobUpdate,
  onJobComplete,
  onJobDelete,
  onReset
}: BatchFormTabsProps) => {
  console.log(`[BATCH FORM TABS] Rendering with ${batchJobs.length} jobs, active tab: ${activeTab}`);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upload">File Upload</TabsTrigger>
        <TabsTrigger value="jobs">
          Batch Jobs {batchJobs.length > 0 && `(${batchJobs.length})`}
        </TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="mt-4">
        <SmartFileUpload 
          onBatchJobCreated={onFileUploadBatchJob}
          onProcessingComplete={onJobComplete}
        />
      </TabsContent>

      <TabsContent value="jobs" className="mt-4">
        {batchJobs.length === 0 ? (
          <div className="text-center py-8 border rounded-md">
            <p className="text-muted-foreground">
              No batch jobs yet. Upload a file to see jobs here.
            </p>
          </div>
        ) : (
          <BatchJobManager
            key={`jobs-${batchJobs.length}`}
            jobs={batchJobs}
            payeeRowDataMap={payeeRowDataMap}
            onJobUpdate={onJobUpdate}
            onJobComplete={onJobComplete}
            onJobDelete={onJobDelete}
          />
        )}
      </TabsContent>
      
      <TabsContent value="results" className="mt-4">
        <BatchResultsDisplay
          batchResults={batchResults}
          processingSummary={processingSummary}
          onReset={onReset}
          isProcessing={false}
        />
      </TabsContent>
    </Tabs>
  );
};

export default BatchFormTabs;
