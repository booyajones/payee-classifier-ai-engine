import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DirectDatabaseDownloadProps {
  jobId: string;
  className?: string;
}

const DirectDatabaseDownload = ({ jobId, className }: DirectDatabaseDownloadProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!jobId) return;

    setIsDownloading(true);
    try {
      console.log(`[DIRECT DB DOWNLOAD] Fetching results for job ${jobId}`);
      
      // Fetch processed results directly from database
      const { data: results, error } = await supabase
        .from('payee_classifications')
        .select('*')
        .eq('batch_id', jobId)
        .order('payee_name');

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (!results || results.length === 0) {
        throw new Error('No results found for this job');
      }

      console.log(`[DIRECT DB DOWNLOAD] Found ${results.length} results, generating CSV`);

      // Create comprehensive CSV content
      const csvHeaders = [
        'payeeName', 'classification', 'confidence', 'sicCode', 'sicDescription', 
        'processingTier', 'reasoning', 'keywordExclusion', 'matchedKeywords',
        'originalData', 'isDuplicate', 'duplicateGroup'
      ];
      
      const csvHeader = csvHeaders.map(col => `"${col}"`).join(',') + '\n';
      const csvRows = results.map(result => {
        const keywordExclusion = (result.keyword_exclusion as any) || {};
        const originalData = result.original_data || {};
        
        return [
          result.payee_name || '',
          result.classification || '',
          result.confidence || '',
          result.sic_code || '',
          result.sic_description || '',
          result.processing_tier || '',
          result.reasoning || '',
          keywordExclusion.isExcluded ? 'Yes' : 'No',
          (keywordExclusion.matchedKeywords || []).join('; '),
          JSON.stringify(originalData),
          result.is_potential_duplicate ? 'Yes' : 'No',
          result.duplicate_group_id || ''
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `payee_classifications_${jobId.substring(0, 8)}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`[DIRECT DB DOWNLOAD] CSV file downloaded successfully`);
      
      toast({
        title: "Download Complete",
        description: `✅ Downloaded ${results.length} payee classifications to your Downloads folder.`,
      });
      
    } catch (error) {
      console.error('[DIRECT DB DOWNLOAD] Download failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isDownloading}
      className={className}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </>
      )}
    </Button>
  );
};

export default DirectDatabaseDownload;