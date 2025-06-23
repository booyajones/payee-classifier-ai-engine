
import { toast } from "@/hooks/use-toast";

export interface AppError {
  code: string;
  message: string;
  details?: string;
  retryable?: boolean;
}

export class BatchProcessingError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;

  constructor(code: string, message: string, details?: string, retryable = false) {
    super(message);
    this.name = 'BatchProcessingError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export class FileValidationError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;

  constructor(code: string, message: string, details?: string, retryable = false) {
    super(message);
    this.name = 'FileValidationError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export class DatabaseError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;

  constructor(code: string, message: string, details?: string, retryable = false) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export const ERROR_CODES = {
  BATCH_CREATION_FAILED: 'BATCH_CREATION_FAILED',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  EMPTY_FILE: 'EMPTY_FILE',
  NO_VALID_PAYEES: 'NO_VALID_PAYEES',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  JOB_EXPIRED: 'JOB_EXPIRED',
  PARSING_ERROR: 'PARSING_ERROR',
  DATABASE_CONSTRAINT_ERROR: 'DATABASE_CONSTRAINT_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR'
} as const;

export const handleError = (error: unknown, context?: string): AppError => {
  console.error(`[ERROR HANDLER] ${context || 'Unknown context'}:`, error);

  if (error instanceof BatchProcessingError || error instanceof FileValidationError || error instanceof DatabaseError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle database constraint errors
    if (error.message.includes('unique or exclusion constraint') || 
        error.message.includes('ON CONFLICT') ||
        error.message.includes('duplicate key value')) {
      return new DatabaseError(
        ERROR_CODES.DATABASE_CONSTRAINT_ERROR,
        'Database constraint violation. This may be due to duplicate data.',
        error.message,
        true
      );
    }

    // Handle database connection errors
    if (error.message.includes('connection') || 
        error.message.includes('timeout') ||
        error.message.includes('ECONNREFUSED')) {
      return new DatabaseError(
        ERROR_CODES.DATABASE_CONNECTION_ERROR,
        'Database connection failed. Please try again.',
        error.message,
        true
      );
    }

    // Handle specific error patterns
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return new BatchProcessingError(
        ERROR_CODES.API_QUOTA_EXCEEDED,
        'API quota exceeded. Please try again later.',
        error.message,
        true
      );
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new BatchProcessingError(
        ERROR_CODES.NETWORK_ERROR,
        'Network error occurred. Please check your connection and try again.',
        error.message,
        true
      );
    }

    if (error.message.includes('QuotaExceededError') || error.message.includes('storage quota')) {
      return new BatchProcessingError(
        ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
        'Local storage is full. Please clear some data and try again.',
        error.message,
        false
      );
    }

    // Generic error
    return new BatchProcessingError(
      'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred.',
      error.stack,
      false
    );
  }

  // Fallback for non-Error objects
  return new BatchProcessingError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred.',
    String(error),
    false
  );
};

export const showErrorToast = (error: AppError, context?: string) => {
  const title = context ? `${context} Error` : 'Error';
  
  toast({
    title,
    description: error.message,
    variant: "destructive",
  });

  // Log detailed error for debugging
  console.error(`[${error.code}] ${error.message}`, error.details);
};

export const showRetryableErrorToast = (
  error: AppError, 
  onRetry: () => void, 
  context?: string
) => {
  if (error.retryable) {
    toast({
      title: `${context || 'Operation'} Failed`,
      description: `${error.message} Click retry to try again.`,
      variant: "destructive",
    });

    // For now, we'll just show the error without the retry button
    // The user can manually retry through the UI
    console.log('[RETRY] Retryable error occurred:', error);
  } else {
    showErrorToast(error, context);
  }
};

// Utility function to safely execute database operations with error handling
export const withDatabaseErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const appError = handleError(error, context);
    showErrorToast(appError, context);
    
    // For retryable database errors, we could implement retry logic here
    if (appError.retryable && appError instanceof DatabaseError) {
      console.log(`[DATABASE] Retryable error in ${context}, consider implementing retry logic`);
    }
    
    return null;
  }
};
