
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck, AlertTriangle } from 'lucide-react';

interface SmartFileUploadHeaderProps {
  hasGlobalError: boolean;
}

const SmartFileUploadHeader = ({ hasGlobalError }: SmartFileUploadHeaderProps) => {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileCheck className="h-5 w-5" />
        Smart File Upload & Classification
        <Badge variant="outline" className="ml-auto">
          Enhanced Performance
        </Badge>
        {hasGlobalError && (
          <AlertTriangle className="h-4 w-4 text-destructive ml-2" />
        )}
      </CardTitle>
      <CardDescription>
        Upload your payee file and select the column containing payee names. 
        Enhanced with instant OpenAI batch creation, intelligent background data optimization, and streaming processing for files up to 500MB.
      </CardDescription>
    </CardHeader>
  );
};

export default SmartFileUploadHeader;
