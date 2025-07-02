import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { QualityMetrics, calculateQualityScore, getQualityTier } from '@/lib/config/aiQualityConfig';

interface QualityAssuranceDisplayProps {
  metrics: QualityMetrics;
  isVisible: boolean;
}

const QualityAssuranceDisplay = ({ metrics, isVisible }: QualityAssuranceDisplayProps) => {
  if (!isVisible) return null;

  const qualityScore = calculateQualityScore(metrics);
  const highConfidencePercentage = Math.round((metrics.highConfidenceCount / metrics.totalProcessed) * 100);
  const sicCoveragePercentage = metrics.totalBusinesses > 0 
    ? Math.round((metrics.businessWithSicCodes / metrics.totalBusinesses) * 100)
    : 100;

  const getQualityBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (score >= 75) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AI Quality Assurance Report
          </CardTitle>
          <div className="flex items-center gap-2">
            {getQualityIcon(qualityScore)}
            <Badge className={`${getQualityBadgeColor(qualityScore)} text-white`}>
              Quality Score: {qualityScore}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Quality Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Quality Score</span>
            <span className="font-medium">{qualityScore}%</span>
          </div>
          <Progress value={qualityScore} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Based on confidence levels and SIC code coverage
          </p>
        </div>

        {/* Confidence Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {metrics.highConfidenceCount}
            </div>
            <div className="text-sm text-green-700">High Confidence (≥90%)</div>
            <div className="text-xs text-green-600">
              {highConfidencePercentage}% of total
            </div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.mediumConfidenceCount}
            </div>
            <div className="text-sm text-yellow-700">Medium Confidence (85-89%)</div>
            <div className="text-xs text-yellow-600">
              {Math.round((metrics.mediumConfidenceCount / metrics.totalProcessed) * 100)}% of total
            </div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {metrics.lowConfidenceCount}
            </div>
            <div className="text-sm text-red-700">Low Confidence (&lt;85%)</div>
            <div className="text-xs text-red-600">
              {Math.round((metrics.lowConfidenceCount / metrics.totalProcessed) * 100)}% of total
            </div>
          </div>
        </div>

        {/* SIC Code Coverage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>SIC Code Coverage (Businesses)</span>
            <span className="font-medium">
              {metrics.businessWithSicCodes}/{metrics.totalBusinesses} ({sicCoveragePercentage}%)
            </span>
          </div>
          <Progress value={sicCoveragePercentage} className="h-2" />
        </div>

        {/* Quality Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total Processed</div>
            <div className="font-medium">{metrics.totalProcessed}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg. Confidence</div>
            <div className="font-medium">{Math.round(metrics.averageConfidence)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Review Required</div>
            <div className="font-medium text-orange-600">{metrics.reviewRequired}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Quality Tier</div>
            <div className="font-medium">
              {getQualityTier(metrics.averageConfidence)}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {qualityScore < 90 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Quality Improvement Recommendations:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {highConfidencePercentage < 80 && (
                <li>• Consider reviewing and improving training data quality</li>
              )}
              {sicCoveragePercentage < 90 && (
                <li>• Enhance SIC code assignment for business entities</li>
              )}
              {metrics.reviewRequired > 0 && (
                <li>• Review {metrics.reviewRequired} low-confidence classifications manually</li>
              )}
              <li>• Monitor classification patterns for consistent accuracy</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QualityAssuranceDisplay;