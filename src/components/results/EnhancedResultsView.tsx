import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Filter, Eye, BarChart3 } from 'lucide-react';
import { PayeeClassification } from '@/lib/types';
import AdvancedSearchFilters from '@/components/search/AdvancedSearchFilters';
import { useAdvancedFiltering } from '@/hooks/useAdvancedFiltering';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import OptimizedVirtualizedTable from '@/components/table/OptimizedVirtualizedTable';
import { useEnhancedNotifications } from '@/components/ui/enhanced-notifications';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface EnhancedResultsViewProps {
  results: PayeeClassification[];
  onViewDetails?: (result: PayeeClassification) => void;
  className?: string;
}

const EnhancedResultsView = ({ 
  results, 
  onViewDetails,
  className 
}: EnhancedResultsViewProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const { showSuccess, showError, showInfo } = useEnhancedNotifications();
  const { 
    metrics, 
    getVirtualizationConfig,
    getPerformanceWarnings,
    startRenderTracking,
    endRenderTracking 
  } = usePerformanceOptimization();

  // Performance tracking
  React.useEffect(() => {
    startRenderTracking();
    return () => endRenderTracking();
  }, [startRenderTracking, endRenderTracking]);

  // Advanced filtering
  const {
    filters,
    filteredResults,
    statistics,
    updateFilters,
    clearFilters,
    exportFilteredResults
  } = useAdvancedFiltering(results);

  // Memoized table columns
  const tableColumns = useMemo(() => [
    { 
      key: 'payeeName', 
      label: 'Payee Name', 
      isOriginal: false,
      render: (item: PayeeClassification) => (
        <div className="font-medium">{item.payeeName}</div>
      )
    },
    { 
      key: 'classification', 
      label: 'Type', 
      isOriginal: false,
      render: (item: PayeeClassification) => (
        <Badge 
          variant={
            item.result?.classification === 'Business' ? 'default' : 
            item.result?.classification === 'Individual' ? 'secondary' : 
            'outline'
          }
        >
          {item.result?.classification || 'Unknown'}
        </Badge>
      )
    },
    { 
      key: 'confidence', 
      label: 'Confidence', 
      isOriginal: false,
      render: (item: PayeeClassification) => (
        <div className="flex items-center gap-2">
          <Progress 
            value={(item.result?.confidence || 0) * 100} 
            className="w-16 h-2"
          />
          <span className="text-xs text-muted-foreground">
            {((item.result?.confidence || 0) * 100).toFixed(0)}%
          </span>
        </div>
      )
    },
    { 
      key: 'sicCode', 
      label: 'SIC Code', 
      isOriginal: false,
      render: (item: PayeeClassification) => (
        <div className="text-sm">
          {item.result?.sicCode && (
            <div>
              <div className="font-mono">{item.result.sicCode}</div>
              {item.result.sicDescription && (
                <div className="text-xs text-muted-foreground truncate max-w-32">
                  {item.result.sicDescription}
                </div>
              )}
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'processingTier', 
      label: 'Method', 
      isOriginal: false,
      render: (item: PayeeClassification) => (
        <Badge variant="outline" className="text-xs">
          {item.result?.processingTier || 'Unknown'}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      isOriginal: false,
      render: (item: PayeeClassification) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails?.(item)}
          className="flex items-center gap-1"
        >
          <Eye className="h-3 w-3" />
          View
        </Button>
      )
    }
  ], [onViewDetails]);

  const virtualizationConfig = getVirtualizationConfig(filteredResults.length, 60);
  const performanceWarnings = getPerformanceWarnings();

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      exportFilteredResults(format);
      showSuccess(
        'Export Complete',
        `Downloaded ${filteredResults.length} results as ${format.toUpperCase()}`
      );
    } catch (error) {
      showError(
        'Export Failed',
        error instanceof Error ? error.message : 'Failed to export results'
      );
    }
  };

  const handleViewStats = () => {
    setShowStats(!showStats);
    showInfo(
      'Statistics Overview',
      `Business: ${statistics.businessCount}, Individual: ${statistics.individualCount}, Avg Confidence: ${statistics.avgConfidence}%`
    );
  };

  return (
    <div className={className}>
      {/* Performance warnings */}
      {performanceWarnings.length > 0 && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="text-sm text-yellow-800">
              Performance Notice: {performanceWarnings.join(', ')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Classification Results</h2>
          <p className="text-muted-foreground">
            {filteredResults.length.toLocaleString()} of {results.length.toLocaleString()} results
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewStats}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mb-6">
          <AdvancedSearchFilters
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
            resultCount={filteredResults.length}
            totalCount={results.length}
          />
        </div>
      )}

      {/* Statistics Panel */}
      {showStats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Results Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.businessCount}
                </div>
                <div className="text-xs text-muted-foreground">Business</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.individualCount}
                </div>
                <div className="text-xs text-muted-foreground">Individual</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {statistics.unknownCount}
                </div>
                <div className="text-xs text-muted-foreground">Unknown</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.avgConfidence}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
              </div>
            </div>
            
            {/* Performance metrics */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Performance: {metrics.avgRenderTime.toFixed(1)}ms avg render, 
                {metrics.memoryUsage}% memory usage
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          {filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                No results match your current filters
              </div>
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <OptimizedVirtualizedTable
              data={filteredResults}
              columns={tableColumns}
              height={virtualizationConfig.height}
              itemHeight={virtualizationConfig.itemHeight}
              overscan={virtualizationConfig.overscan}
              onViewDetails={onViewDetails}
              className="border-0"
            />
          )}
        </CardContent>
      </Card>
      
      {/* Footer with export options */}
      {filteredResults.length > 0 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {filteredResults.length.toLocaleString()} results
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
            >
              Export JSON
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedResultsView;