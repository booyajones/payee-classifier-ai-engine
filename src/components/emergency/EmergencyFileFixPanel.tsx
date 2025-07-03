import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, RefreshCw, Play, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmergencyFileGenerationService } from '@/lib/services/emergencyFileGenerationService';
import { ForceFileGenerationService } from '@/lib/services/forceFileGenerationService';
import { productionLogger } from '@/lib/logging/productionLogger';

const EmergencyFileFixPanel = () => {
  const { toast } = useToast();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isForceProcessing, setIsForceProcessing] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const fetchEmergencyStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const status = await EmergencyFileGenerationService.getEmergencyStatus();
      setEmergencyStatus(status);
      productionLogger.debug('Emergency status fetched', status, 'EMERGENCY_UI');
    } catch (error) {
      productionLogger.error('Failed to fetch emergency status', error, 'EMERGENCY_UI');
      toast({
        title: "Status Check Failed",
        description: "Failed to get system status",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchEmergencyStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchEmergencyStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEmergencyRestart = async () => {
    setIsRestarting(true);
    try {
      const result = await EmergencyFileGenerationService.emergencyRestart();
      
      if (result.success) {
        toast({
          title: "Emergency Restart Successful",
          description: result.message,
        });
        await fetchEmergencyStatus(); // Refresh status
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      productionLogger.error('Emergency restart failed', error, 'EMERGENCY_UI');
      toast({
        title: "Emergency Restart Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsRestarting(false);
    }
  };

  const handleForceProcess = async () => {
    setIsForceProcessing(true);
    try {
      const result = await ForceFileGenerationService.forceProcessAllPending();
      
      if (result.success) {
        toast({
          title: "Force Processing Complete",
          description: result.message,
        });
        await fetchEmergencyStatus(); // Refresh status
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      productionLogger.error('Force processing failed', error, 'EMERGENCY_UI');
      toast({
        title: "Force Processing Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsForceProcessing(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <RefreshCw className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          Emergency File Generation Control Panel
        </CardTitle>
        <CardDescription className="text-red-700">
          System appears stalled. Use these emergency controls to restart file generation.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        {emergencyStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/60 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {emergencyStatus.queueStatus.pending}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {emergencyStatus.queueStatus.processing}
              </div>
              <div className="text-xs text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {emergencyStatus.stalledItems}
              </div>
              <div className="text-xs text-muted-foreground">Stalled</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {emergencyStatus.missedJobs}
              </div>
              <div className="text-xs text-muted-foreground">Missed Jobs</div>
            </div>
          </div>
        )}

        {/* System Health */}
        {emergencyStatus?.systemHealth && (
          <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
            <div className="flex items-center gap-2">
              <span className={getHealthColor(emergencyStatus.systemHealth.overall)}>
                {getHealthIcon(emergencyStatus.systemHealth.overall)}
              </span>
              <span className="font-medium">System Health</span>
            </div>
            <Badge variant={emergencyStatus.systemHealth.overall === 'healthy' ? 'default' : 'destructive'}>
              {emergencyStatus.systemHealth.overall.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Emergency Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleEmergencyRestart}
            disabled={isRestarting}
            variant="destructive"
            className="w-full"
          >
            {isRestarting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Restarting System...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Emergency Restart
              </>
            )}
          </Button>

          <Button
            onClick={handleForceProcess}
            disabled={isForceProcessing}
            variant="outline"
            className="w-full border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            {isForceProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Force Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Force Process Queue
              </>
            )}
          </Button>
        </div>

        {/* Refresh Status */}
        <Button
          onClick={fetchEmergencyStatus}
          disabled={isLoadingStatus}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          {isLoadingStatus ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing Status...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmergencyFileFixPanel;
