
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PayeeClassification } from "@/lib/types";
import ClassificationBadge from "./ClassificationBadge";
import { formatDate } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface ClassificationResultCardProps {
  result: PayeeClassification;
}

const ClassificationResultCard = ({ result }: ClassificationResultCardProps) => {
  const { payeeName, timestamp } = result;
  const { classification, confidence, reasoning, processingTier, matchingRules, sicCode, sicDescription } = result.result;
  
  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{payeeName}</CardTitle>
            <CardDescription>{formatDate(timestamp)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={classification === 'Business' ? 'default' : 'secondary'}>
              {classification}
            </Badge>
            <ClassificationBadge confidence={confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">
          <span className="font-medium">Processing Tier:</span> {processingTier}
        </p>
        
        {sicCode && classification === 'Business' && (
          <div className="mb-3 p-2 bg-blue-50 rounded border">
            <p className="text-sm font-medium mb-1">SIC Classification:</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {sicCode}
              </Badge>
              {sicDescription && (
                <span className="text-sm text-gray-600">{sicDescription}</span>
              )}
            </div>
          </div>
        )}
        
        <p className="text-sm">{reasoning}</p>

        {matchingRules && matchingRules.length > 0 && (
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="rules">
              <AccordionTrigger className="text-sm font-medium">
                Matching Rules
              </AccordionTrigger>
              <AccordionContent>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {matchingRules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassificationResultCard;
