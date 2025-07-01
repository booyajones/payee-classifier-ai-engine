
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash, Shield, TestTube, Loader2 } from "lucide-react";
import {
  getBuiltInExclusionKeywords,
  getCustomExclusionKeywords,
  checkKeywordExclusion,
  clearCustomKeywordsCache
} from "@/lib/classification/keywordExclusion";
import { 
  addCustomExclusionKeyword,
  updateCustomExclusionKeyword,
  deleteCustomExclusionKeyword,
  getAllCustomExclusionKeywords,
  type ExclusionKeyword
} from "@/lib/database/exclusionKeywordService";
import { checkKeywordExclusion as checkEnhancedKeywordExclusion } from "@/lib/classification/enhancedKeywordExclusion";
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
  const [comprehensiveKeywords, setComprehensiveKeywords] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState<ExclusionKeyword[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [testPayeeName, setTestPayeeName] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load keywords from database and built-in sources
  const loadKeywords = async () => {
    try {
      setLoading(true);
      
      // Load built-in keywords
      const comprehensive = getBuiltInExclusionKeywords();
      setComprehensiveKeywords(comprehensive);
      
      // Load custom keywords from database
      const custom = await getAllCustomExclusionKeywords();
      setCustomKeywords(custom);
      
      // Combine both lists for display and testing
      const customKeywordStrings = custom.filter(k => k.is_active).map(k => k.keyword);
      const combined = [...comprehensive, ...customKeywordStrings];
      setAllKeywords(combined);
      
      console.log(`[KEYWORD EXCLUSION MANAGER] Loaded ${comprehensive.length} comprehensive + ${customKeywordStrings.length} custom = ${combined.length} total keywords`);
    } catch (error) {
      console.error('Error loading keywords:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load exclusion keywords",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeywords();
  }, []);

  const handleAddKeyword = async () => {
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

    try {
      setSaving(true);
      const result = await addCustomExclusionKeyword(trimmedKeyword);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        setNewKeyword("");
        
        toast({
          title: "Keyword Added",
          description: `"${trimmedKeyword}" has been added to the exclusion list`,
        });
      } else {
        toast({
          title: "Failed to Add Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: "Failed to add keyword",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyword = (index: number) => {
    setEditingIndex(index);
    setEditingValue(allKeywords[index]);
  };

  const handleSaveEdit = async () => {
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
    
    // Find the custom keyword record
    const customKeyword = customKeywords.find(k => k.keyword === keywordToEdit);
    if (!customKeyword) {
      toast({
        title: "Keyword Not Found",
        description: "Could not find the keyword to edit",
        variant: "destructive",
      });
      setEditingIndex(null);
      setEditingValue("");
      return;
    }

    try {
      setSaving(true);
      const result = await updateCustomExclusionKeyword(customKeyword.id, trimmedValue);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        setEditingIndex(null);
        setEditingValue("");
        
        toast({
          title: "Keyword Updated",
          description: `Keyword has been updated to "${trimmedValue}"`,
        });
      } else {
        toast({
          title: "Failed to Update Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating keyword:', error);
      toast({
        title: "Error",
        description: "Failed to update keyword",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleDeleteKeyword = async (index: number) => {
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
    
    // Find the custom keyword record
    const customKeyword = customKeywords.find(k => k.keyword === keywordToDelete);
    if (!customKeyword) {
      toast({
        title: "Keyword Not Found",
        description: "Could not find the keyword to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const result = await deleteCustomExclusionKeyword(customKeyword.id);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        
        toast({
          title: "Keyword Deleted",
          description: `"${keywordToDelete}" has been removed from the exclusion list`,
        });
      } else {
        toast({
          title: "Failed to Delete Keyword",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast({
        title: "Error",
        description: "Failed to delete keyword",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      
      // Delete all custom keywords
      const deletePromises = customKeywords.map(keyword => 
        deleteCustomExclusionKeyword(keyword.id)
      );
      
      await Promise.all(deletePromises);
      
      // Clear cache and reload keywords
      clearCustomKeywordsCache();
      await loadKeywords();
      
      toast({
        title: "Reset Complete",
        description: "All custom keywords have been removed. Only built-in keywords remain.",
      });
    } catch (error) {
      console.error('Error resetting keywords:', error);
      toast({
        title: "Error",
        description: "Failed to reset keywords",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isCustomKeyword = (keyword: string): boolean => {
    return customKeywords.some(k => k.keyword === keyword && k.is_active);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading exclusion keywords...</span>
      </div>
    );
  }

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
            Custom keywords are stored in the cloud and synchronized across all sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>System Status:</strong> Keyword exclusions are {KEYWORD_EXCLUSION_CONFIG.enabled ? 'ENABLED' : 'DISABLED'} and 
              auto-apply is {KEYWORD_EXCLUSION_CONFIG.autoApply ? 'ON' : 'OFF'}. 
              Custom keywords are stored in the cloud database for persistence.
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
                disabled={saving}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddKeyword} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Clear All Custom Keywords
            </Button>
            <Button variant="outline" onClick={runFullTest}>
              <TestTube className="h-4 w-4 mr-2" />
              Run Test Suite
            </Button>
            <Badge variant="secondary">
              {comprehensiveKeywords.length} built-in keywords
            </Badge>
            <Badge variant="outline">
              {customKeywords.filter(k => k.is_active).length} custom keywords
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
                              disabled={saving}
                            />
                            <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={saving}>
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
                              disabled={!isCustom || saving}
                              title={!isCustom ? "Built-in keywords cannot be edited" : "Edit keyword"}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteKeyword(index)}
                              disabled={!isCustom || saving}
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
