import React, { useState } from 'react';
import { DuplicateDetectionResult, DuplicateGroup } from '@/lib/services/duplicateDetectionTypes';
import { DetectionStatistics } from './DetectionStatistics';
import { DuplicateGroupsList } from './DuplicateGroupsList';
import { MethodBreakdown } from './MethodBreakdown';
import { DetectionActionControls } from './DetectionActionControls';
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

  const { duplicate_groups, statistics } = result;

  const handleReviewGroup = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <DetectionStatistics 
        statistics={statistics}
        duplicate_groups_count={duplicate_groups.length}
      />

      {/* Duplicate Groups */}
      <DuplicateGroupsList 
        duplicate_groups={duplicate_groups}
        statistics={statistics}
        onReviewGroup={handleReviewGroup}
      />

      {/* Method Breakdown */}
      <MethodBreakdown statistics={statistics} />

      {/* Action Controls */}
      <DetectionActionControls 
        duplicate_groups_count={duplicate_groups.length}
        onExportResults={onExportResults}
        onProceedWithProcessing={onProceedWithProcessing}
      />

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