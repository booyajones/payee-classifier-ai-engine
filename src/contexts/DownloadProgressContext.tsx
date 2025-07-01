
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
  getActiveDownloads: () => DownloadState[];
}

const DownloadProgressContext = createContext<DownloadProgressContextType | undefined>(undefined);

export const DownloadProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});

  const startDownload = useCallback((id: string, filename: string, total: number) => {
    setDownloads(prev => ({
      ...prev,
      [id]: {
        id,
        filename,
        progress: 0,
        stage: 'Initializing',
        processed: 0,
        total,
        isActive: true,
        canCancel: true,
        startedAt: new Date()
      }
    }));
  }, []);

  const updateDownload = useCallback((id: string, updates: Partial<DownloadState>) => {
    setDownloads(prev => {
      const current = prev[id];
      if (!current) return prev;

      // Calculate estimated time remaining
      let estimatedTimeRemaining: number | undefined;
      if (updates.progress && updates.progress > 0) {
        const elapsed = Date.now() - current.startedAt.getTime();
        const rate = updates.progress / elapsed;
        estimatedTimeRemaining = rate > 0 ? (100 - updates.progress) / rate : undefined;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          ...updates,
          estimatedTimeRemaining
        }
      };
    });
  }, []);

  const completeDownload = useCallback((id: string) => {
    updateDownload(id, {
      progress: 100,
      stage: 'Complete',
      isActive: false,
      canCancel: false
    });

    // Auto-clear completed downloads after 10 seconds
    setTimeout(() => {
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
