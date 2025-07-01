import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bug, Download, Trash2, Eye, EyeOff, Filter } from 'lucide-react';
import { logger, LogEntry } from '@/lib/logging';
import { useBatchJobStore } from '@/stores/batchJobStore';
import { useProgressStore } from '@/stores/progressStore';

const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  const { jobs, payeeDataMap } = useBatchJobStore();
  const { progressMap, downloads } = useProgressStore();

  useEffect(() => {
    // Only show in development mode
    if (!import.meta.env.DEV) return;

    // Update logs periodically
    const updateLogs = () => {
      const allLogs = logger.getLogs();
      setLogs(allLogs.slice(-100)); // Keep last 100 logs
    };

    updateLogs();
    const interval = setInterval(updateLogs, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Keyboard shortcut: Ctrl+Shift+D
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Don't render in production
  if (!import.meta.env.DEV) return null;

  const filteredLogs = selectedLogLevel === 'all' 
    ? logs 
    : logs.filter(log => log.level === selectedLogLevel);

  const exportLogs = () => {
    const logData = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      case 'debug': return 'text-gray-500';
      default: return 'text-foreground';
    }
  };

  const getLogLevelBadge = (level: string) => {
    const colors = {
      error: 'destructive',
      warn: 'secondary',
      info: 'default',
      debug: 'outline'
    } as const;
    
    return colors[level as keyof typeof colors] || 'outline';
  };

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-[500px] h-[600px] z-50">
      <Card className="h-full bg-background/95 backdrop-blur-sm border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Debug Panel</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={exportLogs}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Export logs"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                onClick={clearLogs}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Clear logs"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
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
            Press Ctrl+Shift+D to toggle
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 h-[calc(100%-80px)]">
          <Tabs defaultValue="logs" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              <TabsTrigger value="state" className="text-xs">State</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">Perf</TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="flex-1 mt-3">
              <div className="space-y-2 h-full flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    <select
                      value={selectedLogLevel}
                      onChange={(e) => setSelectedLogLevel(e.target.value)}
                      className="text-xs bg-background border rounded px-2 py-1"
                    >
                      <option value="all">All Levels</option>
                      <option value="error">Errors</option>
                      <option value="warn">Warnings</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => setAutoScroll(!autoScroll)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    {autoScroll ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    Auto
                  </Button>
                </div>

                <ScrollArea className="flex-1 border rounded">
                  <div className="p-2 space-y-1">
                    {filteredLogs.map((log, index) => (
                      <div key={index} className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getLogLevelBadge(log.level)}
                            className="text-xs px-1 py-0"
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          {log.context && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {log.context}
                            </Badge>
                          )}
                        </div>
                        <div className={getLogLevelColor(log.level)}>
                          {log.message}
                        </div>
                        {log.data && (
                          <div className="text-muted-foreground font-mono bg-muted p-1 rounded text-xs">
                            {JSON.stringify(log.data, null, 1)}
                          </div>
                        )}
                        <Separator className="my-1" />
                      </div>
                    ))}
                    {filteredLogs.length === 0 && (
                      <div className="text-muted-foreground text-center py-4">
                        No logs found for selected level
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="state" className="flex-1 mt-3">
              <ScrollArea className="h-full">
                <div className="space-y-3 text-xs">
                  <div>
                    <h4 className="font-medium mb-2">Batch Jobs ({jobs.length})</h4>
                    <div className="bg-muted p-2 rounded font-mono text-xs max-h-32 overflow-y-auto">
                      {jobs.length > 0 ? (
                        jobs.map((job, i) => (
                          <div key={i} className="mb-1">
                            {job.id.slice(0, 8)}... - {job.status}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No batch jobs</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Progress Items ({Object.keys(progressMap).length})</h4>
                    <div className="bg-muted p-2 rounded font-mono text-xs max-h-32 overflow-y-auto">
                      {Object.keys(progressMap).length > 0 ? (
                        Object.entries(progressMap).map(([id, item], i) => (
                          <div key={i} className="mb-1">
                            {id}: {item.percentage}% - {item.stage}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No progress items</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Downloads ({Object.keys(downloads).length})</h4>
                    <div className="bg-muted p-2 rounded font-mono text-xs max-h-32 overflow-y-auto">
                      {Object.keys(downloads).length > 0 ? (
                        Object.entries(downloads).map(([id, download], i) => (
                          <div key={i} className="mb-1">
                            {download.filename}: {download.progress}% - {download.stage}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No downloads</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Payee Data Map</h4>
                    <div className="bg-muted p-2 rounded font-mono text-xs max-h-32 overflow-y-auto">
                      {Object.keys(payeeDataMap).length > 0 ? (
                        Object.entries(payeeDataMap).map(([id, data], i) => (
                          <div key={i} className="mb-1">
                            {id.slice(0, 8)}...: {data.uniquePayeeNames.length} payees
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground">No payee data</div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="performance" className="flex-1 mt-3">
              <ScrollArea className="h-full">
                <div className="space-y-3 text-xs">
                  <div>
                    <h4 className="font-medium mb-2">Memory Usage</h4>
                    <div className="bg-muted p-2 rounded">
                      {(performance as any).memory ? (
                        <div className="space-y-1">
                          <div>Used: {Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB</div>
                          <div>Total: {Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)}MB</div>
                          <div>Limit: {Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)}MB</div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Memory info not available</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Navigation Timing</h4>
                    <div className="bg-muted p-2 rounded space-y-1">
                      <div>DOM Load: {performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart}ms</div>
                      <div>Page Load: {performance.timing.loadEventEnd - performance.timing.navigationStart}ms</div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;