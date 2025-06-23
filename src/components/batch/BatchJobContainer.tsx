
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';
import BatchJobList from './BatchJobList';

interface BatchJobContainerProps {
  jobs: BatchJob[];
  payeeRowDataMap: Record<string, PayeeRowData>;
  listProps: any;
}

const BatchJobContainer = React.memo(({ jobs, payeeRowDataMap, listProps }: BatchJobContainerProps) => {
  console.log(`[BATCH CONTAINER] Rendering ${jobs.length} jobs`);

  if (jobs.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>No batch jobs found. Upload a file to see jobs here.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <BatchJobList {...listProps} />;
});

BatchJobContainer.displayName = 'BatchJobContainer';

export default BatchJobContainer;
