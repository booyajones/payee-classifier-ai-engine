import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Brain, BarChart3 } from 'lucide-react';
import { DuplicateGroup } from '@/lib/services/duplicateDetectionTypes';

interface DuplicateReviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateGroup: DuplicateGroup | null;
  onAcceptGroup: (groupId: string) => void;
  onRejectGroup: (groupId: string) => void;
  onAcceptMember: (groupId: string, payeeId: string) => void;
  onRejectMember: (groupId: string, payeeId: string) => void;
}

const DuplicateReviewModal = ({
  isOpen,
  onOpenChange,
  duplicateGroup,
  onAcceptGroup,
  onRejectGroup,
  onAcceptMember,
  onRejectMember
}: DuplicateReviewModalProps) => {
  if (!duplicateGroup) return null;

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

  const canonical = duplicateGroup.members.find(m => !m.is_potential_duplicate) || duplicateGroup.members[0];
  const duplicates = duplicateGroup.members.filter(m => m.is_potential_duplicate);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Duplicate Group Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Group Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Members</div>
                  <div className="font-medium">{duplicateGroup.members.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Duplicates Found</div>
                  <div className="font-medium">{duplicates.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg. Score</div>
                  <div className="font-medium">{duplicateGroup.total_score.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Group ID</div>
                  <div className="font-medium text-xs">{duplicateGroup.group_id.slice(-8)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canonical Record */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Canonical Record (Keep This One)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-medium text-lg">{canonical.payee_name}</div>
                <div className="text-sm text-muted-foreground">ID: {canonical.payee_id}</div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Duplicate Records */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detected Duplicates</h3>
            {duplicates.map((duplicate, index) => (
              <Card key={duplicate.payee_id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-orange-500" />
                      Duplicate #{index + 1}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAcceptMember(duplicateGroup.group_id, duplicate.payee_id)}
                      >
                        Keep as Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onRejectMember(duplicateGroup.group_id, duplicate.payee_id)}
                      >
                        Mark as Unique
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="font-medium">{duplicate.payee_name}</div>
                    <div className="text-sm text-muted-foreground">ID: {duplicate.payee_id}</div>
                  </div>

                  {/* Detection Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Similarity Score</div>
                      <div className="font-medium">{duplicate.final_duplicate_score.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Detection Method</div>
                      <Badge className={`${getMethodBadgeColor(duplicate.judgement_method)} text-white`}>
                        {getMethodIcon(duplicate.judgement_method)}
                        <span className="ml-1">{duplicate.judgement_method}</span>
                      </Badge>
                    </div>
                    <div>
                      <div className="text-muted-foreground">AI Confidence</div>
                      <div className="font-medium">
                        {duplicate.ai_judgement_is_duplicate !== null ? 
                          `${duplicate.ai_judgement_is_duplicate ? 'Yes' : 'No'}` : 
                          'N/A'
                        }
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning */}
                  {duplicate.ai_judgement_reasoning && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium text-purple-700 dark:text-purple-300 mb-1">
                          AI Analysis:
                        </div>
                        <div className="text-purple-600 dark:text-purple-400">
                          {duplicate.ai_judgement_reasoning}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Similarity Scores */}
                  {duplicate.similarity_scores && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                      <div className="text-sm font-medium mb-2">Similarity Breakdown:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Jaro-Winkler</div>
                          <div>{duplicate.similarity_scores.jaroWinkler?.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Token Sort</div>
                          <div>{duplicate.similarity_scores.tokenSort?.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Token Set</div>
                          <div>{duplicate.similarity_scores.tokenSet?.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Final Score</div>
                          <div className="font-medium">{duplicate.similarity_scores.duplicateScore?.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Group Actions */}
          <Separator />
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  onRejectGroup(duplicateGroup.group_id);
                  onOpenChange(false);
                }}
              >
                Reject All Duplicates
              </Button>
              <Button
                onClick={() => {
                  onAcceptGroup(duplicateGroup.group_id);
                  onOpenChange(false);
                }}
              >
                Accept All Duplicates
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateReviewModal;
