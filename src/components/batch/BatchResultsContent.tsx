
// @ts-nocheck
import React from 'react';
import { PayeeClassification } from '@/lib/types';

interface BatchResultsContentProps {
  batchResults: PayeeClassification[];
}

const BatchResultsContent = ({ batchResults }: BatchResultsContentProps) => {
  return (
    <div className="text-center py-8 border rounded-md mb-4">
      <h3 className="text-lg font-medium mb-2">Results Ready</h3>
      <p className="text-muted-foreground mb-4">
        Your classification results are ready with SIC codes for businesses. The CSV file should have downloaded automatically.
      </p>
      <p className="text-sm text-muted-foreground">
        {batchResults.length} results processed successfully
        {batchResults.filter(r => r.result.sicCode).length > 0 && 
          ` • ${batchResults.filter(r => r.result.sicCode).length} businesses with SIC codes`
        }
      </p>
    </div>
  );
};

export default BatchResultsContent;
