import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash, Shield, TestTube } from "lucide-react";
import {
  getComprehensiveExclusionKeywords,
  validateExclusionKeywords
} from "@/lib/classification/keywordExclusion";
import { checkKeywordExclusion } from "@/lib/classification/enhancedKeywordExclusion";
import { testKeywordExclusion, quickTest } from "@/lib/classification/keywordExclusionTest";
import { KEYWORD_EXCLUSION_CONFIG } from "@/lib/classification/config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const KeywordExclusionManager = () => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [testPayeeName, setTestPayeeName] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial keywords
    const initialKeywords = getComprehensiveExclusionKeywords();
    setKeywords(initialKeywords);
    console.log(`[KEYWORD EXCLUSION MANAGER] Loaded ${initialKeywords.length} keywords`);
  }, []);

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) {
      toast({
        title: "Invalid Keyword",
        description: "Please enter a valid keyword",
        variant: "destructive",
      });
      return;
    }

    const trimmedKeyword = newKeyword.trim();
    if (keywords.some(k => k.toLowerCase() === trimmedKeyword.toLowerCase())) {
      toast({
        title: "Duplicate Keyword",
        description: "This keyword already exists",
        variant: "destructive",
      });
      return;
    }

    const updatedKeywords = [...keywords, trimmedKeyword];
    setKeywords(updatedKeywords);
    setNewKeyword("");
    
    toast({
      title: "Keyword Added",
      description: `"${trimmedKeyword}" has been added to the exclusion list`,
    });
  };

  const handleEditKeyword = (index: number) => {
    setEditingIndex(index);
    setEditingValue(keywords[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    if (!editingValue.trim()) {
      toast({
        title: "Invalid Keyword",
        description: "Please enter a valid keyword",
        variant: "destructive",
      });
      return;
    }

    const trimmedValue = editingValue.trim();
    const updatedKeywords = [...keywords];
    updatedKeywords[editingIndex] = trimmedValue;
    
    setKeywords(updatedKeywords);
    setEditingIndex(null);
    setEditingValue("");

    toast({
      title: "Keyword Updated",
      description: `Keyword has been updated to "${trimmedValue}"`,
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleDeleteKeyword = (index: number) => {
    const deletedKeyword = keywords[index];
    const updatedKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(updatedKeywords);

    toast({
      title: "Keyword Deleted",
      description: `"${deletedKeyword}" has been removed from the exclusion list`,
    });
  };

  const handleTestPayee = () => {
    if (!testPayeeName.trim()) {
      setTestResult(null);
      return;
    }

    console.log(`[KEYWORD EXCLUSION MANAGER] Testing: "${testPayeeName}"`);
    const result = checkKeywordExclusion(testPayeeName, keywords);
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

  const resetToDefaults = () => {
    const defaultKeywords = getComprehensiveExclusionKeywords();
    setKeywords(defaultKeywords);
    
    toast({
      title: "Reset Complete",
      description: "Keyword exclusion list has been reset to defaults",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Keyword Exclusion Management
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              ALWAYS ENABLED
            </Badge>
          </CardTitle>
          <CardDescription>
            Keyword exclusions are automatically applied to ALL payee classifications. 
            Payees containing these keywords will be classified as businesses and excluded from AI processing.
            This feature is always enabled and cannot be disabled for accuracy and performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>System Status:</strong> Keyword exclusions are {KEYWORD_EXCLUSION_CONFIG.enabled ? 'ENABLED' : 'DISABLED'} and 
              auto-apply is {KEYWORD_EXCLUSION_CONFIG.autoApply ? 'ON' : 'OFF'}. 
              This ensures consistent classification across all processing methods.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-keyword">Add New Keyword</Label>
              <Input
                id="new-keyword"
                placeholder="Enter keyword to exclude"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddKeyword}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button variant="outline" onClick={runFullTest}>
              <TestTube className="h-4 w-4 mr-2" />
              Run Test Suite
            </Button>
            <Badge variant="secondary">
              {keywords.length} keywords
            </Badge>
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-end">
              <Button onClick={handleTestPayee} variant="outline">
                <TestTube className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
          </div>
          
          {testResult && (
            <Alert className={testResult.isExcluded ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Result:</strong> {testResult.isExcluded ? "EXCLUDED" : "NOT EXCLUDED"}
                    {testResult.confidence > 0 && ` (${testResult.confidence.toFixed(1)}% confidence)`}
                  </p>
                  {testResult.isExcluded && testResult.matchedKeywords.length > 0 && (
                    <p>
                      <strong>Matched Keywords:</strong> {testResult.matchedKeywords.join(", ")}
                    </p>
                  )}
                  {testResult.reasoning && (
                    <p>
                      <strong>Reasoning:</strong> {testResult.reasoning}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Exclusion Keywords</CardTitle>
          <CardDescription>
            Click on any keyword to edit it, or use the delete button to remove it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((keyword, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {editingIndex === index ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="font-mono">{keyword}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex !== index && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditKeyword(index)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteKeyword(index)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordExclusionManager;
