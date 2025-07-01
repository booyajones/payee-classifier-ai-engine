
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logging/logger';

export class FileStorageUtils {
  private static context = 'FILE_STORAGE_UTILS';

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(
    bucket: string,
    fileName: string,
    blob: Blob,
    contentType: string
  ): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType,
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return {
        success: true,
        publicUrl: urlData.publicUrl
      };
    } catch (error) {
      logger.error(`Failed to upload file ${fileName}`, { error }, this.context);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Download file directly from storage URL
   */
  static async downloadFileFromStorage(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      logger.error('Failed to download file from storage', { url, error }, this.context);
      throw error;
    }
  }

  /**
   * Remove files from storage
   */
  static async removeFiles(bucket: string, fileNames: string[]): Promise<void> {
    try {
      await supabase.storage.from(bucket).remove(fileNames);
      logger.info(`Removed ${fileNames.length} files from ${bucket}`, { fileNames }, this.context);
    } catch (error) {
      logger.error(`Failed to remove files from ${bucket}`, { fileNames, error }, this.context);
      throw error;
    }
  }
}
