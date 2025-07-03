import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";

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

const BatchFormTabs = (props: BatchFormTabsProps) => {
  return (
    <Tabs value={props.activeTab} onValueChange={props.onTabChange}>
      <TabsList>
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="jobs">Jobs</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload">
        <div className="p-4 text-center text-muted-foreground">
          Upload functionality temporarily disabled during cleanup.
        </div>
      </TabsContent>
      
      <TabsContent value="jobs">
        <div className="p-4 text-center text-muted-foreground">
          Job management functionality temporarily disabled during cleanup.
        </div>
      </TabsContent>
      
      <TabsContent value="results">
        <div className="p-4 text-center text-muted-foreground">
          Results display functionality temporarily disabled during cleanup.
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default BatchFormTabs;