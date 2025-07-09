import { useState, useEffect, useCallback } from 'react';
import { connectionManager } from '@/lib/network/connectionManager';

interface NetworkState {
  isOnline: boolean;
  isConnected: boolean;
  isHealthy: boolean;
  consecutiveFailures: number;
}

export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    isConnected: true,
    isHealthy: true,
    consecutiveFailures: 0
  });

  const checkNetworkHealth = useCallback(async () => {
    try {
      const isConnected = await connectionManager.checkConnection();
      const status = connectionManager.getStatus();
      const isHealthy = connectionManager.isHealthy();

      setNetworkState({
        isOnline: navigator.onLine,
        isConnected,
        isHealthy,
        consecutiveFailures: status.consecutiveFailures
      });
    } catch (error) {
      console.warn('[NETWORK STATUS] Health check failed:', error);
      setNetworkState(prev => ({
        ...prev,
        isConnected: false,
        isHealthy: false
      }));
    }
  }, []);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: true }));
      checkNetworkHealth();
    };

    const handleOffline = () => {
      setNetworkState(prev => ({ 
        ...prev, 
        isOnline: false, 
        isConnected: false, 
        isHealthy: false 
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkNetworkHealth();

    // Periodic health check (every 30 seconds)
    const healthCheckInterval = setInterval(checkNetworkHealth, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheckInterval);
    };
  }, [checkNetworkHealth]);

  return {
    ...networkState,
    checkHealth: checkNetworkHealth
  };
};