import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Clock, HardDrive, AlertTriangle } from 'lucide-react';
import { useOptimizedMemoryMonitor } from '@/hooks/useOptimizedMemoryMonitor';
import { usePerformanceStabilizer } from '@/hooks/usePerformanceStabilizer';
import { memoryLeakPreventer } from '@/lib/performance/memoryLeakPrevention';
import { useRenderOptimization } from '@/hooks/useRenderOptimization';

const PerformanceMonitoringPanel = React.memo(() => {
  const [operationStats, setOperationStats] = useState({ total: 0, byType: {} });
  const [renderMetrics, setRenderMetrics] = useState({ renderCount: 0, averageRenderTime: 0, slowRenders: 0 });
  
  const { optimizeMemory, memoryStats } = useOptimizedMemoryMonitor({ threshold: 80 });
  const { emergencyCleanup, isStable, metrics: stabilizerMetrics } = usePerformanceStabilizer();
  const { getMetrics } = useRenderOptimization('PerformanceMonitoringPanel');

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setOperationStats(memoryLeakPreventer.getStats());
      setRenderMetrics(getMetrics());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, [getMetrics]);

  const memoryUsage = memoryStats.usagePercentage;
  const isUnstable = !isStable || memoryUsage > 85 || operationStats.total > 50;

  const handleEmergencyOptimization = () => {
    emergencyCleanup();
    optimizeMemory();
    memoryLeakPreventer.forceCleanupAll();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Monitoring
          {isUnstable && (
            <Badge variant="destructive" className="ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unstable
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Real-time application performance metrics and optimization controls
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Memory Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">{memoryUsage}%</span>
          </div>
          <Progress 
            value={memoryUsage} 
            className={`h-2 ${memoryUsage > 85 ? 'bg-red-100' : memoryUsage > 70 ? 'bg-yellow-100' : 'bg-green-100'}`}
          />
        </div>

        {/* Active Operations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Active Operations</span>
            </div>
            <span className="text-sm text-muted-foreground">{operationStats.total}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(operationStats.byType).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type}: {String(count)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Render Performance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Render Performance</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Renders</div>
              <div className="font-medium">{renderMetrics.renderCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Time</div>
              <div className="font-medium">{renderMetrics.averageRenderTime.toFixed(1)}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">Slow Renders</div>
              <div className={`font-medium ${renderMetrics.slowRenders > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {renderMetrics.slowRenders}
              </div>
            </div>
          </div>
        </div>

        {/* System Stability */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">System Stability</span>
            <Badge variant={isStable ? "default" : "destructive"}>
              {isStable ? "Stable" : "Unstable"}
            </Badge>
          </div>
        </div>

        {/* Optimization Controls */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={optimizeMemory}
            className="flex-1"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Optimize Memory
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => memoryLeakPreventer.forceCleanupAll()}
            className="flex-1"
          >
            <Zap className="h-4 w-4 mr-2" />
            Cleanup Operations
          </Button>
          {isUnstable && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleEmergencyOptimization}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency Fix
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

PerformanceMonitoringPanel.displayName = 'PerformanceMonitoringPanel';

export default PerformanceMonitoringPanel;