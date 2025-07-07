import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  MemoryStick, 
  Clock, 
  Zap, 
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { cn } from '@/lib/utils';

interface PerformanceMonitorProps {
  className?: string;
  compact?: boolean;
}

const PerformanceMonitor = ({ className, compact = false }: PerformanceMonitorProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const { 
    metrics, 
    getPerformanceWarnings,
    cleanupMemory 
  } = usePerformanceOptimization();

  const warnings = getPerformanceWarnings();
  
  const getMemoryStatus = () => {
    if (metrics.memoryUsage > 80) return { color: 'destructive', level: 'High' };
    if (metrics.memoryUsage > 60) return { color: 'warning', level: 'Medium' };
    return { color: 'success', level: 'Low' };
  };

  const getRenderStatus = () => {
    if (metrics.avgRenderTime > 16) return { color: 'destructive', level: 'Slow' };
    if (metrics.avgRenderTime > 8) return { color: 'warning', level: 'Medium' };
    return { color: 'success', level: 'Fast' };
  };

  const memoryStatus = getMemoryStatus();
  const renderStatus = getRenderStatus();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {warnings.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {warnings.length} issues
          </Badge>
        )}
        
        <Badge variant="outline" className="flex items-center gap-1">
          <MemoryStick className="h-3 w-3" />
          {metrics.memoryUsage}%
        </Badge>
        
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {metrics.avgRenderTime.toFixed(1)}ms
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="h-6 px-2"
        >
          <Activity className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {warnings.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {warnings.length}
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupMemory}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Cleanup
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance warnings */}
        {warnings.length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Performance Issues</span>
            </div>
            <ul className="text-sm space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-destructive">• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <MemoryStick className="h-4 w-4" />
                Memory Usage
              </span>
              <Badge 
                variant={memoryStatus.color as any}
                className="text-xs"
              >
                {memoryStatus.level}
              </Badge>
            </div>
            <Progress value={metrics.memoryUsage} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.memoryUsage}% of available memory
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Render Performance
              </span>
              <Badge 
                variant={renderStatus.color as any}
                className="text-xs"
              >
                {renderStatus.level}
              </Badge>
            </div>
            <div className="text-lg font-bold">
              {metrics.avgRenderTime.toFixed(1)}ms
            </div>
            <div className="text-xs text-muted-foreground">
              Average render time (target: &lt;16ms)
            </div>
          </div>
        </div>

        {/* Detailed metrics */}
        {showDetails && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Last Render</div>
                <div className="text-muted-foreground">
                  {metrics.renderTime.toFixed(1)}ms
                </div>
              </div>
              
              <div>
                <div className="font-medium">Total Updates</div>
                <div className="text-muted-foreground">
                  {metrics.totalUpdates.toLocaleString()}
                </div>
              </div>
              
              <div className="col-span-2">
                <div className="font-medium">Last Update</div>
                <div className="text-muted-foreground text-xs">
                  {metrics.lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
              <Info className="h-3 w-3" />
              Performance data is collected automatically and helps optimize the application
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;