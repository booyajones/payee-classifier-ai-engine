import React from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export const NetworkStatusIndicator = () => {
  const { isOnline, isConnected, isHealthy, consecutiveFailures } = useNetworkStatus();

  if (isOnline && isConnected && isHealthy) {
    return null; // Don't show anything when everything is working
  }

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'Offline',
        variant: 'destructive' as const,
        description: 'No internet connection'
      };
    }
    
    if (!isConnected) {
      return {
        icon: WifiOff,
        text: 'Disconnected',
        variant: 'destructive' as const,
        description: 'Database connection failed'
      };
    }
    
    if (!isHealthy) {
      return {
        icon: AlertTriangle,
        text: `Connection Issues (${consecutiveFailures} failures)`,
        variant: 'secondary' as const,
        description: 'Experiencing connectivity problems'
      };
    }

    return {
      icon: Wifi,
      text: 'Connected',
      variant: 'default' as const,
      description: 'Connection restored'
    };
  };

  const { icon: Icon, text, variant, description } = getStatusInfo();

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge 
        variant={variant} 
        className="flex items-center gap-2 px-3 py-2 shadow-lg"
        title={description}
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{text}</span>
      </Badge>
    </div>
  );
};