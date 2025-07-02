
import { UploadState, FileProcessingInfo } from '@/hooks/useSmartFileUpload';
import FileSelectionArea from './FileSelectionArea';
import ColumnSelectionArea from './ColumnSelectionArea';
import EnhancedUploadProgressDisplay from './EnhancedUploadProgressDisplay';

import UploadSuccessDisplay from './UploadSuccessDisplay';
import UploadErrorDisplay from './UploadErrorDisplay';
import ProgressIndicator from '../ui/progress-indicator';
import { DuplicateDetectionResults } from '../duplicate';

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
  duplicateDetectionResults?: any;
  onDuplicateReviewComplete?: () => void;
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
  UPLOAD_ID,
  duplicateDetectionResults,
  onDuplicateReviewComplete
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
          
        </div>
      )}

      {uploadState === 'complete' && !duplicateDetectionResults && (
        <UploadSuccessDisplay
          uploadId={UPLOAD_ID}
          onReset={resetUpload}
          resultCount={processingInfo.uniquePayees}
        />
      )}

      {uploadState === 'complete' && duplicateDetectionResults && (
        <DuplicateDetectionResults
          result={duplicateDetectionResults}
          onAcceptGroup={(groupId) => console.log('Accept group:', groupId)}
          onRejectGroup={(groupId) => console.log('Reject group:', groupId)}
          onAcceptMember={(groupId, payeeId) => console.log('Accept member:', payeeId)}
          onRejectMember={(groupId, payeeId) => console.log('Reject member:', payeeId)}
          onExportResults={() => console.log('Export results')}
          onProceedWithProcessing={() => onDuplicateReviewComplete?.()}
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
