
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
      <Alert>
        <AlertDescription>
          No batch jobs found. Submit a batch for processing to see jobs here.
        </AlertDescription>
      </Alert>
    );
  }

  return <BatchJobList {...listProps} />;
});

BatchJobContainer.displayName = 'BatchJobContainer';

export default BatchJobContainer;
