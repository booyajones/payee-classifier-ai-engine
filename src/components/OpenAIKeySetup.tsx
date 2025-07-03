
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initializeOpenAI, isOpenAIInitialized } from "@/lib/openai/client";

interface OpenAIKeySetupProps {
  onKeySet: () => void;
}

const OpenAIKeySetup = ({ onKeySet }: OpenAIKeySetupProps) => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid OpenAI API key.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    
    try {
      // Initialize the OpenAI client with secure storage
      initializeOpenAI(apiKey.trim(), rememberKey);
      
      toast({
        title: "API Key Set Successfully",
        description: rememberKey 
          ? "OpenAI integration is ready and your key has been securely saved." 
          : "OpenAI integration is ready for this session.",
      });
      
      onKeySet();
    } catch (error) {
      console.error("Error setting API key:", error);
      toast({
        title: "API Key Error",
        description: "Failed to initialize OpenAI client. Please check your API key.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Check if already initialized
  if (isOpenAIInitialized()) {
    return null;
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          OpenAI API Key Required
        </CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable AI-powered payee classification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            Your API key will be stored securely using encrypted browser storage. 
            Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a>.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isValidating}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rememberKey"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="rememberKey" className="text-sm">
              Securely save this API key
            </Label>
          </div>
          
          <Button type="submit" className="w-full" disabled={isValidating}>
            {isValidating ? "Setting up..." : "Set API Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default OpenAIKeySetup;
