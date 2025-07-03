
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug, FileX } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onFallbackMode?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

class ClassificationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: this.generateErrorId(),
      retryCount: 0
    };
  }

  private generateErrorId(): string {
    return `classification-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: `classification-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context = this.props.context || 'Classification System';
    console.error(`[${context} ERROR BOUNDARY] Component error caught:`, error, errorInfo);
    
    // Log specific error types for classification issues
    if (error.message.includes('Maximum call stack size exceeded')) {
      console.error('[CLASSIFICATION ERROR] Stack overflow detected - possible infinite loop in classification logic');
    }
    
    if (error.message.includes('Cannot read properties of undefined')) {
      console.error('[CLASSIFICATION ERROR] Undefined property access - likely missing data validation');
    }
    
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      console.error('[CLASSIFICATION ERROR] API quota/rate limit exceeded');
    }
    
    this.setState({ error, errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: this.generateErrorId(),
      retryCount: prevState.retryCount + 1
    }));
  };

  handleFallbackMode = () => {
    if (this.props.onFallbackMode) {
      this.props.onFallbackMode();
    }
    this.handleReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isStackOverflow = this.state.error?.message.includes('Maximum call stack size exceeded');
      const isQuotaIssue = this.state.error?.message.includes('quota') || this.state.error?.message.includes('rate limit');
      const isDataIssue = this.state.error?.message.includes('Cannot read properties of undefined');
      const context = this.props.context || 'Classification System';
      const showFallbackOption = this.state.retryCount >= 2 || isQuotaIssue;

      return (
        <div className="p-4 border rounded-md bg-destructive/5">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{context} Error</AlertTitle>
            <AlertDescription className="mt-2 space-y-4">
              {isStackOverflow ? (
                <div>
                  <p className="font-medium text-destructive mb-2">Stack Overflow in Classification</p>
                  <p className="text-sm">The classification system encountered an infinite loop. This usually happens when:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
                    <li>Circular dependencies in classification logic</li>
                    <li>Recursive function calls without proper exit conditions</li>
                    <li>Large batch processing exceeding memory limits</li>
                  </ul>
                </div>
              ) : isQuotaIssue ? (
                <div>
                  <p className="font-medium text-destructive mb-2">API Quota Exceeded</p>
                  <p className="text-sm">The classification service has reached its usage limit. You can:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
                    <li>Wait for the quota to reset</li>
                    <li>Use offline classification mode</li>
                    <li>Process smaller batches</li>
                  </ul>
                </div>
              ) : isDataIssue ? (
                <div>
                  <p className="font-medium text-destructive mb-2">Data Processing Error</p>
                  <p className="text-sm">The classification system couldn't process the provided data. This usually happens when:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
                    <li>Data format is unexpected or corrupted</li>
                    <li>Required fields are missing</li>
                    <li>File contains invalid characters</li>
                  </ul>
                </div>
              ) : (
                <p>The {context.toLowerCase()} encountered an unexpected error. Please try again or use offline mode if the problem persists.</p>
              )}
              
              {this.state.retryCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Retry attempt: {this.state.retryCount}
                </p>
              )}
              
              {this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium flex items-center gap-1">
                    <Bug className="h-3 w-3" />
                    Error Details (ID: {this.state.errorId})
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2 flex-wrap">
                <Button onClick={this.handleReset} size="sm">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
                
                {showFallbackOption && this.props.onFallbackMode && (
                  <Button onClick={this.handleFallbackMode} variant="outline" size="sm">
                    <FileX className="h-3 w-3 mr-1" />
                    Use Offline Mode
                  </Button>
                )}
                
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Reload Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ClassificationErrorBoundary;
