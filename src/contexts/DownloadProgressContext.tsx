
// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';

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
  startDownload: (jobId: string, total: number) => void;
  updateProgress: (jobId: string, progress: number, stage: string, processed: number) => void;
  completeDownload: (jobId: string) => void;
  getActiveDownloads: () => DownloadProgress[];
}

const DownloadProgressContext = createContext<DownloadProgressContextType | undefined>(undefined);

export const DownloadProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<Record<string, DownloadProgress>>({});

  const startDownload = useCallback((jobId: string, total: number) => {
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

  const getActiveDownloads = useCallback(() => {
    return Object.values(downloads).filter(download => download.isActive);
  }, [downloads]);

  return (
    <DownloadProgressContext.Provider value={{
      downloads,
      startDownload,
      updateProgress,
      completeDownload,
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
