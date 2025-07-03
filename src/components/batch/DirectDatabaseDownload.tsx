import { useState } from 'react';
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
      // Get CSV file URL from batch_jobs table
      const { data: job, error: jobError } = await supabase
        .from('batch_jobs')
        .select('csv_file_url')
        .eq('id', jobId)
        .single();

      if (jobError || !job?.csv_file_url) {
        productionLogger.error('Failed to fetch batch job or CSV URL not found', jobError);
        throw new Error('CSV file not available for this job');
      }

      // Download from URL
      const response = await fetch(job.csv_file_url);
      if (!response.ok) {
        throw new Error('Failed to fetch CSV file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `complete_results_${jobId.substring(0, 8)}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Download Successful',
        description: '✅ Downloaded CSV file',
      });
      
    } catch (error) {
      productionLogger.error('[COMPLETE DOWNLOAD] Download failed:', error);
      
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
