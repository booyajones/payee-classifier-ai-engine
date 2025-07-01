
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FileStatus {
  csvUrl?: string;
  excelUrl?: string;
  fileGeneratedAt?: string;
  fileSizeBytes?: number;
}

export const useFileStatus = (jobId?: string) => {
  const [fileStatus, setFileStatus] = useState<FileStatus>({});
  const [isChecking, setIsChecking] = useState(false);

  const checkFileStatus = async () => {
    if (!jobId) return;
    
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from('batch_jobs')
        .select('csv_file_url, excel_file_url, file_generated_at, file_size_bytes')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        setFileStatus({
          csvUrl: data.csv_file_url || undefined,
          excelUrl: data.excel_file_url || undefined,
          fileGeneratedAt: data.file_generated_at || undefined,
          fileSizeBytes: data.file_size_bytes || undefined
        });
      }
    } catch (error) {
      console.error('Error checking file status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      checkFileStatus();
    }
  }, [jobId]);

  const hasPreGeneratedFiles = Boolean(fileStatus.csvUrl && fileStatus.excelUrl);

  return {
    fileStatus,
    isChecking,
    checkFileStatus,
    hasPreGeneratedFiles
  };
};
