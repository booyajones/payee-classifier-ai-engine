
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  prevResetKeys?: Array<string | number>;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: this.generateErrorId(),
      prevResetKeys: props.resetKeys
    };
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    const { resetKeys } = props;
    const { prevResetKeys, hasError } = state;
    
    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevResetKeys && 
        resetKeys.some((key, idx) => key !== prevResetKeys[idx])) {
      return {
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        prevResetKeys: resetKeys
      };
    }
    
    if (resetKeys !== prevResetKeys) {
      return { prevResetKeys: resetKeys };
    }
    
    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    productionLogger.error(`[ERROR BOUNDARY ${this.state.errorId}] Component error caught:`, error, errorInfo);
    
    // Report specific error patterns
    if (error.message.includes('Maximum call stack size exceeded')) {
      productionLogger.error('[ERROR BOUNDARY] Stack overflow detected - possible infinite loop');
    }
    
    if (error.message.includes('Cannot read properties of undefined')) {
      productionLogger.error('[ERROR BOUNDARY] Undefined property access detected');
    }
    
    this.setState({ error, errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: this.generateErrorId()
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isStackOverflow = this.state.error?.message.includes('Maximum call stack size exceeded');
      const isRenderError = this.state.error?.message.includes('Cannot read properties of undefined');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2 space-y-4">
                {isStackOverflow ? (
                  <div>
                    <p className="font-medium text-destructive mb-2">Stack Overflow Detected</p>
                    <p className="text-sm">The application encountered an infinite loop. This usually happens when:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
                      <li>Circular dependencies in component logic</li>
                      <li>Recursive function calls without proper exit conditions</li>
                      <li>Large data processing exceeding memory limits</li>
                    </ul>
                  </div>
                ) : isRenderError ? (
                  <div>
                    <p className="font-medium text-destructive mb-2">Render Error</p>
                    <p className="text-sm">A component tried to access undefined data. This usually happens when:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1 text-xs">
                      <li>Data hasn't loaded yet but component tries to use it</li>
                      <li>API response structure doesn't match expected format</li>
                      <li>Required props are missing or undefined</li>
                    </ul>
                  </div>
                ) : (
                  <p>The application encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.</p>
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
                
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} size="sm">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline" size="sm">
                    <Home className="h-3 w-3 mr-1" />
                    Go Home
                  </Button>
                  <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                    Reload Page
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
