
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import BatchFormContainer from "./batch/BatchFormContainer";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
}

const BatchClassificationForm = ({ onBatchClassify, onComplete }: BatchClassificationFormProps) => {
  return (
    <BatchFormContainer 
      onBatchClassify={onBatchClassify}
      onComplete={onComplete}
    />
  );
};

export default BatchClassificationForm;
