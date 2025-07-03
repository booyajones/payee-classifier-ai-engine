// @ts-nocheck
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DuplicateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  onMerge: (groupId: string, targetId: string) => void;
}

const DuplicateReviewModal = ({ isOpen, onClose, group, onMerge }: DuplicateReviewModalProps) => {
  if (!group) return null;

  const handleMerge = (targetId: string) => {
    onMerge(group.id, targetId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Duplicate Group</DialogTitle>
          <DialogDescription>
            Review the entities in this group and select a target to merge into.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {group.entity_ids.map((entityId: string) => (
            <div key={entityId} className="flex items-center justify-between p-2 border rounded-md">
              <span>Entity ID: {entityId}</span>
              <Button variant="outline" size="sm" onClick={() => handleMerge(entityId)}>
                Merge Into
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateReviewModal;
