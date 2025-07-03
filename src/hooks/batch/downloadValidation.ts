
import { BatchJob } from "@/lib/openai/trueBatchAPI";
import { PayeeRowData } from "@/lib/rowMapping";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateJobComplete(
  onJobComplete: (results: any[], summary: any, jobId: string) => void
): ValidationResult {
  if (typeof onJobComplete !== 'function') {
    const errorMsg = `onJobComplete callback is not a function (type: ${typeof onJobComplete})`;
    productionLogger.error(`[BATCH DOWNLOAD] ${errorMsg}`);
    return {
      isValid: false,
      error: "Download callback function is missing. Please refresh the page and try again."
    };
  }
  return { isValid: true };
}

export function validatePayeeData(
  payeeData: PayeeRowData | undefined,
  job: BatchJob
): ValidationResult {
  if (!payeeData) {
    return {
      isValid: false,
      error: "Payee data not found for this job."
    };
  }

  const uniquePayeeNames = payeeData.uniquePayeeNames;
  if (!uniquePayeeNames || uniquePayeeNames.length === 0) {
    return {
      isValid: false,
      error: "No payee names found for this job."
    };
  }

  return { isValid: true };
}
