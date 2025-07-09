import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmergencyResultRecovery } from '@/lib/services/emergencyResultRecovery';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const EmergencyRecoveryPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    processed: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleEmergencyRecovery = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const recoveryResults = await EmergencyResultRecovery.processOrphanedJobs();
      setResults(recoveryResults);
    } catch (error) {
      setResults({
        processed: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Emergency Result Recovery
        </CardTitle>
        <CardDescription>
          Process completed batch jobs that have no classification results in the database.
          This fixes the "No classification results found" download error.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleEmergencyRecovery}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Orphaned Jobs...
            </>
          ) : (
            'Run Emergency Recovery'
          )}
        </Button>

        {results && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Processed: {results.processed}
              </Badge>
              {results.failed > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Failed: {results.failed}
                </Badge>
              )}
            </div>

            {results.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Errors encountered:</div>
                  <ul className="text-sm space-y-1">
                    {results.errors.map((error, index) => (
                      <li key={index} className="text-muted-foreground">• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {results.processed > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully processed {results.processed} batch job{results.processed === 1 ? '' : 's'}. 
                  These jobs should now have downloadable results.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};