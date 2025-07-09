import React from 'react';
import { useOptimizedMemoryMonitor } from '@/hooks/useOptimizedMemoryMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface MemoryMonitorProps {
  threshold?: number;
  onOptimize?: () => void;
}

export const MemoryMonitor: React.FC<MemoryMonitorProps> = ({ 
  threshold = 80,
  onOptimize
}) => {
  const { memoryStats, isOptimizing, optimizeMemory } = useOptimizedMemoryMonitor({ 
    threshold 
  });

  const handleOptimize = React.useCallback(() => {
    optimizeMemory();
    onOptimize?.();
  }, [optimizeMemory, onOptimize]);

  if (!memoryStats) {
    return null;
  }

  const isHighUsage = memoryStats.usagePercentage >= threshold;

  return (
    <Card className={isHighUsage ? 'border-destructive' : ''}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {(memoryStats.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB used
            </span>
            <span className={`text-sm font-medium ${isHighUsage ? 'text-destructive' : ''}`}>
              {memoryStats.usagePercentage}%
            </span>
          </div>
          
          <Progress 
            value={Math.min(memoryStats.usagePercentage, 100)} 
            className={isHighUsage ? 'text-destructive' : ''}
          />
          
          {isHighUsage && (
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Memory'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};