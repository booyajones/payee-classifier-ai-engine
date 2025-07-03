import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Eye
} from 'lucide-react';
import { DuplicateGroup } from '@/lib/services/duplicateDetectionTypes';

interface DuplicateGroupsListProps {
  duplicate_groups: DuplicateGroup[];
  statistics: {
    total_processed: number;
  };
  onReviewGroup: (group: DuplicateGroup) => void;
}

export const DuplicateGroupsList = ({ 
  duplicate_groups, 
  statistics, 
  onReviewGroup 
}: DuplicateGroupsListProps) => {
  if (duplicate_groups.length === 0) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          No duplicate groups detected! All {statistics.total_processed} payee records appear to be unique.
        </AlertDescription>
      </Alert>
    );
  }

  return (
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
                    onClick={() => onReviewGroup(group)}
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
  );
};
