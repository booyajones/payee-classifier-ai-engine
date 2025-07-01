import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, RefreshCw, Bug, ChevronDown } from 'lucide-react';
import { logger } from '@/lib/logging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundaryEnhanced extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log to our centralized logging system
    logger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId,
      timestamp: new Date().toISOString()
    }, 'ERROR_BOUNDARY');

    // Call the optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
    
    logger.info('Error report copied to clipboard', { errorId }, 'ERROR_BOUNDARY');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const isDevelopment = import.meta.env.DEV;

      return (
        <Card className="m-4 border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </div>
            <CardDescription>
              An unexpected error occurred. Error ID: <code className="bg-muted px-1 rounded">{errorId}</code>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="font-medium">{error?.message}</p>
                {isDevelopment && (
                  <Collapsible className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto">
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Show technical details
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 p-3 bg-muted rounded text-xs font-mono whitespace-pre-wrap">
                        <div className="mb-2">
                          <strong>Stack Trace:</strong>
                          <div>{error?.stack}</div>
                        </div>
                        {errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <div>{errorInfo.componentStack}</div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={this.handleRetry} 
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReportError} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Copy Error Report
              </Button>
              
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Reload Page
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>If this problem persists, please:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Check your internet connection</li>
                {isDevelopment && <li>Check the browser console for more details</li>}
              </ul>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryEnhanced;