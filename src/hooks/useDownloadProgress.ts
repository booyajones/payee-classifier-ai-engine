
import { useState } from "react";

export const useDownloadProgress = () => {
  const [downloadingJobs, setDownloadingJobs] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { current: number; total: number }>>({});
  const [cancelledDownloads, setCancelledDownloads] = useState<Set<string>>(new Set());

  const startDownload = (jobId: string) => {
    setDownloadingJobs(prev => new Set(prev).add(jobId));
    setCancelledDownloads(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
  };

  const updateProgress = (jobId: string, current: number, total: number) => {
    setDownloadProgress(prev => ({ ...prev, [jobId]: { current, total } }));
  };

  const finishDownload = (jobId: string) => {
    setDownloadingJobs(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
    setDownloadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[jobId];
      return newProgress;
    });
  };

  const cancelDownload = (jobId: string) => {
    setCancelledDownloads(prev => new Set(prev).add(jobId));
  };

  const isDownloadCancelled = (jobId: string) => {
    return cancelledDownloads.has(jobId);
  };

  return {
    downloadingJobs,
    downloadProgress,
    startDownload,
    updateProgress,
    finishDownload,
    cancelDownload,
    isDownloadCancelled
  };
};
