
import { UploadState, FileProcessingInfo } from '@/hooks/useSmartFileUpload';
import FileSelectionArea from './FileSelectionArea';
import ColumnSelectionArea from './ColumnSelectionArea';
import EnhancedUploadProgressDisplay from './EnhancedUploadProgressDisplay';
import PerformanceMonitoringDashboard from '../performance/PerformanceMonitoringDashboard';
import UploadSuccessDisplay from './UploadSuccessDisplay';
import UploadErrorDisplay from './UploadErrorDisplay';
import ProgressIndicator from '../ui/progress-indicator';

interface SmartFileUploadContentProps {
  uploadState: UploadState;
  isProcessing: boolean;
  fileData: any[] | null;
  fileHeaders: string[];
  selectedPayeeColumn: string;
  setSelectedPayeeColumn: (column: string) => void;
  processingInfo: FileProcessingInfo;
  errorMessage: string;
  triggerFileSelect: () => void;
  handleColumnSelect: () => void;
  resetUpload: () => void;
  UPLOAD_ID: string;
}

const SmartFileUploadContent = ({
  uploadState,
  isProcessing,
  fileData,
  fileHeaders,
  selectedPayeeColumn,
  setSelectedPayeeColumn,
  processingInfo,
  errorMessage,
  triggerFileSelect,
  handleColumnSelect,
  resetUpload,
  UPLOAD_ID
}: SmartFileUploadContentProps) => {
  

  return (
    <>
      {uploadState === 'idle' && (
        <FileSelectionArea 
          onFileSelect={triggerFileSelect}
          disabled={isProcessing}
        />
      )}

      {uploadState === 'uploaded' && fileHeaders.length > 0 && (
        <ColumnSelectionArea
          fileHeaders={fileHeaders}
          selectedColumn={selectedPayeeColumn}
          onColumnChange={setSelectedPayeeColumn}
          onProcess={handleColumnSelect}
          onCancel={resetUpload}
          recordCount={fileData?.length || 0}
          processingInfo={processingInfo}
          disabled={isProcessing}
        />
      )}

      {uploadState === 'uploaded' && fileHeaders.length === 0 && (
        <UploadErrorDisplay
          error="No column headers found in the uploaded file. Please ensure your file has a header row."
          onRetry={resetUpload}
          onReset={resetUpload}
          context="Column Header Detection"
        />
      )}

      {uploadState === 'processing' && (
        <div className="space-y-4">
          <ProgressIndicator 
            progress={0}
            status="loading"
            message="Processing your file..."
            className="mb-4"
          />
          
          <EnhancedUploadProgressDisplay
            uploadState={uploadState}
            uploadId={UPLOAD_ID}
            showMemoryStats={true}
            showProgressHistory={false}
          />
          
          {/* Performance monitoring for large files */}
          {(fileData?.length || 0) > 10000 && (
            <div className="mt-4">
              <PerformanceMonitoringDashboard 
                isVisible={true}
                compact={true}
              />
            </div>
          )}
        </div>
      )}

      {uploadState === 'complete' && (
        <UploadSuccessDisplay
          uploadId={UPLOAD_ID}
          onReset={resetUpload}
          resultCount={processingInfo.uniquePayees}
        />
      )}

      {uploadState === 'error' && (
        <UploadErrorDisplay
          error={errorMessage}
          onRetry={resetUpload}
          onReset={resetUpload}
          context="Smart File Upload"
        />
      )}
    </>
  );
};

export default SmartFileUploadContent;
