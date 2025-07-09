import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstantDownloadService } from '@/lib/services/instantDownloadService';
import { EnhancedFileGenerationService } from '@/lib/services/enhancedFileGenerationService';
import DirectDatabaseDownload from './DirectDatabaseDownload';

interface DownloadStatus {
  status: 'instant' | 'processing' | 'unavailable' | 'checking';
  hasFiles: boolean;
  hasResults: boolean;
  fileUrls?: { csv_file_url: string | null; excel_file_url: string | null };
  isPreparingDownload?: boolean;
}

interface DownloadStatusDisplayProps {
  jobId: string;
  onRefresh?: () => void;
}

const DownloadStatusDisplay = ({ jobId, onRefresh }: DownloadStatusDisplayProps) => {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    status: 'checking',
    hasFiles: false,
    hasResults: false
  });
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  // Check download status
  const checkDownloadStatus = async () => {
    try {
      const status = await InstantDownloadService.hasInstantDownload(jobId);
      setDownloadStatus({
        status: status.status,
        hasFiles: status.hasFiles,
        hasResults: status.hasResults,
        fileUrls: status.fileUrls
      });
    } catch (error) {
      console.error('Error checking download status:', error);
      setDownloadStatus({
        status: 'unavailable',
        hasFiles: false,
        hasResults: false
      });
    }
  };

  // Prepare download by ensuring results are processed and files are generated
  const handlePrepareDownload = async () => {
    setIsPreparingDownload(true);
    try {
      console.log(`[DOWNLOAD STATUS] Preparing download for job ${jobId}`);
      
      // Ensure job is ready for instant download
      const result = await InstantDownloadService.ensureJobReady(jobId);
      
      if (result.success) {
        // Refresh status after preparation
        await checkDownloadStatus();
        onRefresh?.();
      } else {
        console.error('Failed to prepare download:', result.error);
      }
    } catch (error) {
      console.error('Error preparing download:', error);
    } finally {
      setIsPreparingDownload(false);
    }
  };

  useEffect(() => {
    checkDownloadStatus();
    
    // Refresh status every 30 seconds for processing jobs
    const interval = setInterval(() => {
      if (downloadStatus.status === 'processing') {
        checkDownloadStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [jobId]);

  const renderDownloadStatus = () => {
    switch (downloadStatus.status) {
      case 'instant':
        return (
          <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">✅ Ready for Instant Download</span>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Instant
                </Badge>
              </div>
              
              <DirectDatabaseDownload 
                jobId={jobId}
                className="text-sm px-3 py-1"
              />
            </div>
            
            <div className="text-xs text-green-600 font-medium">
              ⚡ Results are pre-processed and ready for immediate download
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">🔄 Preparing Download</span>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  Processing
                </Badge>
              </div>
              
              {isPreparingDownload ? (
                <Button disabled size="sm" className="text-sm px-3 py-1">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing...
                </Button>
              ) : (
                <Button 
                  onClick={handlePrepareDownload}
                  size="sm" 
                  variant="outline"
                  className="text-sm px-3 py-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Prepare Download
                </Button>
              )}
            </div>
            
            <div className="text-xs text-blue-600">
              Results are being processed and files are being generated. This usually takes 1-2 minutes.
            </div>
          </div>
        );

      case 'unavailable':
        return (
          <div className="space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">⚠️ Download Not Available</span>
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                  Unavailable
                </Badge>
              </div>
              
              <Button 
                onClick={handlePrepareDownload}
                size="sm" 
                variant="outline"
                className="text-sm px-3 py-1"
                disabled={isPreparingDownload}
              >
                {isPreparingDownload ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Fix & Prepare
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-xs text-orange-600">
              The job is complete but results need to be processed. Click "Fix & Prepare" to generate the download.
            </div>
          </div>
        );

      case 'checking':
      default:
        return (
          <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
              <span className="text-sm font-medium text-gray-700">🔍 Checking Download Status...</span>
            </div>
          </div>
        );
    }
  };

  return renderDownloadStatus();
};

export default DownloadStatusDisplay;