
import { PayeeClassification, BatchProcessingResult } from "@/lib/types";
import BatchFormContainer from "./batch/BatchFormContainer";

interface BatchClassificationFormProps {
  onBatchClassify?: (results: PayeeClassification[]) => void;
  onComplete?: (results: PayeeClassification[], summary: BatchProcessingResult) => void;
  onJobDelete?: () => void;
}

const BatchClassificationForm = ({ onBatchClassify, onComplete, onJobDelete }: BatchClassificationFormProps) => {
  return (
    <BatchFormContainer 
      onBatchClassify={onBatchClassify}
      onComplete={onComplete}
      onJobDelete={onJobDelete}
    />
  );
};

export default BatchClassificationForm;
