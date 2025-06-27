import { toast } from "@/hooks/use-toast";

export interface AppError {
  code: string;
  message: string;
  details?: string;
  retryable?: boolean;
  timestamp?: Date;
  context?: string;
}

export class BatchProcessingError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;
  timestamp: Date;
  context?: string;

  constructor(code: string, message: string, details?: string, retryable = false, context?: string) {
    super(message);
    this.name = 'BatchProcessingError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date();
    this.context = context;
  }
}

export class FileValidationError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;
  timestamp: Date;
  context?: string;

  constructor(code: string, message: string, details?: string, retryable = false, context?: string) {
    super(message);
    this.name = 'FileValidationError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date();
    this.context = context;
  }
}

export class DatabaseError extends Error implements AppError {
  code: string;
  details?: string;
  retryable: boolean;
  timestamp: Date;
  context?: string;

  constructor(code: string, message: string, details?: string, retryable = false, context?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date();
    this.context = context;
  }
}

export const ERROR_CODES = {
  // File-related errors
  BATCH_CREATION_FAILED: 'BATCH_CREATION_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  EMPTY_FILE: 'EMPTY_FILE',
  NO_VALID_PAYEES: 'NO_VALID_PAYEES',
  PARSING_ERROR: 'PARSING_ERROR',
  
  // API-related errors
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_AUTHENTICATION_FAILED: 'API_AUTHENTICATION_FAILED',
  API_TIMEOUT: 'API_TIMEOUT',
  
  // Network-related errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_LOST: 'CONNECTION_LOST',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Storage-related errors
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ACCESS_DENIED: 'STORAGE_ACCESS_DENIED',
  
  // Processing-related errors
  JOB_EXPIRED: 'JOB_EXPIRED',
  JOB_CANCELLED: 'JOB_CANCELLED',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  
  // Database-related errors
  DATABASE_CONSTRAINT_ERROR: 'DATABASE_CONSTRAINT_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR: 'DATABASE_QUERY_ERROR'
} as const;

export const handleError = (error: unknown, context?: string): AppError => {
  console.error(`[ERROR HANDLER] ${context || 'Unknown context'}:`, error);

  // If it's already an AppError, just add context if needed
  if (error instanceof BatchProcessingError || error instanceof FileValidationError || error instanceof DatabaseError) {
    if (context && !error.context) {
      error.context = context;
    }
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
        true,
        context
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
        true,
        context
      );
    }

    // Handle API-related errors
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return new BatchProcessingError(
        ERROR_CODES.API_QUOTA_EXCEEDED,
        'API quota exceeded. Please try again later.',
        error.message,
        true,
        context
      );
    }

    if (error.message.includes('401') || error.message.includes('authentication')) {
      return new BatchProcessingError(
        ERROR_CODES.API_AUTHENTICATION_FAILED,
        'Authentication failed. Please check your API key.',
        error.message,
        false,
        context
      );
    }

    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return new BatchProcessingError(
        ERROR_CODES.API_TIMEOUT,
        'Request timed out. Please try again.',
        error.message,
        true,
        context
      );
    }

    // Handle network errors
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new BatchProcessingError(
        ERROR_CODES.NETWORK_ERROR,
        'Network error occurred. Please check your connection and try again.',
        error.message,
        true,
        context
      );
    }

    // Handle storage errors
    if (error.message.includes('QuotaExceededError') || error.message.includes('storage quota')) {
      return new BatchProcessingError(
        ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
        'Local storage is full. Please clear some data and try again.',
        error.message,
        false,
        context
      );
    }

    // Handle memory errors
    if (error.message.includes('Maximum call stack size exceeded') || 
        error.message.includes('out of memory')) {
      return new BatchProcessingError(
        ERROR_CODES.MEMORY_LIMIT_EXCEEDED,
        'Memory limit exceeded. Try processing smaller batches.',
        error.message,
        true,
        context
      );
    }

    // Generic error
    return new BatchProcessingError(
      'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred.',
      error.stack,
      false,
      context
    );
  }

  // Fallback for non-Error objects
  return new BatchProcessingError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred.',
    String(error),
    false,
    context
  );
};

export const showErrorToast = (error: AppError, context?: string) => {
  const title = context ? `${context} Error` : 'Error';
  
  // Prevent duplicate toasts by checking message content
  const isDuplicateMessage = error.message.length < 10 || error.message === 'An unexpected error occurred.';
  
  if (isDuplicateMessage) {
    console.warn('[ERROR HANDLER] Skipping generic/duplicate error toast:', error.message);
    return;
  }
  
  toast({
    title,
    description: error.message,
    variant: "destructive",
    duration: 6000, // Show for 6 seconds instead of default
  });

  // Log detailed error for debugging
  console.error(`[${error.code}] ${error.message}`, {
    details: error.details,
    context: error.context,
    timestamp: error.timestamp,
    retryable: error.retryable
  });
};

export const showRetryableErrorToast = (
  error: AppError, 
  onRetry: () => void, 
  context?: string
) => {
  if (error.retryable) {
    toast({
      title: `${context || 'Operation'} Failed`,
      description: `${error.message} This error can be retried.`,
      variant: "destructive",
      duration: 8000, // Longer duration for retryable errors
    });

    console.log('[RETRY] Retryable error occurred:', error);
  } else {
    showErrorToast(error, context);
  }
};

export const showSuccessToast = (message: string, title?: string) => {
  toast({
    title: title || 'Success',
    description: message,
    duration: 4000,
  });
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

// Utility function to create error reports for debugging
export const createErrorReport = (error: AppError, additionalInfo?: any): object => {
  return {
    errorId: `${error.code}-${Date.now()}`,
    code: error.code,
    message: error.message,
    details: error.details,
    context: error.context,
    timestamp: error.timestamp,
    retryable: error.retryable,
    additionalInfo,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
};
