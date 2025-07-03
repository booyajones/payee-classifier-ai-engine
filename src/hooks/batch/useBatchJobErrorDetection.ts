
import { ERROR_CODES } from '@/lib/errorHandler';

// Enhanced error detection for OpenAI API issues
export const detectOpenAIError = (error: unknown): { code: string; message: string; retryable: boolean } => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  productionLogger.debug(`[BATCH ERROR DETECTION] Analyzing error: ${errorMessage}`);

  if (lowerMessage.includes('quota') || lowerMessage.includes('rate limit') || lowerMessage.includes('usage limit')) {
    return {
      code: ERROR_CODES.API_QUOTA_EXCEEDED,
      message: 'OpenAI API quota exceeded. Please check your usage limits and try again later.',
      retryable: true
    };
  }

  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('api key')) {
    return {
      code: ERROR_CODES.API_AUTHENTICATION_FAILED,
      message: 'OpenAI API authentication failed. Please check your API key in the settings.',
      retryable: false
    };
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      code: ERROR_CODES.API_TIMEOUT,
      message: 'Request to OpenAI API timed out. Please try again.',
      retryable: true
    };
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network error occurred while connecting to OpenAI. Please check your connection.',
      retryable: true
    };
  }

  if (lowerMessage.includes('server error') || lowerMessage.includes('500') || lowerMessage.includes('503')) {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: 'OpenAI API server error. Please try again in a few minutes.',
      retryable: true
    };
  }

  return {
    code: 'OPENAI_UNKNOWN_ERROR',
    message: `OpenAI API error: ${errorMessage}`,
    retryable: false
  };
};
