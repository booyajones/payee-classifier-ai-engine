import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ManualFileGenerationTrigger } from '@/lib/services/manualFileGenerationTrigger';

const FileGenerationFixer = () => {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const handleFix = async () => {
    setIsFixing(true);
    try {
      await ManualFileGenerationTrigger.fixAllCompletedJobs();
      toast({
        title: "File Generation Fixed",
        description: "All completed jobs have been processed and files generated",
      });
    } catch (error) {
      console.error('Fix failed:', error);
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : 'Failed to fix file generation',
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          File Generation Issue Detected
        </CardTitle>
        <CardDescription className="text-orange-700">
          Completed batch jobs don't have downloadable files. Click to fix this automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleFix} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fixing File Generation...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Fix File Generation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FileGenerationFixer;