
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { PayeeRowData } from '@/lib/rowMapping';
import { checkKeywordExclusion } from '@/lib/classification/enhancedKeywordExclusion';

interface BatchJobPayeeStatsProps {
  payeeData?: PayeeRowData;
}

const BatchJobPayeeStats = ({ payeeData }: BatchJobPayeeStatsProps) => {
  const payeeStats = React.useMemo(() => {
    if (!payeeData) return null;

    // Check which payees would be excluded by keywords
    const exclusionResults = payeeData.uniquePayeeNames.map(name => ({
      name,
      exclusion: checkKeywordExclusion(name)
    }));

    const excludedPayees = exclusionResults.filter(r => r.exclusion.isExcluded);
    const nonExcludedPayees = exclusionResults.filter(r => !r.exclusion.isExcluded);

    // Simple heuristic for business vs individual classification
    // This is a preview - actual classification happens during processing
    const businessIndicators = ['LLC', 'INC', 'CORP', 'LTD', 'CO', 'COMPANY', 'CORPORATION', 'LIMITED'];
    const individualIndicators = ['MR', 'MRS', 'MS', 'DR', 'MISS'];

    const businessCount = nonExcludedPayees.filter(p => {
      const upperName = p.name.toUpperCase();
      return businessIndicators.some(indicator => upperName.includes(indicator));
    }).length;

    const individualCount = nonExcludedPayees.filter(p => {
      const upperName = p.name.toUpperCase();
      return individualIndicators.some(indicator => upperName.includes(indicator)) ||
             (!businessIndicators.some(indicator => upperName.includes(indicator)) && 
              upperName.split(' ').length >= 2);
    }).length;

    const unknownCount = nonExcludedPayees.length - businessCount - individualCount;

    return {
      total: payeeData.uniquePayeeNames.length,
      excluded: excludedPayees.length,
      business: businessCount,
      individual: individualCount,
      unknown: unknownCount,
      excludedPayees: excludedPayees.slice(0, 5), // Show first 5 excluded payees
      hasMoreExcluded: excludedPayees.length > 5
    };
  }, [payeeData]);

  if (!payeeStats) return null;

  return (
    <div className="bg-blue-50 p-3 rounded border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">Payee Summary</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{payeeStats.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Businesses:</span>
            <span className="font-medium text-blue-600">{payeeStats.business}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Individuals:</span>
            <span className="font-medium text-green-600">{payeeStats.individual}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Excluded:</span>
            <span className="font-medium text-red-600">{payeeStats.excluded}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unknown:</span>
            <span className="font-medium text-gray-600">{payeeStats.unknown}</span>
          </div>
        </div>
      </div>
      
      {payeeStats.excluded > 0 && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <div className="text-xs text-muted-foreground mb-1">
            Excluded payees {payeeStats.hasMoreExcluded ? `(showing first 5 of ${payeeStats.excluded})` : ''}:
          </div>
          <div className="flex flex-wrap gap-1">
            {payeeStats.excludedPayees.map((excluded, index) => (
              <Badge 
                key={index} 
                variant="destructive" 
                className="text-xs px-1 py-0"
                title={`Excluded: ${excluded.exclusion.matchedKeywords.join(', ')}`}
              >
                {excluded.name.length > 15 ? `${excluded.name.substring(0, 15)}...` : excluded.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchJobPayeeStats;
