import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  allKeywords: ExclusionKeyword[];
  editingIndex: number | null;
  editingValue: string;
  editingCategory: string;
  saving: boolean;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingValueChange: (value: string) => void;
  onEditingCategoryChange: (value: string) => void;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'keyword' | 'type' | 'category';

const KeywordTable = ({
  allKeywords,
  editingIndex,
  editingValue,
  editingCategory,
  saving,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditingValueChange,
  onEditingCategoryChange,
}: KeywordTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const categories = [...new Set(allKeywords.map(k => k.category))].sort();

  const filteredAndSortedKeywords = useMemo(() => {
    let filtered = allKeywords.filter(keyword => 
      keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortDirection && sortField) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'keyword') {
          comparison = a.keyword.localeCompare(b.keyword);
        } else if (sortField === 'type') {
          comparison = a.keyword_type.localeCompare(b.keyword_type);
        } else if (sortField === 'category') {
          comparison = a.category.localeCompare(b.category);
        }
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filtered.map((keyword, index) => ({
      ...keyword,
      displayIndex: index
    }));
  }, [allKeywords, searchTerm, sortField, sortDirection]);

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'builtin': return 'secondary';
      case 'custom': return 'default';
      case 'modified_builtin': return 'outline';
      default: return 'secondary';
    }
  };

  const getCategoryColor = (category: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: ("default" | "destructive" | "outline" | "secondary")[] = ['default', 'secondary', 'outline', 'destructive'];
    const index = categories.indexOf(category) % colors.length;
    return colors[index];
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
      </div>

      <div className="rounded-md border">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[40%]">
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
                <TableHead className="w-[20%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('category')}
                    className="h-auto p-0 font-medium"
                  >
                    Category
                    {getSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead className="w-[20%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedKeywords.map(({ displayIndex, keyword, keyword_type, category, id }) => (
                <TableRow key={`${id}-${displayIndex}`}>
                  <TableCell>
                    {editingIndex === displayIndex ? (
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
                    <Badge variant={getTypeColor(keyword_type)}>
                      {keyword_type === 'builtin' ? 'Built-in' : 
                       keyword_type === 'custom' ? 'Custom' : 
                       'Modified'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingIndex === displayIndex ? (
                      <Select value={editingCategory} onValueChange={onEditingCategoryChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getCategoryColor(category)}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex !== displayIndex && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(displayIndex)}
                          disabled={saving}
                          title="Edit keyword"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(displayIndex)}
                          disabled={saving}
                          title="Delete keyword"
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
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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