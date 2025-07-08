import React from 'react';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Pause, 
  Play, 
  RefreshCw, 
  Bell, 
  BellOff, 
  Clock, 
  TrendingUp,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LargeJobManagementPanelProps {
  job: BatchJob;
  onRefresh: () => void;
  onTogglePolling?: () => void;
  onToggleNotifications?: () => void;
  isPolling?: boolean;
  notificationsEnabled?: boolean;
  isRefreshing?: boolean;
}

const LargeJobManagementPanel = ({
  job,
  onRefresh,
  onTogglePolling,
  onToggleNotifications,
  isPolling = true,
  notificationsEnabled = true,
  isRefreshing = false
}: LargeJobManagementPanelProps) => {
  const createdTime = new Date(job.created_at * 1000);
  const ageInMs = Date.now() - createdTime.getTime();
  const ageInHours = ageInMs / (1000 * 60 * 60);
  const isVeryLargeJob = job.request_counts.total > 5000;
  const isLongRunning = ageInHours > 4;
  const progress = job.request_counts.total > 0 ? 
    Math.round((job.request_counts.completed / job.request_counts.total) * 100) : 0;

  const getJobCategory = () => {
    if (isVeryLargeJob && isLongRunning) return 'marathon';
    if (isVeryLargeJob) return 'enterprise';
    if (job.request_counts.total > 1000) return 'large';
    return 'standard';
  };

  const getOptimizationSuggestions = () => {
    const suggestions = [];
    
    if (isLongRunning && isPolling) {
      suggestions.push({
        type: 'efficiency',
        message: 'Consider reducing polling frequency for this long-running job to save resources.',
        action: 'Reduce Polling',
        actionFn: onTogglePolling
      });
    }
    
    if (progress === 0 && ageInHours > 0.5) {
      suggestions.push({
        type: 'attention',
        message: 'Job hasn\'t started processing yet. Manual refresh might help check status.',
        action: 'Refresh Now',
        actionFn: onRefresh
      });
    }
    
    if (isVeryLargeJob && progress < 10) {
      suggestions.push({
        type: 'info',
        message: 'Very large jobs often show minimal progress initially. This is normal.',
        action: null,
        actionFn: null
      });
    }
    
    return suggestions;
  };

  const getJobInsights = () => {
    const insights = [];
    
    if (job.request_counts.completed > 0) {
      const rate = job.request_counts.completed / ageInHours;
      const estimatedTotal = (job.request_counts.total / rate);
      const remaining = estimatedTotal - ageInHours;
      
      insights.push({
        label: 'Processing Rate',
        value: `${rate.toFixed(1)} items/hour`,
        icon: TrendingUp
      });
      
      if (remaining > 0) {
        insights.push({
          label: 'Estimated Completion',
          value: remaining > 24 ? `~${Math.round(remaining/24)}d ${Math.round(remaining%24)}h` : `~${Math.round(remaining)}h`,
          icon: Clock
        });
      }
    }
    
    insights.push({
      label: 'Job Scale',
      value: `${job.request_counts.total.toLocaleString()} items`,
      icon: Info
    });
    
    return insights;
  };

  const categoryConfig = {
    marathon: {
      title: 'Marathon Job Management',
      description: 'Long-running enterprise job requiring special handling',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800'
    },
    enterprise: {
      title: 'Enterprise Job Management',
      description: 'Very large batch requiring extended processing time',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    },
    large: {
      title: 'Large Job Management',
      description: 'Substantial batch job with enhanced monitoring',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800'
    },
    standard: {
      title: 'Job Management',
      description: 'Standard batch processing',
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-800'
    }
  };

  const config = categoryConfig[getJobCategory()];
  const suggestions = getOptimizationSuggestions();
  const insights = getJobInsights();

  return (
    <Card className={`${config.borderColor} ${config.bgColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${config.textColor} flex items-center gap-2`}>
              <Settings className="h-5 w-5" />
              {config.title}
            </CardTitle>
            <p className={`text-sm ${config.textColor} opacity-80 mt-1`}>
              {config.description}
            </p>
          </div>
          <Badge variant="outline" className={`${config.bgColor} ${config.textColor} ${config.borderColor}`}>
            {getJobCategory().toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Job Insights */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {insights.map((insight, index) => (
              <div key={index} className="bg-white/70 p-3 rounded border">
                <div className="flex items-center gap-2">
                  <insight.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{insight.label}</p>
                    <p className="text-sm font-medium">{insight.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Control Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-white/70"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Manual Refresh
          </Button>
          
          {onTogglePolling && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePolling}
              className="bg-white/70"
            >
              {isPolling ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isPolling ? 'Pause' : 'Resume'} Auto-Updates
            </Button>
          )}
          
          {onToggleNotifications && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleNotifications}
              className="bg-white/70"
            >
              {notificationsEnabled ? <BellOff className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
              {notificationsEnabled ? 'Disable' : 'Enable'} Notifications
            </Button>
          )}
        </div>

        {/* Optimization Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className={`text-sm font-medium ${config.textColor}`}>Optimization Suggestions</h4>
            {suggestions.map((suggestion, index) => (
              <Alert key={index} className="bg-white/70">
                <div className="flex items-start gap-2">
                  {suggestion.type === 'attention' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  ) : suggestion.type === 'efficiency' ? (
                    <Settings className="h-4 w-4 text-blue-600 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className="text-sm">
                      <div className="flex items-center justify-between">
                        <span>{suggestion.message}</span>
                        {suggestion.action && suggestion.actionFn && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={suggestion.actionFn}
                            className="ml-2 h-6 px-2 text-xs"
                          >
                            {suggestion.action}
                          </Button>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Job Timeline */}
        <div className="bg-white/70 p-3 rounded border">
          <h4 className="text-sm font-medium mb-2">Job Timeline</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Created: {formatDistanceToNow(createdTime)} ago</div>
            <div>Runtime: {Math.round(ageInHours)}h {Math.round((ageInHours % 1) * 60)}m</div>
            {job.request_counts.completed > 0 && (
              <div>First progress: Detected within processing window</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LargeJobManagementPanel;