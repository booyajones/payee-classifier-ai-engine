import { useToast } from "@/hooks/use-toast";
import { handleError, showRetryableErrorToast } from "@/lib/errorHandler";

/**
 * Hook for handling different types of batch job refresh errors
 */
export const useBatchJobRefreshErrorHandler = () => {
  const { toast } = useToast();

  const handleRefreshError = (
    error: unknown, 
    jobId: string, 
    retryCallback: () => void
  ) => {
    const appError = handleError(error, 'Job Status Refresh');
    console.error(`[JOB REFRESH] Error refreshing job ${jobId.substring(0, 8)}:`, error);
    
    // Handle specific error types with better user feedback
    if (error instanceof Error) {
      if (error.message.includes('cancelled') || error.message.includes('aborted')) {
        console.log(`[JOB REFRESH] Request cancelled for job ${jobId.substring(0, 8)}`);
        toast({
          title: "Refresh Cancelled",
          description: `Refresh operation was cancelled for job ${jobId.substring(0, 8)}...`,
          variant: "default",
          duration: 4000,
        });
        return; // Don't throw for cancelled requests
      } else if (error.message.includes('timed out')) {
        toast({
          title: "⏱️ API Timeout",
          description: `OpenAI API is responding slowly. Job ${jobId.substring(0, 8)}... refresh timed out after 15 seconds.`,
          variant: "destructive",
          duration: 8000,
        });
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        toast({
          title: "Job Not Found",
          description: `Job ${jobId.substring(0, 8)}... may have been removed from OpenAI. Consider it completed or failed.`,
          variant: "destructive",
          duration: 8000,
        });
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        toast({
          title: "API Authentication Issue",
          description: "OpenAI API key may be invalid. Check your API key settings.",
          variant: "destructive",
          duration: 8000,
        });
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        toast({
          title: "Rate Limited",
          description: `OpenAI API rate limit reached. Please wait a moment before refreshing job ${jobId.substring(0, 8)}...`,
          variant: "destructive",
          duration: 8000,
        });
      } else {
        // Generic API error
        toast({
          title: "Refresh Failed",
          description: `Unable to refresh job ${jobId.substring(0, 8)}... - OpenAI API may be experiencing issues.`,
          variant: "destructive",
          duration: 6000,
        });
      }
    }
    
    // Only show retry option for non-timeout/non-cancelled errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('timed out')) {
      showRetryableErrorToast(appError, retryCallback, 'Job Refresh');
    }
    
    throw error;
  };

  return { handleRefreshError };
};