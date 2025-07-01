
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ExclusionKeyword } from "@/lib/database/exclusionKeywordService";

interface KeywordTableProps {
  allKeywords: string[];
  comprehensiveKeywords: string[];
  customKeywords: ExclusionKeyword[];
  editingIndex: number | null;
  editingValue: string;
  saving: boolean;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingValueChange: (value: string) => void;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'keyword' | 'type';
type FilterType = 'all' | 'builtin' | 'custom';

const KeywordTable = ({
  allKeywords,
  comprehensiveKeywords,
  customKeywords,
  editingIndex,
  editingValue,
  saving,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditingValueChange,
}: KeywordTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const isCustomKeyword = (keyword: string): boolean => {
    return customKeywords.some(k => k.keyword === keyword && k.is_active);
  };

  const filteredAndSortedKeywords = useMemo(() => {
    let filtered = allKeywords.filter(keyword => {
      const matchesSearch = keyword.toLowerCase().includes(searchTerm.toLowerCase());
      const isCustom = isCustomKeyword(keyword);
      
      switch (filterType) {
        case 'builtin':
          return matchesSearch && !isCustom;
        case 'custom':
          return matchesSearch && isCustom;
        default:
          return matchesSearch;
      }
    });

    if (sortDirection && sortField) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'keyword') {
          comparison = a.localeCompare(b);
        } else if (sortField === 'type') {
          const aType = isCustomKeyword(a) ? 'custom' : 'builtin';
          const bType = isCustomKeyword(b) ? 'custom' : 'builtin';
          comparison = aType.localeCompare(bType);
        }
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filtered.map(keyword => ({
      keyword,
      originalIndex: allKeywords.indexOf(keyword),
      isCustom: isCustomKeyword(keyword)
    }));
  }, [allKeywords, searchTerm, sortField, sortDirection, filterType, customKeywords]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All ({allKeywords.length})
          </Button>
          <Button
            variant={filterType === 'builtin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('builtin')}
          >
            Built-in ({comprehensiveKeywords.length})
          </Button>
          <Button
            variant={filterType === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('custom')}
          >
            Custom ({customKeywords.filter(k => k.is_active).length})
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[60%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('keyword')}
                    className="h-auto p-0 font-medium"
                  >
                    Keyword
                    {getSortIcon('keyword')}
                  </Button>
                </TableHead>
                <TableHead className="w-[20%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('type')}
                    className="h-auto p-0 font-medium"
                  >
                    Type
                    {getSortIcon('type')}
                  </Button>
                </TableHead>
                <TableHead className="w-[20%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedKeywords.map(({ keyword, originalIndex, isCustom }) => (
                <TableRow key={`${keyword}-${originalIndex}`}>
                  <TableCell>
                    {editingIndex === originalIndex ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingValue}
                          onChange={(e) => onEditingValueChange(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') onSaveEdit();
                            if (e.key === 'Escape') onCancelEdit();
                          }}
                          autoFocus
                          disabled={saving}
                        />
                        <Button size="sm" onClick={onSaveEdit} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={onCancelEdit} disabled={saving}>
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
                    {editingIndex !== originalIndex && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(originalIndex)}
                          disabled={!isCustom || saving}
                          title={!isCustom ? "Built-in keywords cannot be edited" : "Edit keyword"}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(originalIndex)}
                          disabled={!isCustom || saving}
                          title={!isCustom ? "Built-in keywords cannot be deleted" : "Delete keyword"}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredAndSortedKeywords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No keywords found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedKeywords.length} of {allKeywords.length} keywords
      </div>
    </div>
  );
};

export default KeywordTable;
