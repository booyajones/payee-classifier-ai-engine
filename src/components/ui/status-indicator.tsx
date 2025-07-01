import { CheckCircle, XCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = "idle" | "loading" | "success" | "error" | "warning" | "pending";

interface StatusIndicatorProps {
  status: StatusType;
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const StatusIndicator = ({ status, message, className, size = "md" }: StatusIndicatorProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const getStatusConfig = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />,
          textColor: "text-primary"
        };
      case "success":
        return {
          icon: <CheckCircle className={cn("text-green-600", sizeClasses[size])} />,
          textColor: "text-green-600"
        };
      case "error":
        return {
          icon: <XCircle className={cn("text-red-600", sizeClasses[size])} />,
          textColor: "text-red-600"
        };
      case "warning":
        return {
          icon: <AlertCircle className={cn("text-yellow-600", sizeClasses[size])} />,
          textColor: "text-yellow-600"
        };
      case "pending":
        return {
          icon: <Clock className={cn("text-muted-foreground", sizeClasses[size])} />,
          textColor: "text-muted-foreground"
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {config.icon}
      {message && <span className={cn("text-sm", config.textColor)}>{message}</span>}
    </div>
  );
};

export default StatusIndicator;