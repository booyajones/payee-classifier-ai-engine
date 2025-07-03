// @ts-nocheck
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FileGenerationFixer = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFixFiles = async () => {
    setIsFixing(true);
    setFixResult(null);

    try {
      const response = await fetch('/api/admin/fix-missing-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setFixResult(`Successfully triggered file generation fix: ${data.message}`);
        toast({
          title: "File Generation Triggered",
          description: data.message,
        });
      } else {
        setFixResult(`File generation fix failed: ${data.error}`);
        toast({
          title: "File Generation Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("File generation error:", error);
      setFixResult(`An error occurred: ${error.message}`);
      toast({
        title: "File Generation Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Generation Fixer</CardTitle>
        <CardDescription>
          Trigger a process to fix missing CSV and Excel files for batch jobs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleFixFiles}
          disabled={isFixing}
        >
          {isFixing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Fixing Files...
            </>
          ) : (
            <>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Fix Missing Files
            </>
          )}
        </Button>

        {fixResult && (
          <div className="rounded-md border p-4">
            {fixResult.startsWith("Successfully") ? (
              <div className="text-sm font-medium text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                {fixResult}
              </div>
            ) : (
              <div className="text-sm font-medium text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {fixResult}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileGenerationFixer;
