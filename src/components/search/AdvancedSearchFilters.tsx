import React, { useState } from 'react';
import { Search, Filter, X, Calendar, User, Building, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface FilterCriteria {
  searchTerm: string;
  classification: string;
  sicCode: string;
  confidenceRange: [number, number];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  isDuplicate: boolean | null;
  hasErrors: boolean | null;
}

interface AdvancedSearchFiltersProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  onClearFilters: () => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}

export const updateFilterValue = <K extends keyof FilterCriteria>(
  currentFilters: FilterCriteria,
  key: K,
  value: FilterCriteria[K]
): FilterCriteria => ({
  ...currentFilters,
  [key]: value
});

const AdvancedSearchFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  resultCount,
  totalCount,
  className
}: AdvancedSearchFiltersProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const updateFilter = <K extends keyof FilterCriteria>(
    key: K,
    value: FilterCriteria[K]
  ) => {
    onFiltersChange(updateFilterValue(filters, key, value));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.classification && filters.classification !== 'all') count++;
    if (filters.sicCode) count++;
    if (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.isDuplicate !== null) count++;
    if (filters.hasErrors !== null) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Advanced
            </Button>
            
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {/* Results summary */}
        <div className="text-sm text-muted-foreground">
          Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()} results
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payee names..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.classification}
            onValueChange={(value) => updateFilter('classification', value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.isDuplicate?.toString() || 'all'}
            onValueChange={(value) => updateFilter('isDuplicate', value === 'all' ? null : value === 'true')}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Duplicates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Duplicates</SelectItem>
              <SelectItem value="false">Unique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced filters */}
        {isAdvancedOpen && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SIC Code filter */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4" />
                  SIC Code
                </label>
                <Input
                  placeholder="e.g., 7372"
                  value={filters.sicCode}
                  onChange={(e) => updateFilter('sicCode', e.target.value)}
                />
              </div>

              {/* Confidence range */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Hash className="h-4 w-4" />
                  Confidence Range
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Min"
                    value={filters.confidenceRange[0] || ''}
                    onChange={(e) => updateFilter('confidenceRange', [
                      parseInt(e.target.value) || 0,
                      filters.confidenceRange[1]
                    ])}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Max"
                    value={filters.confidenceRange[1] || ''}
                    onChange={(e) => updateFilter('confidenceRange', [
                      filters.confidenceRange[0],
                      parseInt(e.target.value) || 100
                    ])}
                    className="w-20"
                  />
                </div>
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value ? new Date(e.target.value) : null
                  })}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value ? new Date(e.target.value) : null
                  })}
                />
              </div>
            </div>

            {/* Error status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Error Status</label>
              <Select
                value={filters.hasErrors?.toString() || 'all'}
                onValueChange={(value) => updateFilter('hasErrors', value === 'all' ? null : value === 'true')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="true">With Errors</SelectItem>
                  <SelectItem value="false">No Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active filters display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.searchTerm && (
              <Badge variant="outline" className="flex items-center gap-1">
                Search: "{filters.searchTerm}"
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter('searchTerm', '')}
                />
              </Badge>
            )}
            
            {filters.classification && filters.classification !== 'all' && (
              <Badge variant="outline" className="flex items-center gap-1">
                Type: {filters.classification}
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter('classification', 'all')}
                />
              </Badge>
            )}
            
            {filters.sicCode && (
              <Badge variant="outline" className="flex items-center gap-1">
                SIC: {filters.sicCode}
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter('sicCode', '')}
                />
              </Badge>
            )}
            
            {filters.isDuplicate !== null && (
              <Badge variant="outline" className="flex items-center gap-1">
                {filters.isDuplicate ? 'Duplicates Only' : 'Unique Only'}
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateFilter('isDuplicate', null)}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedSearchFilters;