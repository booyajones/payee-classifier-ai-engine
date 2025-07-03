
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface DownloadState {
  id: string;
  filename: string;
  progress: number;
  stage: string;
  processed: number;
  total: number;
  isActive: boolean;
  canCancel: boolean;
  error?: string;
  startedAt: Date;
  estimatedTimeRemaining?: number;
}

interface DownloadProgressContextType {
  downloads: Record<string, DownloadState>;
  startDownload: (id: string, filename: string, total: number) => void;
  updateDownload: (id: string, updates: Partial<DownloadState>) => void;
  completeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  clearDownload: (id: string) => void;
  clearAllDownloads: () => void;
  getActiveDownloads: () => DownloadState[];
}

const DownloadProgressContext = createContext<DownloadProgressContextType | undefined>(undefined);

export const DownloadProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});

  const startDownload = useCallback((id: string, filename: string, total: number) => {
    productionLogger.debug(`[DOWNLOAD PROGRESS] Starting download: ${id}, filename: ${filename}, total: ${total}`);
    
    // Clear any existing download for this ID to prevent stale state
    setDownloads(prev => {
      const newDownloads = { ...prev };
      if (newDownloads[id]) {
        productionLogger.debug(`[DOWNLOAD PROGRESS] Clearing existing download state for ${id}`);
        delete newDownloads[id];
      }
      
      // Add the new download
      newDownloads[id] = {
        id,
        filename,
        progress: 0,
        stage: 'Initializing',
        processed: 0,
        total,
        isActive: true,
        canCancel: true,
        startedAt: new Date()
      };
      
      return newDownloads;
    });
  }, []);

  const updateDownload = useCallback((id: string, updates: Partial<DownloadState>) => {
    productionLogger.debug(`[DOWNLOAD PROGRESS] Updating download: ${id}`, updates);
    setDownloads(prev => {
      const current = prev[id];
      if (!current) {
        productionLogger.warn(`[DOWNLOAD PROGRESS] No download found for ID: ${id}`);
        return prev;
      }

      // Calculate estimated time remaining
      let estimatedTimeRemaining: number | undefined;
      if (updates.progress && updates.progress > 0) {
        const elapsed = Date.now() - current.startedAt.getTime();
        const rate = updates.progress / elapsed;
        estimatedTimeRemaining = rate > 0 ? (100 - updates.progress) / rate : undefined;
      }

      const newState = {
        ...prev,
        [id]: {
          ...current,
          ...updates,
          estimatedTimeRemaining
        }
      };
      
      productionLogger.debug(`[DOWNLOAD PROGRESS] Updated download state for ${id}:`, newState[id]);
      return newState;
    });
  }, []);

  const completeDownload = useCallback((id: string) => {
    productionLogger.debug(`[DOWNLOAD PROGRESS] Completing download: ${id}`);
    updateDownload(id, {
      progress: 100,
      stage: 'Complete',
      isActive: false,
      canCancel: false
    });

    // Auto-clear completed downloads after 10 seconds
    setTimeout(() => {
      productionLogger.debug(`[DOWNLOAD PROGRESS] Auto-clearing completed download: ${id}`);
      clearDownload(id);
    }, 10000);
  }, [updateDownload]);

  const cancelDownload = useCallback((id: string) => {
    updateDownload(id, {
      stage: 'Cancelled',
      isActive: false,
      canCancel: false,
      error: 'Download cancelled by user'
    });
  }, [updateDownload]);

  const clearDownload = useCallback((id: string) => {
    setDownloads(prev => {
      const newDownloads = { ...prev };
      delete newDownloads[id];
      return newDownloads;
    });
  }, []);

  const clearAllDownloads = useCallback(() => {
    productionLogger.debug(`[DOWNLOAD PROGRESS] Clearing all download states`);
    setDownloads({});
  }, []);

  const getActiveDownloads = useCallback(() => {
    return Object.values(downloads).filter(download => download.isActive);
  }, [downloads]);

  const value = {
    downloads,
    startDownload,
    updateDownload,
    completeDownload,
    cancelDownload,
    clearDownload,
    clearAllDownloads,
    getActiveDownloads
  };

  return (
    <DownloadProgressContext.Provider value={value}>
      {children}
    </DownloadProgressContext.Provider>
  );
};

export const useDownloadProgress = () => {
  const context = useContext(DownloadProgressContext);
  if (context === undefined) {
    throw new Error('useDownloadProgress must be used within a DownloadProgressProvider');
  }
  return context;
};
