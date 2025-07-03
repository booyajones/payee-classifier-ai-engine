
// @ts-nocheck
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

interface DownloadProgress {
  jobId: string;
  progress: number;
  stage: string;
  processed: number;
  total: number;
  isActive: boolean;
}

interface DownloadProgressContextType {
  downloads: Record<string, DownloadProgress>;
  startDownload: (jobId: string, filename: string, total: number) => void;
  updateDownload: (id: string, updates: Partial<DownloadState>) => void;
  updateProgress: (jobId: string, progress: number, stage: string, processed: number) => void;
  completeDownload: (jobId: string) => void;
  cancelDownload: (id: string) => void;
  clearDownload: (id: string) => void;
  clearAllDownloads: () => void;
  getActiveDownloads: () => DownloadProgress[];
}

const DownloadProgressContext = createContext<DownloadProgressContextType | undefined>(undefined);

export const DownloadProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<Record<string, DownloadProgress>>({});

  const startDownload = useCallback((jobId: string, filename: string, total: number) => {
    setDownloads((prev: any) => ({
      ...prev,
      [jobId]: {
        jobId,
        progress: 0,
        stage: 'Starting download...',
        processed: 0,
        total,
        isActive: true
      }
    }));
  }, []);

  const updateProgress = useCallback((jobId: string, progress: number, stage: string, processed: number) => {
    setDownloads((prev: any) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        progress,
        stage,
        processed,
        isActive: true
      }
    }));
  }, []);

  const completeDownload = useCallback((jobId: string) => {
    setDownloads((prev: any) => {
      const newDownloads = { ...prev };
      delete newDownloads[jobId];
      return newDownloads;
    });
  }, []);

  const updateDownload = useCallback((id: string, updates: Partial<DownloadState>) => {
    setDownloads((prev: any) => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  }, []);

  const cancelDownload = useCallback((id: string) => {
    setDownloads((prev: any) => ({
      ...prev,
      [id]: { ...prev[id], isActive: false, canCancel: false }
    }));
  }, []);

  const clearDownload = useCallback((id: string) => {
    setDownloads((prev: any) => {
      const newDownloads = { ...prev };
      delete newDownloads[id];
      return newDownloads;
    });
  }, []);

  const clearAllDownloads = useCallback(() => {
    setDownloads({});
  }, []);

  const getActiveDownloads = useCallback(() => {
    return Object.values(downloads).filter(download => download.isActive);
  }, [downloads]);

  return (
    <DownloadProgressContext.Provider value={{
      downloads,
      startDownload,
      updateDownload,
      updateProgress,
      completeDownload,
      cancelDownload,
      clearDownload,
      clearAllDownloads,
      getActiveDownloads
    }}>
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
