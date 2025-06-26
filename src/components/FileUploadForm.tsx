
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Database } from "lucide-react";
import { ClassificationConfig } from "@/lib/types";
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";
import { useFileUploadForm } from "@/hooks/useFileUploadForm";
import FileUploadSection from "./upload/FileUploadSection";
import ColumnSelectionSection from "./upload/ColumnSelectionSection";
import ProcessingButtons from "./upload/ProcessingButtons";
import BackgroundSaveStatusDisplay from "./upload/BackgroundSaveStatusDisplay";
import EnhancedPerformanceInfo from "./upload/EnhancedPerformanceInfo";

interface FileUploadFormProps {
  onBatchJobCreated: (batchJob: BatchJob, payeeRowData: PayeeRowData) => void;
  config?: ClassificationConfig;
}

const FileUploadForm = ({ 
  onBatchJobCreated,
  config = {
    aiThreshold: 80,
    bypassRuleNLP: true,
    useEnhanced: true,
    offlineMode: false,
    useFuzzyMatching: true,
    similarityThreshold: 85
  }
}: FileUploadFormProps) => {
  const {
    file,
    columns,
    selectedColumn,
    setSelectedColumn,
    isLoading,
    fileError,
    validationStatus,
    fileInfo,
    backgroundSaveStatus,
    isRetrying,
    retryCount,
    resetForm,
    handleFileChange,
    handleProcess
  } = useFileUploadForm(onBatchJobCreated, config);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Upload File for Classification
          <span className="text-xs font-normal text-green-600 ml-auto">Enhanced Performance</span>
        </CardTitle>
        <CardDescription>
          Upload an Excel or CSV file containing payee names for classification processing. 
          Now with instant batch creation and background data optimization for files up to 500MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}
        
        <FileUploadSection 
          file={file}
          validationStatus={validationStatus}
          onFileChange={handleFileChange}
        />
        
        <ColumnSelectionSection 
          columns={columns}
          selectedColumn={selectedColumn}
          onColumnChange={setSelectedColumn}
          fileInfo={fileInfo}
        />
        
        <ProcessingButtons 
          file={file}
          selectedColumn={selectedColumn}
          isLoading={isLoading}
          validationStatus={validationStatus}
          isRetrying={isRetrying}
          retryCount={retryCount}
          onProcess={handleProcess}
          onReset={resetForm}
        />

        <BackgroundSaveStatusDisplay status={backgroundSaveStatus} />

        <EnhancedPerformanceInfo />
      </CardContent>
    </Card>
  );
};

export default FileUploadForm;
