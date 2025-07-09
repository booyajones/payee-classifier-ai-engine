import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useJobSystemValidator } from '@/hooks/useJobSystemValidator';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { AlertTriangle, CheckCircle, RefreshCw, Settings, Trash2 } from 'lucide-react';

export const JobSystemStatus: React.FC = () => {
  const { jobs } = useBatchJobStore();
  const {
    validationState,
    validateJobs,
    performCleanup,
    toggleAutoValidation,
    clearValidationErrors,
    hasPhantomJobs
  } = useJobSystemValidator();

  const handleValidate = async () => {
    const report = await validateJobs();
    if (report && report.phantomJobs.length > 0) {
      // Auto-cleanup if phantom jobs found
      performCleanup();
    }
  };

  const handleForceCleanup = () => {
    performCleanup(true);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="w-4 h-4" />
          Job System Status
          {hasPhantomJobs && (
            <Badge variant="destructive" className="text-xs">
              Phantom Jobs Detected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Total Jobs: {jobs.length}
            </span>
            {validationState.lastCleanup && (
              <Badge variant="outline" className="text-xs">
                Last Cleanup: {validationState.lastCleanup.phantomJobsRemoved.length} removed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={validationState.autoValidationEnabled ? "default" : "secondary"}
              className="text-xs"
            >
              Auto-validation {validationState.autoValidationEnabled ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>

        {/* Validation Errors */}
        {validationState.validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationState.validationErrors.map((error, index) => (
                  <div key={index} className="text-xs">{error}</div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearValidationErrors}
                className="mt-2 h-6 text-xs"
              >
                Clear Errors
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Last Cleanup Report */}
        {validationState.lastCleanup && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-xs space-y-1">
                <div>✅ Phantom jobs removed: {validationState.lastCleanup.phantomJobsRemoved.length}</div>
                <div>✅ Valid jobs kept: {validationState.lastCleanup.validJobsKept.length}</div>
                <div>✅ Missing jobs added: {validationState.lastCleanup.missingJobsAdded.length}</div>
                <div>✅ Payee data cleaned: {validationState.lastCleanup.payeeDataCleaned.length}</div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={validationState.isValidating || validationState.isCleaningUp}
            className="text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${validationState.isValidating ? 'animate-spin' : ''}`} />
            {validationState.isValidating ? 'Validating...' : 'Validate Jobs'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleForceCleanup}
            disabled={validationState.isCleaningUp}
            className="text-xs"
          >
            <Trash2 className={`w-3 h-3 mr-1 ${validationState.isCleaningUp ? 'animate-spin' : ''}`} />
            {validationState.isCleaningUp ? 'Cleaning...' : 'Force Cleanup'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAutoValidation}
            className="text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            Toggle Auto-validation
          </Button>
        </div>

        {/* Status Text */}
        <div className="text-xs text-muted-foreground">
          {validationState.isValidating && "🔍 Validating jobs against database..."}
          {validationState.isCleaningUp && "🧹 Cleaning up phantom jobs..."}
          {!validationState.isValidating && !validationState.isCleaningUp && validationState.autoValidationEnabled && 
            "✅ Auto-validation active - phantom jobs will be automatically detected and removed"}
          {!validationState.autoValidationEnabled && 
            "⚠️ Auto-validation disabled - manual validation recommended"}
        </div>
      </CardContent>
    </Card>
  );
};