import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Activity, Clock, Database, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { logger, performanceLogger } from '@/lib/logging';

interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
  };
  network: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  vitals: {
    cls: number;
    fid: number;
    lcp: number;
  };
}

interface ClassificationStats {
  totalClassifications: number;
  averageTime: number;
  successRate: number;
  errorCount: number;
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [classificationStats, setClassificationStats] = useState<ClassificationStats>({
    totalClassifications: 0,
    averageTime: 0,
    successRate: 100,
    errorCount: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (!import.meta.env.DEV) return;

    const updateMetrics = () => {
      const performance = window.performance;
      const memory = (performance as any).memory;
      const connection = (navigator as any).connection;

      const timing = performance.timing;
      const vitals = {
        cls: 0, // Cumulative Layout Shift
        fid: 0, // First Input Delay
        lcp: 0  // Largest Contentful Paint
      };

      setMetrics({
        memory: memory ? {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        } : { used: 0, total: 0, limit: 0 },
        timing: {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          firstPaint: 0,
          firstContentfulPaint: 0
        },
        network: connection ? {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0
        } : { effectiveType: 'unknown', downlink: 0, rtt: 0 },
        vitals
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for classification events to update stats
    const handleClassificationComplete = (event: CustomEvent) => {
      setClassificationStats(prev => ({
        totalClassifications: prev.totalClassifications + 1,
        averageTime: (prev.averageTime + event.detail.duration) / 2,
        successRate: event.detail.success ? 
          ((prev.successRate * prev.totalClassifications + 100) / (prev.totalClassifications + 1)) :
          ((prev.successRate * prev.totalClassifications) / (prev.totalClassifications + 1)),
        errorCount: event.detail.success ? prev.errorCount : prev.errorCount + 1
      }));
    };

    window.addEventListener('classificationComplete', handleClassificationComplete as EventListener);
    return () => window.removeEventListener('classificationComplete', handleClassificationComplete as EventListener);
  }, []);

  const getMemoryUsageColor = (percentage: number) => {
    if (percentage > 80) return 'text-red-500';
    if (percentage > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getPerformanceGrade = () => {
    if (!metrics) return 'N/A';
    
    const { timing, memory } = metrics;
    const memoryUsage = (memory.used / memory.limit) * 100;
    const loadTime = timing.loadComplete;
    
    if (memoryUsage > 80 || loadTime > 3000) return 'Poor';
    if (memoryUsage > 60 || loadTime > 2000) return 'Fair';
    if (memoryUsage > 40 || loadTime > 1000) return 'Good';
    return 'Excellent';
  };

  // Don't render in production
  if (!import.meta.env.DEV) return null;

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Perf
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <Card className="bg-background/95 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Performance Monitor</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {getPerformanceGrade()}
              </Badge>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Press Ctrl+Shift+P to toggle
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="system" className="text-xs">System</TabsTrigger>
              <TabsTrigger value="network" className="text-xs">Network</TabsTrigger>
              <TabsTrigger value="classification" className="text-xs">AI</TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="mt-3 space-y-3">
              {metrics && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Memory Usage
                      </span>
                      <span className={getMemoryUsageColor((metrics.memory.used / metrics.memory.limit) * 100)}>
                        {metrics.memory.used}MB / {metrics.memory.limit}MB
                      </span>
                    </div>
                    <Progress 
                      value={(metrics.memory.used / metrics.memory.limit) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>DOM: {metrics.timing.domContentLoaded}ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Load: {metrics.timing.loadComplete}ms</span>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="network" className="mt-3 space-y-3">
              {metrics && (
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <Badge variant="secondary" className="text-xs">
                      {metrics.network.effectiveType}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Downlink:</span>
                    <span>{metrics.network.downlink} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RTT:</span>
                    <span>{metrics.network.rtt}ms</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="classification" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{classificationStats.totalClassifications}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Avg Time</span>
                  <span className="font-medium">{classificationStats.averageTime.toFixed(0)}ms</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="font-medium text-green-600">
                    {classificationStats.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Errors</span>
                  <span className="font-medium text-red-600 flex items-center gap-1">
                    {classificationStats.errorCount > 0 && <AlertTriangle className="h-3 w-3" />}
                    {classificationStats.errorCount}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-3 pt-3 border-t">
            <Button
              onClick={() => performanceLogger.logMemoryUsage('MANUAL_CHECK')}
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Log Memory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;