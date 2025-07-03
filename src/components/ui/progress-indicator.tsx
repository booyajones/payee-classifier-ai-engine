import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import StatusIndicator from "./status-indicator";

interface ProgressIndicatorProps {
  progress: number;
  status?: "idle" | "loading" | "success" | "error" | "warning" | "pending";
  message?: string;
  showPercentage?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const ProgressIndicator = ({ 
  progress, 
  status = "loading", 
  message, 
  showPercentage = true,
  className,
  size = "md"
}: ProgressIndicatorProps) => {
  const progressHeight = {
    sm: "h-2",
    md: "h-3", 
    lg: "h-4"
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <StatusIndicator status={status} message={message} size={size} />
        {showPercentage && (
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <Progress 
        value={progress} 
        className={cn("w-full", progressHeight[size])}
      />
    </div>
  );
};

export default ProgressIndicator;
