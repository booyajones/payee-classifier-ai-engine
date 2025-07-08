import React, { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleFullRecovery = async () => {
    // Clear localStorage and sessionStorage
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('batch') || key.includes('job') || key.includes('polling')) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('batch') || key.includes('job') || key.includes('polling')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Storage cleanup warning:', e);
      }
    }
    resetErrorBoundary();
  };

  const handlePageReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            The application encountered an unexpected error. You can try to recover or reload the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            <strong>Error:</strong> {error.message}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={resetErrorBoundary} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button onClick={handleFullRecovery} variant="outline" className="w-full">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency Recovery
            </Button>
            
            <Button onClick={handlePageReload} variant="secondary" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            If the problem persists, try clearing your browser cache or contact support.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

export const EnhancedErrorBoundary: React.FC<EnhancedErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = ErrorFallback
}) => {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    console.error('[ERROR BOUNDARY] Application error:', error);
    console.error('[ERROR BOUNDARY] Component stack:', errorInfo.componentStack);
  };

  return (
    <ErrorBoundary
      FallbackComponent={FallbackComponent}
      onError={handleError}
      onReset={() => console.log('[ERROR BOUNDARY] Resetting application state')}
    >
      {children}
    </ErrorBoundary>
  );
};