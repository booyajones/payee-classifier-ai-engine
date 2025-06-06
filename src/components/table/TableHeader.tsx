
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown } from "lucide-react";

interface Column {
  key: string;
  label: string;
  isOriginal: boolean;
}

interface TableHeaderProps {
  columns: Column[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}

const ClassificationTableHeader = ({ columns, sortField, sortDirection, onSort }: TableHeaderProps) => {
  const sortIcon = (field: string) => {
    if (field === sortField) {
      return sortDirection === 'asc' ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />;
    }
    return null;
  };

  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead 
            key={column.key} 
            className="cursor-pointer whitespace-nowrap min-w-[120px]" 
            onClick={() => onSort(column.key)}
          >
            <div className="flex items-center gap-1">
              {column.label} {sortIcon(column.key)}
              {column.isOriginal && (
                <span className="text-xs text-blue-600 font-normal">(Original)</span>
              )}
              {column.key.startsWith('keyword') && (
                <span className="text-xs text-orange-600 font-normal">(Exclusion)</span>
              )}
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
};

export default ClassificationTableHeader;
