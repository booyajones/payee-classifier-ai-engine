import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface ProgressState {
  stage: string;
  percentage: number;
  message?: string;
  jobId?: string;
  isActive: boolean;
  startedAt: Date;
  estimatedTimeRemaining?: number;
}

interface DownloadState {
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

interface ProgressStoreState {
  progressMap: Record<string, ProgressState>;
  downloads: Record<string, DownloadState>;
}

interface ProgressStoreActions {
  // Progress tracking
  updateProgress: (id: string, stage: string, percentage: number, message?: string, jobId?: string) => void;
  completeProgress: (id: string, message?: string) => void;
  clearProgress: (id: string) => void;
  clearAllProgress: () => void;
  getProgress: (id: string) => ProgressState | null;
  
  // Download tracking
  startDownload: (id: string, filename: string, total: number) => void;
  updateDownload: (id: string, updates: Partial<DownloadState>) => void;
  completeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  clearDownload: (id: string) => void;
  getActiveDownloads: () => DownloadState[];
}

export const useProgressStore = create<ProgressStoreState & ProgressStoreActions>()(
  subscribeWithSelector((set, get) => ({
    // State
    progressMap: {},
    downloads: {},

    // Progress tracking
    updateProgress: (id, stage, percentage, message, jobId) => {
      set((state) => ({
        progressMap: {
          ...state.progressMap,
          [id]: {
            stage,
            percentage: Math.max(0, Math.min(100, percentage)),
            message,
            jobId,
            isActive: percentage < 100,
            startedAt: state.progressMap[id]?.startedAt || new Date(),
          }
        }
      }));
    },

    completeProgress: (id, message) => {
      set((state) => ({
        progressMap: {
          ...state.progressMap,
          [id]: {
            ...state.progressMap[id],
            stage: 'Completed',
            percentage: 100,
            message: message || 'Complete',
            isActive: false,
          }
        }
      }));
    },

    clearProgress: (id) => {
      set((state) => ({
        progressMap: Object.fromEntries(
          Object.entries(state.progressMap).filter(([key]) => key !== id)
        )
      }));
    },

    clearAllProgress: () => set({ progressMap: {} }),

    getProgress: (id) => get().progressMap[id] || null,

    // Download tracking
    startDownload: (id, filename, total) => {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [id]: {
            id,
            filename,
            progress: 0,
            stage: 'Starting',
            processed: 0,
            total,
            isActive: true,
            canCancel: true,
            startedAt: new Date(),
          }
        }
      }));
    },

    updateDownload: (id, updates) => {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [id]: {
            ...state.downloads[id],
            ...updates,
          }
        }
      }));
    },

    completeDownload: (id) => {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [id]: {
            ...state.downloads[id],
            progress: 100,
            stage: 'Completed',
            isActive: false,
            canCancel: false,
          }
        }
      }));
    },

    cancelDownload: (id) => {
      set((state) => ({
        downloads: {
          ...state.downloads,
          [id]: {
            ...state.downloads[id],
            stage: 'Cancelled',
            isActive: false,
            canCancel: false,
          }
        }
      }));
    },

    clearDownload: (id) => {
      set((state) => ({
        downloads: Object.fromEntries(
          Object.entries(state.downloads).filter(([key]) => key !== id)
        )
      }));
    },

    getActiveDownloads: () => {
      return Object.values(get().downloads).filter(d => d.isActive);
    },
  }))
);
