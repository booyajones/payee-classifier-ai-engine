import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

export const useNotifications = () => {
  const { toast } = useToast();

  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      action: <CheckCircle className="h-4 w-4 text-green-600" />
    });
  };

  const showError = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "destructive",
      action: <XCircle className="h-4 w-4" />
    });
  };

  const showWarning = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      action: <AlertCircle className="h-4 w-4 text-yellow-600" />
    });
  };

  const showInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "default",
      action: <Info className="h-4 w-4 text-blue-600" />
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default useNotifications;