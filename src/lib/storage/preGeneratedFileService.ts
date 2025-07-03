// Simple file service replacement
export class PreGeneratedFileService {
  static async downloadFileFromStorage(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let message = '';
        try {
          message = (await response.text()).trim();
        } catch {
          // ignore body read errors
        }
        if (!message) {
          message =
            response.status === 401 || response.status === 403
              ? 'Unauthorized download – check Supabase bucket permissions'
              : `Failed to download file: ${response.statusText}`;
        }
        throw new Error(message);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
}
