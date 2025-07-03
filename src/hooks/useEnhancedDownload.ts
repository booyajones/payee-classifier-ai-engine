import { BatchProcessingResult } from '@/lib/types';

export const useEnhancedDownload = () => {
  const downloadFile = async (data: BatchProcessingResult, format: 'csv' | 'excel') => {
    try {
      console.log(`Downloading ${format} file with data:`, data);
      
      // Simple fallback download implementation
      const filename = `results_${new Date().toISOString().split('T')[0]}.${format}`;
      const content = JSON.stringify(data, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Enhanced download failed:', error);
      throw error;
    }
  };

  return { downloadFile };
};
