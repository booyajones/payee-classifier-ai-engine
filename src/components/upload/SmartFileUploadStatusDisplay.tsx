
import { AlertTriangle, Loader2, Database } from 'lucide-react';

interface SmartFileUploadStatusDisplayProps {
  hasGlobalError: boolean;
  isProcessing: boolean;
  fileData: any[] | null;
}

const SmartFileUploadStatusDisplay = ({ 
  hasGlobalError, 
  isProcessing, 
  fileData 
}: SmartFileUploadStatusDisplayProps) => {
  return (
    <>
      {/* Global error state */}
      {hasGlobalError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3" />
            System Alert
          </div>
          <p>There are active errors in the batch processing system. Check the error messages below.</p>
        </div>
      )}

      {/* Processing status */}
      {isProcessing && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
          <div className="flex items-center gap-1 mb-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Enhanced Processing Active
          </div>
          <p>✓ OpenAI batch job creation in progress</p>
          <p>✓ Real-time error detection and handling</p>
          <p>✓ Automatic fallback for large files (45k+ payees)</p>
          <p>✓ You can continue working - processing happens in background</p>
        </div>
      )}

      {/* System enhancements info */}
      <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-200">
        <div className="flex items-center gap-1 text-green-700 font-medium mb-1">
          <Database className="h-3 w-3" />
          Smart Processing Enhancements
        </div>
        <p>🚀 Instant OpenAI batch creation with comprehensive error handling</p>
        <p>📊 Intelligent error detection (quota, auth, network issues)</p>
        <p>🔧 Automatic fallback processing for large files (45k+ payees)</p>
        <p>⚡ Real-time progress tracking and detailed status updates</p>
        <p>🎯 Enhanced user feedback with actionable error messages</p>
      </div>
    </>
  );
};

export default SmartFileUploadStatusDisplay;
