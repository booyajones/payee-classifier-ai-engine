import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Search, 
  Brain, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Eye,
  Download,
  AlertTriangle
} from 'lucide-react';
import { DuplicateDetectionResult, DuplicateGroup } from '@/lib/services/duplicateDetectionTypes';
import DuplicateReviewModal from './DuplicateReviewModal';

interface DuplicateDetectionResultsProps {
  result: DuplicateDetectionResult;
  onAcceptGroup: (groupId: string) => void;
  onRejectGroup: (groupId: string) => void;
  onAcceptMember: (groupId: string, payeeId: string) => void;
  onRejectMember: (groupId: string, payeeId: string) => void;
  onExportResults: () => void;
  onProceedWithProcessing: () => void;
}

const DuplicateDetectionResults = ({
  result,
  onAcceptGroup,
  onRejectGroup,
  onAcceptMember,
  onRejectMember,
  onExportResults,
  onProceedWithProcessing
}: DuplicateDetectionResultsProps) => {
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { processed_records, duplicate_groups, statistics } = result;
  
  const duplicateRate = (statistics.duplicates_found / statistics.total_processed) * 100;
  const aiUsageRate = (statistics.ai_judgments_made / statistics.total_processed) * 100;

  const handleReviewGroup = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setReviewModalOpen(true);
  };

  const getMethodIcon = (method: string) => {
    if (method === 'AI Judgment') return <Brain className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'AI Judgment': return 'bg-purple-500';
      case 'Algorithmic - High Confidence': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Duplicate Detection Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{statistics.total_processed}</div>
              <div className="text-sm text-blue-700">Total Records</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{statistics.duplicates_found}</div>
              <div className="text-sm text-orange-700">Duplicates Found</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{duplicate_groups.length}</div>
              <div className="text-sm text-green-700">Duplicate Groups</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{statistics.ai_judgments_made}</div>
              <div className="text-sm text-purple-700">AI Judgments</div>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Duplicate Rate</span>
                <span>{duplicateRate.toFixed(1)}%</span>
              </div>
              <Progress value={duplicateRate} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>AI Analysis Usage</span>
                <span>{aiUsageRate.toFixed(1)}%</span>
              </div>
              <Progress value={aiUsageRate} className="h-2" />
            </div>
          </div>

          {/* Processing Time */}
          <div className="text-sm text-muted-foreground">
            Processing completed in {(statistics.processing_time_ms / 1000).toFixed(2)} seconds
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups */}
      {duplicate_groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Duplicate Groups ({duplicate_groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duplicate_groups.map((group, index) => (
                <div key={group.group_id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Group #{index + 1}</Badge>
                      <span className="font-medium">{group.canonical_payee_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-500 text-white">
                        {group.members.length} members
                      </Badge>
                      <Badge className="bg-blue-500 text-white">
                        {group.total_score.toFixed(1)}% avg
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewGroup(group)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Canonical */}
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Canonical</span>
                      </div>
                      <div>{group.canonical_payee_name}</div>
                    </div>
                    
                    {/* Duplicates */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Duplicates ({group.members.length - 1})</span>
                      </div>
                      <div className="space-y-1">
                        {group.members
                          .filter(m => m.is_potential_duplicate)
                          .slice(0, 2)
                          .map(member => (
                            <div key={member.payee_id} className="text-xs">{member.payee_name}</div>
                          ))
                        }
                        {group.members.filter(m => m.is_potential_duplicate).length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{group.members.filter(m => m.is_potential_duplicate).length - 2} more...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Duplicates Found */}
      {duplicate_groups.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            No duplicate groups detected! All {statistics.total_processed} payee records appear to be unique.
          </AlertDescription>
        </Alert>
      )}

      {/* Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span className="font-medium">High Confidence</span>
              </div>
              <div className="text-2xl font-bold">{statistics.high_confidence_matches}</div>
              <div className="text-sm text-muted-foreground">Algorithmic matches ≥95%</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <span className="font-medium">AI Analyzed</span>
              </div>
              <div className="text-2xl font-bold">{statistics.ai_judgments_made}</div>
              <div className="text-sm text-muted-foreground">Ambiguous cases (75-95%)</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Low Confidence</span>
              </div>
              <div className="text-2xl font-bold">{statistics.low_confidence_matches}</div>
              <div className="text-sm text-muted-foreground">Algorithmic non-matches ≤75%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onExportResults}>
          <Download className="h-4 w-4 mr-2" />
          Export Results
        </Button>
        <div className="flex gap-2">
          {duplicate_groups.length > 0 && (
            <Alert className="flex-1 max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Review duplicate groups before proceeding with processing.
              </AlertDescription>
            </Alert>
          )}
          <Button onClick={onProceedWithProcessing}>
            Proceed with Processing
          </Button>
        </div>
      </div>

      {/* Review Modal */}
      <DuplicateReviewModal
        isOpen={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        duplicateGroup={selectedGroup}
        onAcceptGroup={onAcceptGroup}
        onRejectGroup={onRejectGroup}
        onAcceptMember={onAcceptMember}
        onRejectMember={onRejectMember}
      />
    </div>
  );
};

export default DuplicateDetectionResults;