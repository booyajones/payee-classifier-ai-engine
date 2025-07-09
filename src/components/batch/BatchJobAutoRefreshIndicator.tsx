import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoRefreshIndicatorProps {
  isPolling: boolean;
  isHealthy: boolean;
  lastPoll?: number;
  pollCount?: number;
  className?: string;
}

export const BatchJobAutoRefreshIndicator: React.FC<AutoRefreshIndicatorProps> = ({
  isPolling,
  isHealthy,
  lastPoll,
  pollCount = 0,
  className
}) => {
  const getStatusIcon = () => {
    if (!isHealthy) return <WifiOff className="h-3 w-3" />;
    if (isPolling) return <RefreshCw className="h-3 w-3 animate-spin" />;
    return <Wifi className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (!isHealthy) return 'Connection issue';
    if (isPolling) return 'Checking progress...';
    
    if (lastPoll) {
      const timeSince = Math.round((Date.now() - lastPoll) / 1000);
      if (timeSince < 30) return `Just updated`;
      if (timeSince < 60) return `Updated ${timeSince}s ago`;
      return `Updated ${Math.round(timeSince / 60)}m ago`;
    }
    
    return 'Auto-refresh enabled';
  };

  const getVariant = () => {
    if (!isHealthy) return 'destructive';
    if (isPolling) return 'default';
    return 'secondary';
  };

  return (
    <Badge 
      variant={getVariant()}
      className={cn(
        "flex items-center gap-1 text-xs px-2 py-1",
        !isHealthy && "bg-red-100 text-red-700 border-red-200",
        isPolling && "bg-blue-100 text-blue-700 border-blue-200",
        className
      )}
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {pollCount > 0 && (
        <span className="text-xs opacity-60">({pollCount})</span>
      )}
    </Badge>
  );
};