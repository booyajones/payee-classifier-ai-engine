
import { UploadState, FileProcessingInfo } from '@/hooks/useSmartFileUpload';
import FileSelectionArea from './FileSelectionArea';
import ColumnSelectionArea from './ColumnSelectionArea';
import EnhancedUploadProgressDisplay from './EnhancedUploadProgressDisplay';
import PerformanceMonitoringDashboard from '../performance/PerformanceMonitoringDashboard';
import UploadSuccessDisplay from './UploadSuccessDisplay';
import UploadErrorDisplay from './UploadErrorDisplay';

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
  
  // Debug logging for component rendering
  console.log('[SMART UPLOAD CONTENT DEBUG] Rendering with state:', {
    uploadState,
    isProcessing,
    hasFileData: !!fileData,
    fileDataLength: fileData?.length || 0,
    hasFileHeaders: !!fileHeaders.length,
    fileHeadersLength: fileHeaders.length,
    selectedPayeeColumn,
    shouldShowColumnSelection: uploadState === 'uploaded' && fileHeaders.length > 0
  });

  return (
    <>
      {uploadState === 'idle' && (
        <>
          {console.log('[SMART UPLOAD CONTENT DEBUG] Showing file selection area')}
          <FileSelectionArea 
            onFileSelect={triggerFileSelect}
            disabled={isProcessing}
          />
        </>
      )}

      {uploadState === 'uploaded' && fileHeaders.length > 0 && (
        <>
          {console.log('[SMART UPLOAD CONTENT DEBUG] Showing column selection area', {
            fileHeaders: fileHeaders.slice(0, 3),
            recordCount: fileData?.length || 0
          })}
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
        </>
      )}

      {uploadState === 'uploaded' && fileHeaders.length === 0 && (
        <>
          {console.log('[SMART UPLOAD CONTENT DEBUG] File uploaded but no headers found')}
          <UploadErrorDisplay
            error="No column headers found in the uploaded file. Please ensure your file has a header row."
            onRetry={resetUpload}
            onReset={resetUpload}
            context="Column Header Detection"
          />
        </>
      )}

      {uploadState === 'processing' && (
        <>
          {console.log('[SMART UPLOAD CONTENT DEBUG] Showing processing display')}
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
        </>
      )}

      {uploadState === 'complete' && (
        <>
          {console.log('[SMART UPLOAD CONTENT DEBUG] Showing success display')}
          <UploadSuccessDisplay
            uploadId={UPLOAD_ID}
            onReset={resetUpload}
            resultCount={processingInfo.uniquePayees}
          />
        </>
      )}

      {uploadState === 'error' && (
        <>
          {console.log('[SMART UPLOAD CONTENT DEBUG] Showing error display')}
          <UploadErrorDisplay
            error={errorMessage}
            onRetry={resetUpload}
            onReset={resetUpload}
            context="Smart File Upload"
          />
        </>
      )}
    </>
  );
};

export default SmartFileUploadContent;
