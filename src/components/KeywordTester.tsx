
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { checkKeywordExclusion } from "@/lib/classification/keywordExclusion";
import { quickTest, testKeywordExclusion } from "@/lib/classification/keywordExclusionTest";

interface KeywordTesterProps {
  allKeywords: string[];
}

const KeywordTester = ({ allKeywords }: KeywordTesterProps) => {
  const [testPayeeName, setTestPayeeName] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  const handleTestPayee = () => {
    if (!testPayeeName.trim()) {
      setTestResult(null);
      return;
    }

    console.log(`[KEYWORD EXCLUSION MANAGER] Testing: "${testPayeeName}"`);
    const result = checkKeywordExclusion(testPayeeName, allKeywords);
    setTestResult(result);
    
    // Also run quick test for detailed logging
    quickTest(testPayeeName);
  };

  const runFullTest = () => {
    console.log('[KEYWORD EXCLUSION MANAGER] Running full test suite...');
    testKeywordExclusion();
    
    toast({
      title: "Test Suite Complete",
      description: "Check console for detailed test results",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Keyword Exclusion</CardTitle>
        <CardDescription>
          Test a payee name against the current exclusion keywords to see if it would be excluded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="test-payee">Test Payee Name</Label>
            <Input
              id="test-payee"
              placeholder="Enter payee name to test (e.g., 'Bank of America')"
              value={testPayeeName}
              onChange={(e) => {
                setTestPayeeName(e.target.value);
                handleTestPayee();
              }}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleTestPayee} variant="outline">
              <TestTube className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button onClick={runFullTest} variant="outline">
              <TestTube className="h-4 w-4 mr-2" />
              Run Test Suite
            </Button>
          </div>
        </div>
        
        {testResult && (
          <Alert className={testResult.isExcluded ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Result:</strong> {testResult.isExcluded ? "EXCLUDED" : "NOT EXCLUDED"}
                </p>
                {testResult.isExcluded && testResult.matchedKeywords.length > 0 && (
                  <p>
                    <strong>Matched Keywords:</strong> {testResult.matchedKeywords.join(", ")}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default KeywordTester;
