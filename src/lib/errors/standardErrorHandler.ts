import React from 'react';
import { toast } from '@/hooks/use-toast';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class StandardError extends Error implements AppError {
  code: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: Date;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'StandardError';
    this.code = code;
    this.userMessage = userMessage;
    this.severity = severity;
    this.metadata = metadata;
    this.timestamp = new Date();
  }
}

// Predefined error types
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_TIMEOUT: 'API_TIMEOUT',
  API_ERROR: 'API_ERROR',
  
  // File errors
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  FILE_VALIDATION_ERROR: 'FILE_VALIDATION_ERROR',
  FILE_PROCESSING_ERROR: 'FILE_PROCESSING_ERROR',
  
  // Batch processing errors
  BATCH_CREATION_ERROR: 'BATCH_CREATION_ERROR',
  BATCH_PROCESSING_ERROR: 'BATCH_PROCESSING_ERROR',
  BATCH_DOWNLOAD_ERROR: 'BATCH_DOWNLOAD_ERROR',
  
  // Classification errors
  CLASSIFICATION_ERROR: 'CLASSIFICATION_ERROR',
  DUPLICATE_DETECTION_ERROR: 'DUPLICATE_DETECTION_ERROR',
  
  // Authentication errors
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const;

type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Error factory functions
export const createError = {
  network: (message: string, metadata?: Record<string, any>) =>
    new StandardError(
      ErrorCodes.NETWORK_ERROR,
      message,
      'Network connection failed. Please check your internet connection.',
      'medium',
      metadata
    ),
  
  fileUpload: (message: string, metadata?: Record<string, any>) =>
    new StandardError(
      ErrorCodes.FILE_UPLOAD_ERROR,
      message,
      'Failed to upload file. Please try again.',
      'medium',
      metadata
    ),
  
  fileValidation: (message: string, userMessage: string, metadata?: Record<string, any>) =>
    new StandardError(
      ErrorCodes.FILE_VALIDATION_ERROR,
      message,
      userMessage,
      'low',
      metadata
    ),
  
  batchProcessing: (message: string, metadata?: Record<string, any>) =>
    new StandardError(
      ErrorCodes.BATCH_PROCESSING_ERROR,
      message,
      'Batch processing failed. Please try again or contact support.',
      'high',
      metadata
    ),
  
  classification: (message: string, metadata?: Record<string, any>) =>
    new StandardError(
      ErrorCodes.CLASSIFICATION_ERROR,
      message,
      'Classification failed. Please check your API key and try again.',
      'medium',
      metadata
    ),
  
  auth: (message: string, metadata?: Record<string, any>) =>
    new StandardError(
      ErrorCodes.AUTH_ERROR,
      message,
      'Authentication failed. Please sign in again.',
      'high',
      metadata
    ),
  
  unknown: (message: string, metadata?: Record<string, any>) =>
    new StandardError(
      ErrorCodes.UNKNOWN_ERROR,
      message,
      'An unexpected error occurred. Please try again.',
      'medium',
      metadata
    )
};

// Global error handler
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private maxLogSize = 50;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: Error | StandardError, showToast = true): void {
    let appError: AppError;

    if (error instanceof StandardError) {
      appError = error;
    } else {
      // Convert generic error to StandardError
      appError = createError.unknown(error.message, {
        originalError: error.name,
        stack: error.stack
      });
    }

    // Log error
    this.logError(appError);

    // Show user notification based on severity
    if (showToast) {
      this.showUserNotification(appError);
    }

    // Report to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(appError);
    }
  }

  private logError(error: AppError): void {
    // Add to internal log
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console log for development
    console.error(`[${error.code}] ${error.message}`, {
      severity: error.severity,
      metadata: error.metadata,
      timestamp: error.timestamp
    });
  }

  private showUserNotification(error: AppError): void {
    const variant = error.severity === 'high' || error.severity === 'critical' 
      ? 'destructive' 
      : 'default';

    toast({
      title: this.getSeverityTitle(error.severity),
      description: error.userMessage,
      variant,
      duration: error.severity === 'critical' ? 10000 : 5000
    });
  }

  private getSeverityTitle(severity: AppError['severity']): string {
    switch (severity) {
      case 'critical': return 'Critical Error';
      case 'high': return 'Error';
      case 'medium': return 'Warning';
      case 'low': return 'Notice';
      default: return 'Error';
    }
  }

  private reportError(error: AppError): void {
    // In production, send to error reporting service
    // This is a placeholder for services like Sentry, LogRocket, etc.
    console.warn('Error reporting not implemented:', error);
  }

  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getErrorStats() {
    const total = this.errorLog.length;
    const bySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCode = this.errorLog.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, bySeverity, byCode };
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// React hook for error handling
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error | StandardError, showToast = true) => {
    errorHandler.handle(error, showToast);
  }, []);

  const getErrorLog = React.useCallback(() => {
    return errorHandler.getErrorLog();
  }, []);

  const clearErrorLog = React.useCallback(() => {
    errorHandler.clearErrorLog();
  }, []);

  const getErrorStats = React.useCallback(() => {
    return errorHandler.getErrorStats();
  }, []);

  return {
    handleError,
    getErrorLog,
    clearErrorLog,
    getErrorStats
  };
}