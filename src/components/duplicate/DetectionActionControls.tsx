import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, AlertTriangle } from 'lucide-react';

interface DetectionActionControlsProps {
  duplicate_groups_count: number;
  onExportResults: () => void;
  onProceedWithProcessing: () => void;
}

export const DetectionActionControls = ({ 
  duplicate_groups_count, 
  onExportResults, 
  onProceedWithProcessing 
}: DetectionActionControlsProps) => {
  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={onExportResults}>
        <Download className="h-4 w-4 mr-2" />
        Export Results
      </Button>
      <div className="flex gap-2">
        {duplicate_groups_count > 0 && (
          <Alert className="flex-1 max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Review duplicate groups before proceeding with processing.
            </AlertDescription>
          </Alert>
        )}
        <Button onClick={onProceedWithProcessing}>
          Proceed with Processing
        </Button>
      </div>
    </div>
  );
};