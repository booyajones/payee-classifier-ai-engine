
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { KEYWORD_EXCLUSION_CONFIG } from "@/lib/classification/config";

const KeywordManagerHeader = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Keyword Exclusion Management
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ALWAYS ENABLED
          </Badge>
        </CardTitle>
        <CardDescription>
          Keyword exclusions are automatically applied to ALL payee classifications. 
          Payees containing these keywords will be classified as businesses and excluded from AI processing.
          Custom keywords are stored in the cloud and synchronized across all sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="border-green-200 bg-green-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>System Status:</strong> Keyword exclusions are {KEYWORD_EXCLUSION_CONFIG.enabled ? 'ENABLED' : 'DISABLED'} and 
            auto-apply is {KEYWORD_EXCLUSION_CONFIG.autoApply ? 'ON' : 'OFF'}. 
            Custom keywords are stored in the cloud database for persistence.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default KeywordManagerHeader;
