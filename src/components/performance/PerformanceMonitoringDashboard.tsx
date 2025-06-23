
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  MemoryStick, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useMemoryMonitor } from '@/lib/performance/memoryOptimization';

interface PerformanceMonitoringDashboardProps {
  isVisible?: boolean;
  compact?: boolean;
}

const PerformanceMonitoringDashboard = ({ 
  isVisible = true, 
  compact = false 
}: PerformanceMonitoringDashboardProps) => {
  const { 
    metrics, 
    getPerformanceStats, 
    clearMetrics, 
    exportMetrics,
    isMonitoring,
    setIsMonitoring
  } = usePerformanceMonitoring(true);
  
  const memoryStats = useMemoryMonitor(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const stats = getPerformanceStats();

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const getPerformanceColor = (score: string) => {
    switch (score) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getMemoryPressureColor = (pressure: string) => {
    switch (pressure) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span className={getPerformanceColor(stats.performanceScore)}>
            {stats.performanceScore}
          </span>
        </Badge>
        
        {memoryStats && (
          <Badge variant="outline" className={getMemoryPressureColor(memoryStats.memoryPressure)}>
            <MemoryStick className="h-3 w-3 mr-1" />
            {memoryStats.memoryPressure}
          </Badge>
        )}
        
        {stats.currentOperations.length > 0 && (
          <Badge variant="outline" className="animate-pulse">
            {stats.currentOperations.length} active
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? 'Pause' : 'Resume'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(prev => prev + 1)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Performance Score */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance Score</span>
              <Badge variant="outline" className={getPerformanceColor(stats.performanceScore)}>
                {stats.performanceScore}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Avg Duration: {stats.averageDuration.toFixed(0)}ms
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Operations</span>
              <Badge variant="outline">
                {stats.currentOperations.length}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Completed: {stats.completedOperations.length}
            </div>
          </div>
        </div>

        {/* Memory Statistics */}
        {memoryStats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory Usage</span>
              <Badge className={getMemoryPressureColor(memoryStats.memoryPressure)}>
                {memoryStats.memoryPressure} pressure
              </Badge>
            </div>
            <Progress 
              value={(memoryStats.usedJSHeapSize / memoryStats.jsHeapSizeLimit) * 100} 
              className="h-2"
            />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Used: {(memoryStats.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
              <div>Available: {((memoryStats.jsHeapSizeLimit - memoryStats.usedJSHeapSize) / 1024 / 1024).toFixed(1)}MB</div>
            </div>
          </div>
        )}

        {/* Current Operations */}
        {stats.currentOperations.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Current Operations</span>
            <div className="space-y-1">
              {stats.currentOperations.slice(0, 3).map((op, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="truncate">{op.operationName}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{((Date.now() - op.startTime) / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              ))}
              {stats.currentOperations.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{stats.currentOperations.length - 3} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {memoryStats?.memoryPressure === 'high' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              High memory usage detected. Consider closing other browser tabs or reducing file sizes.
            </AlertDescription>
          </Alert>
        )}

        {stats.averageDuration > 5000 && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              Operations are taking longer than usual. This may indicate performance issues.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearMetrics}>
            Clear Metrics
          </Button>
          <Button variant="outline" size="sm" onClick={exportMetrics}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitoringDashboard;
