
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { BatchJob } from '@/lib/openai/trueBatchAPI';
import { PayeeRowData } from '@/lib/rowMapping';

interface DirectCSVExportProps {
  job: BatchJob;
  payeeData: PayeeRowData;
}

const DirectCSVExport = ({ job, payeeData }: DirectCSVExportProps) => {
  const { toast } = useToast();

  const handleDirectCSVExport = () => {
    try {
      console.log(`[DIRECT CSV] Exporting job ${job.id} with ${payeeData.originalFileData.length} rows`);
      
      if (!payeeData.originalFileData || payeeData.originalFileData.length === 0) {
        throw new Error('No original file data available for export');
      }

      // Get all column names from the first row
      const firstRow = payeeData.originalFileData[0];
      const originalColumns = Object.keys(firstRow);
      
      // Add classification columns that would be added by processing
      const classificationColumns = [
        'classification',
        'confidence',
        'processingTier',
        'reasoning',
        'processingMethod',
        'keywordExclusion',
        'matchedKeywords',
        'keywordConfidence',
        'keywordReasoning',
        'timestamp'
      ];
      
      const allColumns = [...originalColumns, ...classificationColumns];
      
      // Create CSV content
      const csvRows = [
        // Header row
        allColumns.map(col => `"${col}"`).join(','),
        // Data rows - original data with placeholder classification data
        ...payeeData.originalFileData.map(row => {
          const csvRow = [];
          
          // Add original data
          originalColumns.forEach(col => {
            const value = row[col] || '';
            csvRow.push(`"${String(value).replace(/"/g, '""')}"`);
          });
          
          // Add placeholder classification data (to be filled when results are downloaded)
          csvRow.push('"Pending"'); // classification
          csvRow.push('"0"'); // confidence
          csvRow.push('"AI-Powered"'); // processingTier
          csvRow.push('"Results pending download"'); // reasoning
          csvRow.push('"OpenAI Batch API"'); // processingMethod
          csvRow.push('"No"'); // keywordExclusion
          csvRow.push('""'); // matchedKeywords
          csvRow.push('"0"'); // keywordConfidence
          csvRow.push('"No keyword exclusion applied"'); // keywordReasoning
          csvRow.push(`"${new Date().toISOString()}"`); // timestamp
          
          return csvRow.join(',');
        })
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `payee_data_${job.id.slice(-8)}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "CSV Export Complete",
        description: `Exported ${payeeData.originalFileData.length} rows. Download results to get classification data.`,
      });
      
    } catch (error) {
      console.error('[DIRECT CSV] Export error:', error);
      toast({
        title: "Export Error",
        description: `Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="pl-4 border-l-2 border-muted">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
        <div className="text-sm">
          <p className="font-medium">Quick CSV Export</p>
          <p className="text-muted-foreground text-xs">
            Export original data immediately (classifications pending download)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDirectCSVExport}
        >
          <Download className="h-3 w-3 mr-1" />
          Export CSV
        </Button>
      </div>
    </div>
  );
};

export default DirectCSVExport;
