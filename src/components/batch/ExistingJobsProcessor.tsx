import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import { RetroactiveBatchProcessor } from '@/lib/services/retroactiveBatchProcessor';
import { useToast } from '@/hooks/use-toast';

const ExistingJobsProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [results, setResults] = useState<{ processed: number; skipped: number; errors: number } | null>(null);
  const { toast } = useToast();

  const handleProcessExistingJobs = async () => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStage('Starting...');
    setResults(null);

    try {
      setCurrentStage('Processing existing completed batch jobs...');
      setProgress(50);

      const processingResults = await RetroactiveBatchProcessor.processExistingJobs();
      
      setProgress(100);
      setCurrentStage('Complete!');
      setResults(processingResults);

      toast({
        title: "Processing Complete",
        description: `Processed ${processingResults.processed} jobs, skipped ${processingResults.skipped}, ${processingResults.errors} errors`,
      });

    } catch (error) {
      console.error('Failed to process existing jobs:', error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Enable Instant Downloads for Existing Jobs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            This will process your existing completed batch jobs to enable instant downloads.
            Once processed, downloads will be much faster for these jobs.
          </p>
          {results && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
                <Zap className="h-4 w-4" />
                Processing Results
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium">Processed:</span> {results.processed}
                </div>
                <div>
                  <span className="font-medium">Skipped:</span> {results.skipped}
                </div>
                <div>
                  <span className="font-medium">Errors:</span> {results.errors}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{currentStage}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <Button 
          onClick={handleProcessExistingJobs} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Process Existing Jobs
            </>
          )}
        </Button>
        
        {!isProcessing && !results && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-medium">One-time setup recommended</p>
              <p>Run this once to enable instant downloads for your existing completed jobs.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExistingJobsProcessor;