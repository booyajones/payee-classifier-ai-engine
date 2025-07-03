import { Badge } from "@/components/ui/badge";

interface ClassificationBadgeProps {
  confidence: number;
}

const ClassificationBadge = ({ confidence }: ClassificationBadgeProps) => {
  const getVariant = (confidence: number) => {
    if (confidence >= 90) return "default";
    if (confidence >= 70) return "secondary";
    return "outline";
  };

  const getColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-700";
    if (confidence >= 70) return "text-blue-700";
    return "text-orange-700";
  };

  return (
    <Badge variant={getVariant(confidence)} className={getColor(confidence)}>
      {confidence}%
    </Badge>
  );
};

export default ClassificationBadge;