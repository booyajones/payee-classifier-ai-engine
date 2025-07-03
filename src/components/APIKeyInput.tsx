
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSavedOpenAIKey } from "@/lib/openai/client";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle } from "lucide-react";

interface APIKeyInputProps {
  onApiKeySet: () => void;
}

const APIKeyInput = ({ onApiKeySet }: APIKeyInputProps) => {
  const [keyIsSaved, setKeyIsSaved] = useState(true);
  const { toast } = useToast();

  // Check if API key is already set on component mount
  useEffect(() => {
    // The key is always available in the background
    setKeyIsSaved(true);
    onApiKeySet();
    
    // Inform the user that the API key is pre-configured
    toast({
      title: "API Key Pre-Configured",
      description: "OpenAI API key is already configured in the background. No additional setup needed.",
      variant: "default",
    });
  }, [onApiKeySet, toast]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">API Key Status</CardTitle>
        <CardDescription>
          OpenAI API key is pre-configured in the background.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">API key is pre-configured and active</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            No action required. Your app is ready to use the OpenAI API.
          </p>
          
          <Button 
            type="button" 
            className="w-full" 
            onClick={() => onApiKeySet()}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default APIKeyInput;
