
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PayeeClassification } from "@/lib/types";
import { downloadCSV, downloadJSON } from "@/lib/utils";

interface ExportButtonsProps {
  results: PayeeClassification[];
}

const ExportButtons = ({ results }: ExportButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => downloadCSV(results)}>
        <Download className="w-4 h-4 mr-2" /> Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => downloadJSON(results)}>
        <Download className="w-4 h-4 mr-2" /> Export JSON
      </Button>
    </div>
  );
};

export default ExportButtons;
