
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Play, TestTube, Users, Eye } from "lucide-react";
import SingleClassificationForm from "@/components/SingleClassificationForm";
import BatchClassificationForm from "@/components/BatchClassificationForm";
import SmartFileUpload from "@/components/SmartFileUpload";
import KeywordExclusionManager from "@/components/KeywordExclusionManager";
import SICCodeTester from "@/components/SICCodeTester";
import OptimizedVirtualizedTable from "@/components/table/OptimizedVirtualizedTable";
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";

interface MainTabsProps {
  allResults: PayeeClassification[];
  onBatchClassify: (results: PayeeClassification[]) => void;
  onComplete: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onJobDelete: () => void;
}

const MainTabs = ({ allResults, onBatchClassify, onComplete, onJobDelete }: MainTabsProps) => {
  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="single" className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Single
        </TabsTrigger>
        <TabsTrigger value="batch" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Batch
        </TabsTrigger>
        <TabsTrigger value="upload" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload
        </TabsTrigger>
        <TabsTrigger value="results" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Results
        </TabsTrigger>
        <TabsTrigger value="keywords" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Keywords
        </TabsTrigger>
        <TabsTrigger value="sic-test" className="flex items-center gap-2">
          <TestTube className="h-4 w-4" />
          SIC Test
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="mt-6">
        <SingleClassificationForm />
      </TabsContent>

      <TabsContent value="batch" className="mt-6">
        <BatchClassificationForm 
          onBatchClassify={onBatchClassify}
          onComplete={onComplete}
          onJobDelete={onJobDelete}
        />
      </TabsContent>

      <TabsContent value="upload" className="mt-6">
        <SmartFileUpload 
          onBatchClassify={onBatchClassify}
          onComplete={onComplete}
        />
      </TabsContent>

      <TabsContent value="results" className="mt-6">
        <OptimizedVirtualizedTable results={allResults} />
      </TabsContent>

      <TabsContent value="keywords" className="mt-6">
        <KeywordExclusionManager />
      </TabsContent>

      <TabsContent value="sic-test" className="mt-6">
        <SICCodeTester />
      </TabsContent>
    </Tabs>
  );
};

export default MainTabs;
