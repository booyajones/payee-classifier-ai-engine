import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Activity } from 'lucide-react';
import { AppHealthChecker, type OverallHealthStatus } from '@/lib/testing/appHealthChecker';
import { Alert, AlertDescription } from '@/components/ui/alert';

const HealthCheckPanel = () => {
  const [healthStatus, setHealthStatus] = useState<OverallHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const status = await AppHealthChecker.performHealthCheck();
      setHealthStatus(status);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Run initial health check
    runHealthCheck();
  }, []);

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>System Health Check</CardTitle>
          </div>
          <Button
            onClick={runHealthCheck}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Checking...' : 'Refresh'}
          </Button>
        </div>
        <CardDescription>
          Comprehensive health check of all application components
          {lastCheck && (
            <span className="block text-xs text-muted-foreground mt-1">
              Last checked: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <Alert>
            <AlertDescription>
              Running comprehensive health checks on database, API connections, and core components...
            </AlertDescription>
          </Alert>
        )}

        {healthStatus && (
          <>
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-3">
                {getStatusIcon(healthStatus.status)}
                <div>
                  <h3 className="font-semibold">
                    Overall Status: {healthStatus.status.charAt(0).toUpperCase() + healthStatus.status.slice(1)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {healthStatus.summary.healthy}/{healthStatus.summary.total} components healthy
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {healthStatus.summary.healthy > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {healthStatus.summary.healthy} Healthy
                  </Badge>
                )}
                {healthStatus.summary.warnings > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {healthStatus.summary.warnings} Warnings
                  </Badge>
                )}
                {healthStatus.summary.errors > 0 && (
                  <Badge variant="destructive">
                    {healthStatus.summary.errors} Errors
                  </Badge>
                )}
              </div>
            </div>

            {/* Component Results */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Component Status</h4>
              {healthStatus.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium">{result.component}</h5>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(result.status)}`}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{result.message}</p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Critical Issues Alert */}
            {healthStatus.results.some(r => r.status === 'error') && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical Issues Found:</strong> Some core components have errors that may affect functionality. 
                  Please address the errors above before proceeding with normal operations.
                </AlertDescription>
              </Alert>
            )}

            {/* Implementation Success Message */}
            {healthStatus.status === 'healthy' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Implementation Complete:</strong> All critical components are healthy! 
                  Your application is ready for full operation including batch processing, file downloads, and new job creation.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthCheckPanel;