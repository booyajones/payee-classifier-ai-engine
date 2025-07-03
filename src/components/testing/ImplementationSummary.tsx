import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Play, Download, Upload, Users } from 'lucide-react';
import { ImplementationVerifier, type VerificationReport } from '@/lib/testing/implementationVerification';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ImplementationSummary = () => {
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runVerification = async () => {
    setIsLoading(true);
    try {
      const verificationReport = await ImplementationVerifier.verifyImplementation();
      setReport(verificationReport);
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Implementation Status Report
          </CardTitle>
          <CardDescription>
            Comprehensive verification of the holistic review plan implementation
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading && (
            <Alert>
              <AlertDescription>
                Running comprehensive verification across all phases...
              </AlertDescription>
            </Alert>
          )}

          {report && (
            <>
              {/* Overall Status */}
              <div className={`p-4 rounded-lg border ${getStatusColor(report.overallStatus)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(report.overallStatus)}
                    <div>
                      <h3 className="font-semibold text-lg">
                        Implementation: {report.overallStatus.charAt(0).toUpperCase() + report.overallStatus.slice(1)}
                      </h3>
                      <p className="text-sm opacity-80">
                        {report.completionPercentage}% of planned features implemented
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{report.completionPercentage}%</div>
                    <div className="text-xs opacity-80">Complete</div>
                  </div>
                </div>
              </div>

              {/* Phase Results */}
              <div className="space-y-3">
                <h4 className="font-medium">Implementation Phases</h4>
                {report.phases.map((phase, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-md border bg-background"
                  >
                    <div className="flex items-center gap-3">
                      {phase.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      <div>
                        <div className="font-medium">{phase.phase}</div>
                        {phase.issues.length > 0 && (
                          <div className="text-sm text-red-600">
                            Issues: {phase.issues.join(', ')}
                          </div>
                        )}
                        {phase.recommendations.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {phase.recommendations[0]}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={phase.completed ? "secondary" : "destructive"}>
                      {phase.completed ? 'Complete' : 'Issues'}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Critical Issues */}
              {report.criticalIssues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Critical Issues Found:</strong>
                    <ul className="mt-2 space-y-1">
                      {report.criticalIssues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Next Steps */}
              <div className="space-y-2">
                <h4 className="font-medium">Next Steps</h4>
                <div className="space-y-2">
                  {report.nextSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 rounded bg-muted/50"
                    >
                      <div className="text-sm">{step}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Message */}
              {report.overallStatus === 'complete' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>🎉 Implementation Successfully Completed!</strong>
                    <div className="mt-2 space-y-1">
                      <div>✅ Database is stable and accessible</div>
                      <div>✅ Batch job system is fully operational</div>
                      <div>✅ File downloads are working correctly</div>
                      <div>✅ All core components are functional</div>
                      <div>✅ Background services are running</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Test Single Classification
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload New File
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  View Batch Jobs
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Results
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImplementationSummary;