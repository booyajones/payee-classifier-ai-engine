import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';
import { useErrorHandler } from '@/lib/errors/standardErrorHandler';
import { MemoryMonitor } from '@/hooks/useMemoryOptimization';
import PerformanceMonitor from '@/components/performance/PerformanceMonitor';
import { requestCache } from '@/lib/caching/requestCache';

interface QualityMetrics {
  errorRate: number;
  performanceScore: number;
  cacheHitRate: number;
  memoryUsage: number;
  responseTime: number;
}

const CodeQualityDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { getErrorLog, getErrorStats, clearErrorLog } = useErrorHandler();
  
  // Mock quality metrics - in real app, these would come from monitoring
  const [metrics] = useState<QualityMetrics>({
    errorRate: 2.1,
    performanceScore: 92,
    cacheHitRate: 78,
    memoryUsage: 45,
    responseTime: 180
  });

  const errorLog = getErrorLog();
  const errorStats = getErrorStats();
  const cacheStats = requestCache.getStats();

  const getQualityScore = () => {
    const weights = {
      errorRate: 0.3,
      performance: 0.25,
      cacheHit: 0.2,
      memory: 0.15,
      responseTime: 0.1
    };

    const scores = {
      errorRate: Math.max(0, 100 - metrics.errorRate * 10),
      performance: metrics.performanceScore,
      cacheHit: metrics.cacheHitRate,
      memory: Math.max(0, 100 - metrics.memoryUsage),
      responseTime: Math.max(0, 100 - (metrics.responseTime / 10))
    };

    return Math.round(
      scores.errorRate * weights.errorRate +
      scores.performance * weights.performance +
      scores.cacheHit * weights.cacheHit +
      scores.memory * weights.memory +
      scores.responseTime * weights.responseTime
    );
  };

  const qualityScore = getQualityScore();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: 'default' as const, label: 'Excellent' };
    if (score >= 70) return { variant: 'secondary' as const, label: 'Good' };
    return { variant: 'destructive' as const, label: 'Needs Work' };
  };

  const scoreBadge = getScoreBadge(qualityScore);

  return (
    <div className="space-y-6">
      {/* Quality Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Code Quality Dashboard
            </CardTitle>
            <Badge variant={scoreBadge.variant} className="text-sm">
              {scoreBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(qualityScore)}`}>
                {qualityScore}
              </div>
              <div className="text-sm text-muted-foreground">Quality Score</div>
            </div>
            <div className="flex-1">
              <Progress value={qualityScore} className="h-3" />
              <div className="text-xs text-muted-foreground mt-1">
                Based on error rate, performance, caching, and memory usage
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{metrics.errorRate}%</div>
                    <div className="text-xs text-muted-foreground">Error Rate</div>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{metrics.performanceScore}</div>
                    <div className="text-xs text-muted-foreground">Performance</div>
                  </div>
                  <Zap className="h-4 w-4 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{metrics.cacheHitRate}%</div>
                    <div className="text-xs text-muted-foreground">Cache Hit</div>
                  </div>
                  <Database className="h-4 w-4 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{metrics.responseTime}ms</div>
                    <div className="text-xs text-muted-foreground">Response Time</div>
                  </div>
                  <Clock className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MemoryMonitor threshold={70} />
            <PerformanceMonitor compact />
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Error Log ({errorLog.length})
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearErrorLog}
                  disabled={errorLog.length === 0}
                >
                  Clear Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {errorLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  No errors logged recently
                </div>
              ) : (
                <div className="space-y-3">
                  {errorLog.slice(0, 10).map((error, index) => (
                    <div 
                      key={index}
                      className="p-3 border rounded-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge 
                          variant={error.severity === 'high' || error.severity === 'critical' ? 'destructive' : 'secondary'}
                        >
                          {error.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {error.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm font-medium">{error.code}</div>
                      <div className="text-xs text-muted-foreground">{error.userMessage}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2">By Severity</div>
                  {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between">
                      <span className="capitalize">{severity}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">By Type</div>
                  {Object.entries(errorStats.byCode).slice(0, 5).map(([code, count]) => (
                    <div key={code} className="flex justify-between">
                      <span className="text-xs">{code}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMonitor />
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{cacheStats.size}</div>
                  <div className="text-xs text-muted-foreground">Cached Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{cacheStats.maxSize}</div>
                  <div className="text-xs text-muted-foreground">Max Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{metrics.cacheHitRate}%</div>
                  <div className="text-xs text-muted-foreground">Hit Rate</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Cache Usage</span>
                  <span className="text-xs text-muted-foreground">
                    {cacheStats.size}/{cacheStats.maxSize}
                  </span>
                </div>
                <Progress value={(cacheStats.size / cacheStats.maxSize) * 100} />
              </div>

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => requestCache.clear()}
                >
                  Clear Cache
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Refresh App
                </Button>
              </div>
            </CardContent>
          </Card>

          {cacheStats.entries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cache Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {cacheStats.entries.slice(0, 20).map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm border-b pb-1">
                      <span className="truncate font-mono text-xs">{entry.key}</span>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{Math.round(entry.age / 1000)}s</span>
                        <span>TTL: {Math.round(entry.ttl / 1000)}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CodeQualityDashboard;