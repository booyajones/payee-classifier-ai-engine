
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PayeeClassification } from "@/lib/types";
import ClassificationBadge from "../ClassificationBadge";

interface DetailsModalProps {
  selectedResult: PayeeClassification | null;
  onClose: () => void;
}

const DetailsModal = ({ selectedResult, onClose }: DetailsModalProps) => {
  return (
    <Dialog open={!!selectedResult} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {selectedResult && selectedResult.result && (
          <>
            <DialogHeader>
              <DialogTitle>{selectedResult.payeeName}</DialogTitle>
              <DialogDescription>Complete Classification Details</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex justify-between">
                <span className="font-medium">Classification:</span>
                <Badge variant={selectedResult.result.classification === 'Business' ? 'default' : 'secondary'}>
                  {selectedResult.result.classification}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Confidence:</span>
                <ClassificationBadge confidence={selectedResult.result.confidence} />
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Processing Tier:</span>
                <span>{selectedResult.result.processingTier}</span>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Reasoning:</h4>
                <p className="text-sm">{selectedResult.result.reasoning}</p>
              </div>
              
              {selectedResult.result.keywordExclusion && (
                <div>
                  <h4 className="font-medium mb-1">Keyword Exclusion:</h4>
                  <div className="text-sm space-y-1">
                    <div>Excluded: {selectedResult.result.keywordExclusion.isExcluded ? 'Yes' : 'No'}</div>
                    {selectedResult.result.keywordExclusion.matchedKeywords.length > 0 && (
                      <div>Keywords: {selectedResult.result.keywordExclusion.matchedKeywords.join(', ')}</div>
                    )}
                    <div>Reasoning: {selectedResult.result.keywordExclusion.reasoning}</div>
                  </div>
                </div>
              )}
              
              {selectedResult.result.matchingRules && selectedResult.result.matchingRules.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Matching Rules:</h4>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {selectedResult.result.matchingRules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DetailsModal;
