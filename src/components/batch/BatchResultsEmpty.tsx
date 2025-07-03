
// @ts-nocheck
import React from 'react';

const BatchResultsEmpty = () => {
  return (
    <div className="text-center py-8 border rounded-md">
      <p className="text-muted-foreground">
        No batch results yet. Complete a batch job to get your CSV file with SIC codes.
      </p>
    </div>
  );
};

export default BatchResultsEmpty;
