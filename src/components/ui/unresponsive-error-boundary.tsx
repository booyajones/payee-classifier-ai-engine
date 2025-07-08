import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface UnresponsiveErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface UnresponsiveErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class UnresponsiveErrorBoundary extends Component<
  UnresponsiveErrorBoundaryProps,
  UnresponsiveErrorBoundaryState
> {
  constructor(props: UnresponsiveErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): UnresponsiveErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[UNRESPONSIVE ERROR BOUNDARY] Caught error:', error, errorInfo);
    
    // Log specific information about potential unresponsiveness causes
    if (error.message?.includes('script') || error.message?.includes('timeout')) {
      console.error('[UNRESPONSIVE ERROR BOUNDARY] Potential unresponsiveness detected');
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    
    // Force page refresh if needed
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.reload();
      }
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Page Became Unresponsive</h3>
                  <p className="text-sm text-muted-foreground">
                    The application encountered an issue that made it unresponsive. 
                    This is often caused by long-running batch jobs or heavy processing.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={this.handleReset}
                    className="w-full"
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try to Recover
                  </Button>
                  
                  <Button 
                    onClick={() => window.location.reload()}
                    className="w-full"
                    variant="default"
                  >
                    Refresh Page
                  </Button>
                </div>

                {this.state.error && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Technical Details</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}