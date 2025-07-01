
import { AppError } from '@/lib/types/unified';
import { logger } from '@/lib/logging/logger';

export class AppErrorHandler {
  private static instance: AppErrorHandler;
  private context = 'ERROR_HANDLER';

  static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler();
    }
    return AppErrorHandler.instance;
  }

  /**
   * Create a standardized application error
   */
  createError(
    message: string,
    code: string,
    context?: string,
    retryable: boolean = false,
    originalError?: Error
  ): AppError {
    const error = new Error(message) as AppError;
    error.code = code;
    error.context = context;
    error.retryable = retryable;
    error.timestamp = new Date();
    error.name = 'AppError';

    if (originalError) {
      error.cause = originalError;
      error.stack = originalError.stack;
    }

    return error;
  }

  /**
   * Handle and log errors consistently
   */
  handleError(error: Error | AppError, context?: string): AppError {
    const appError = this.isAppError(error) ? error : this.createError(
      error.message,
      'UNKNOWN_ERROR',
      context,
      false,
      error
    );

    logger.error(`Error handled in ${appError.context || context}`, {
      code: appError.code,
      message: appError.message,
      retryable: appError.retryable,
      timestamp: appError.timestamp,
      stack: appError.stack
    }, this.context);

    return appError;
  }

  /**
   * Check if an error is an AppError
   */
  isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'code' in error && 'retryable' in error;
  }

  /**
   * Handle classification errors specifically
   */
  handleClassificationError(error: Error, payeeName?: string): AppError {
    if (error.message.includes('API key')) {
      return this.createError(
        'OpenAI API key is missing or invalid',
        'INVALID_API_KEY',
        'CLASSIFICATION',
        false,
        error
      );
    }

    if (error.message.includes('rate limit')) {
      return this.createError(
        'API rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        'CLASSIFICATION',
        true,
        error
      );
    }

    if (error.message.includes('timeout')) {
      return this.createError(
        'Classification request timed out',
        'CLASSIFICATION_TIMEOUT',
        'CLASSIFICATION',
        true,
        error
      );
    }

    return this.createError(
      `Classification failed${payeeName ? ` for ${payeeName}` : ''}`,
      'CLASSIFICATION_FAILED',
      'CLASSIFICATION',
      true,
      error
    );
  }

  /**
   * Handle file processing errors
   */
  handleFileError(error: Error, fileName?: string): AppError {
    if (error.message.includes('format')) {
      return this.createError(
        'Unsupported file format',
        'INVALID_FILE_FORMAT',
        'FILE_PROCESSING',
        false,
        error
      );
    }

    if (error.message.includes('size')) {
      return this.createError(
        'File size exceeds maximum limit',
        'FILE_TOO_LARGE',
        'FILE_PROCESSING',
        false,
        error
      );
    }

    return this.createError(
      `File processing failed${fileName ? ` for ${fileName}` : ''}`,
      'FILE_PROCESSING_FAILED',
      'FILE_PROCESSING',
      true,
      error
    );
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error: Error, operation?: string): AppError {
    if (error.message.includes('connection')) {
      return this.createError(
        'Database connection failed',
        'DATABASE_CONNECTION_FAILED',
        'DATABASE',
        true,
        error
      );
    }

    if (error.message.includes('constraint')) {
      return this.createError(
        'Data validation constraint failed',
        'DATABASE_CONSTRAINT_VIOLATION',
        'DATABASE',
        false,
        error
      );
    }

    return this.createError(
      `Database operation failed${operation ? ` (${operation})` : ''}`,
      'DATABASE_OPERATION_FAILED',
      'DATABASE',
      true,
      error
    );
  }
}

// Singleton instance
export const errorHandler = AppErrorHandler.getInstance();

// Convenience functions
export const createError = (message: string, code: string, context?: string, retryable?: boolean) =>
  errorHandler.createError(message, code, context, retryable);

export const handleError = (error: Error, context?: string) =>
  errorHandler.handleError(error, context);
