
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

const CUSTOM_KEYWORDS_STORAGE_KEY = 'custom-exclusion-keywords';

const KeywordExclusionManager = () => {
  const [comprehensiveKeywords, setComprehensiveKeywords] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [testPayeeName, setTestPayeeName] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  // Load custom keywords from localStorage
  const loadCustomKeywords = (): string[] => {
    try {
      const stored = localStorage.getItem(CUSTOM_KEYWORDS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading custom keywords:', error);
      return [];
    }
  };

  // Save custom keywords to localStorage
  const saveCustomKeywords = (keywords: string[]) => {
    try {
      localStorage.setItem(CUSTOM_KEYWORDS_STORAGE_KEY, JSON.stringify(keywords));
      console.log(`[KEYWORD EXCLUSION MANAGER] Saved ${keywords.length} custom keywords`);
    } catch (error) {
      console.error('Error saving custom keywords:', error);
      toast({
        title: "Storage Error",
        description: "Failed to save custom keywords",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Load comprehensive keywords (built-in)
    const comprehensive = getComprehensiveExclusionKeywords();
    setComprehensiveKeywords(comprehensive);
    
    // Load custom keywords from localStorage
    const custom = loadCustomKeywords();
    setCustomKeywords(custom);
    
    // Combine both lists for display and testing
    const combined = [...comprehensive, ...custom];
    setAllKeywords(combined);
    
    console.log(`[KEYWORD EXCLUSION MANAGER] Loaded ${comprehensive.length} comprehensive + ${custom.length} custom = ${combined.length} total keywords`);
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
    
    // Check if keyword already exists in either list
    if (allKeywords.some(k => k.toLowerCase() === trimmedKeyword.toLowerCase())) {
      toast({
        title: "Duplicate Keyword",
        description: "This keyword already exists",
        variant: "destructive",
      });
      return;
    }

    // Add to custom keywords
    const updatedCustomKeywords = [...customKeywords, trimmedKeyword];
    setCustomKeywords(updatedCustomKeywords);
    saveCustomKeywords(updatedCustomKeywords);
    
    // Update combined list
    const updatedAllKeywords = [...comprehensiveKeywords, ...updatedCustomKeywords];
    setAllKeywords(updatedAllKeywords);
    setNewKeyword("");
    
    toast({
      title: "Keyword Added",
      description: `"${trimmedKeyword}" has been added to the exclusion list`,
    });
  };

  const handleEditKeyword = (index: number) => {
    setEditingIndex(index);
    setEditingValue(allKeywords[index]);
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
    const keywordToEdit = allKeywords[editingIndex];
    
    // Check if this is a comprehensive (built-in) keyword
    const isComprehensiveKeyword = comprehensiveKeywords.includes(keywordToEdit);
    
    if (isComprehensiveKeyword) {
      toast({
        title: "Cannot Edit Built-in Keyword",
        description: "Built-in keywords cannot be modified. You can add a new custom keyword instead.",
        variant: "destructive",
      });
      setEditingIndex(null);
      setEditingValue("");
      return;
    }
    
    // Find the keyword in custom keywords and update it
    const customIndex = customKeywords.findIndex(k => k === keywordToEdit);
    if (customIndex !== -1) {
      const updatedCustomKeywords = [...customKeywords];
      updatedCustomKeywords[customIndex] = trimmedValue;
      setCustomKeywords(updatedCustomKeywords);
      saveCustomKeywords(updatedCustomKeywords);
      
      // Update combined list
      const updatedAllKeywords = [...comprehensiveKeywords, ...updatedCustomKeywords];
      setAllKeywords(updatedAllKeywords);
    }
    
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
    const keywordToDelete = allKeywords[index];
    
    // Check if this is a comprehensive (built-in) keyword
    const isComprehensiveKeyword = comprehensiveKeywords.includes(keywordToDelete);
    
    if (isComprehensiveKeyword) {
      toast({
        title: "Cannot Delete Built-in Keyword",
        description: "Built-in keywords cannot be deleted. Only custom keywords can be removed.",
        variant: "destructive",
      });
      return;
    }
    
    // Remove from custom keywords
    const updatedCustomKeywords = customKeywords.filter(k => k !== keywordToDelete);
    setCustomKeywords(updatedCustomKeywords);
    saveCustomKeywords(updatedCustomKeywords);
    
    // Update combined list
    const updatedAllKeywords = [...comprehensiveKeywords, ...updatedCustomKeywords];
    setAllKeywords(updatedAllKeywords);

    toast({
      title: "Keyword Deleted",
      description: `"${keywordToDelete}" has been removed from the exclusion list`,
    });
  };

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

  const resetToDefaults = () => {
    // Clear custom keywords
    setCustomKeywords([]);
    saveCustomKeywords([]);
    
    // Reset to only comprehensive keywords
    const defaultKeywords = getComprehensiveExclusionKeywords();
    setAllKeywords(defaultKeywords);
    
    toast({
      title: "Reset Complete",
      description: "Custom keywords cleared. Only built-in keywords remain.",
    });
  };

  const isCustomKeyword = (keyword: string): boolean => {
    return customKeywords.includes(keyword);
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
              <Label htmlFor="new-keyword">Add New Custom Keyword</Label>
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

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={resetToDefaults}>
              Clear Custom Keywords
            </Button>
            <Button variant="outline" onClick={runFullTest}>
              <TestTube className="h-4 w-4 mr-2" />
              Run Test Suite
            </Button>
            <Badge variant="secondary">
              {comprehensiveKeywords.length} built-in keywords
            </Badge>
            <Badge variant="outline">
              {customKeywords.length} custom keywords
            </Badge>
            <Badge variant="default">
              {allKeywords.length} total keywords
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
            Built-in keywords cannot be edited or deleted. Custom keywords can be modified or removed.
            Built-in keywords are marked with a green badge, custom keywords with a blue badge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allKeywords.map((keyword, index) => {
                  const isCustom = isCustomKeyword(keyword);
                  return (
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
                        <Badge variant={isCustom ? "default" : "secondary"}>
                          {isCustom ? "Custom" : "Built-in"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingIndex !== index && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditKeyword(index)}
                              disabled={!isCustom}
                              title={!isCustom ? "Built-in keywords cannot be edited" : "Edit keyword"}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteKeyword(index)}
                              disabled={!isCustom}
                              title={!isCustom ? "Built-in keywords cannot be deleted" : "Delete keyword"}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordExclusionManager;
