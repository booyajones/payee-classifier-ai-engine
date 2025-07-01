
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import {
  getBuiltInExclusionKeywords,
  clearCustomKeywordsCache
} from "@/lib/classification/keywordExclusion";
import { 
  addCustomExclusionKeyword,
  updateCustomExclusionKeyword,
  deleteCustomExclusionKeyword,
  getAllCustomExclusionKeywords,
  type ExclusionKeyword
} from "@/lib/database/exclusionKeywordService";
import { KEYWORD_EXCLUSION_CONFIG } from "@/lib/classification/config";
import KeywordTable from "./KeywordTable";
import KeywordActions from "./KeywordActions";
import KeywordStats from "./KeywordStats";
import KeywordTester from "./KeywordTester";

const KeywordExclusionManager = () => {
  const [comprehensiveKeywords, setComprehensiveKeywords] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState<ExclusionKeyword[]>([]);
  const [allKeywords, setAllKeywords] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
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

  const handleAddKeyword = async (keyword: string) => {
    // Check if keyword already exists in either list
    if (allKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
      toast({
        title: "Duplicate Keyword",
        description: "This keyword already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const result = await addCustomExclusionKeyword(keyword);
      
      if (result.success) {
        // Clear cache and reload keywords
        clearCustomKeywordsCache();
        await loadKeywords();
        
        toast({
          title: "Keyword Added",
          description: `"${keyword}" has been added to the exclusion list`,
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
        <CardContent className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>System Status:</strong> Keyword exclusions are {KEYWORD_EXCLUSION_CONFIG.enabled ? 'ENABLED' : 'DISABLED'} and 
              auto-apply is {KEYWORD_EXCLUSION_CONFIG.autoApply ? 'ON' : 'OFF'}. 
              Custom keywords are stored in the cloud database for persistence.
            </AlertDescription>
          </Alert>

          <KeywordActions
            saving={saving}
            onAddKeyword={handleAddKeyword}
            onResetToDefaults={resetToDefaults}
          />

          <KeywordStats
            comprehensiveKeywords={comprehensiveKeywords}
            customKeywords={customKeywords}
            allKeywords={allKeywords}
          />
        </CardContent>
      </Card>

      <KeywordTester allKeywords={allKeywords} />

      <Card>
        <CardHeader>
          <CardTitle>Current Exclusion Keywords</CardTitle>
          <CardDescription>
            Built-in keywords cannot be edited or deleted. Custom keywords can be modified or removed.
            Use the search and filter options to find specific keywords quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeywordTable
            allKeywords={allKeywords}
            comprehensiveKeywords={comprehensiveKeywords}
            customKeywords={customKeywords}
            editingIndex={editingIndex}
            editingValue={editingValue}
            saving={saving}
            onEdit={handleEditKeyword}
            onDelete={handleDeleteKeyword}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onEditingValueChange={setEditingValue}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordExclusionManager;
