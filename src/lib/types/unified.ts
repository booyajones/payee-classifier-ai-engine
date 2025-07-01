
// Unified type system for the entire application

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Classification types (consolidated from multiple files)
export interface ClassificationResult {
  classification: 'Personal' | 'Business';
  confidence: number;
  reasoning: string;
  processingTier: string;
  processingMethod: string;
  sicCode?: string;
  sicDescription?: string;
  keywordExclusion?: KeywordExclusionResult;
  matchingRules?: string[];
  similarityScores?: Record<string, number>;
}

export interface PayeeClassification extends BaseEntity {
  payeeName: string;
  result: ClassificationResult;
  originalData?: Record<string, any>;
  rowIndex?: number;
  batchId?: string;
}

export interface KeywordExclusionResult {
  isExcluded: boolean;
  matchedKeywords: string[];
  excludedCategories: string[];
  confidence: number;
}

// Batch processing types
export interface BatchProcessingResult {
  results: PayeeClassification[];
  successCount: number;
  failureCount: number;
  originalFileData: any[];
  summary?: BatchProcessingSummary;
}

export interface BatchProcessingSummary {
  totalProcessed: number;
  personalCount: number;
  businessCount: number;
  processingTimeMs: number;
  sicCodeAssignments: number;
  averageConfidence: number;
}

// File processing types
export interface FileProcessingInfo {
  fileName: string;
  totalRows: number;
  uniquePayees: number;
  selectedColumn: string;
  headers: string[];
  estimatedProcessingTime?: number;
}

export interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  stage: string;
  error?: string;
}

// Progress tracking types
export interface ProgressState {
  id: string;
  percentage: number;
  stage: string;
  isActive: boolean;
  startTime: Date;
  estimatedCompletion?: Date;
  jobId?: string;
  error?: string;
}

// Download types
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

// Configuration types
export interface ClassificationConfig {
  useAI: boolean;
  aiProvider: 'openai';
  model: string;
  temperature: number;
  maxTokens: number;
  enableKeywordExclusion: boolean;
  enableSICCodes: boolean;
  timeout: number;
  retryAttempts: number;
}

// API types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Memory and performance types
export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryPressure: 'low' | 'medium' | 'high';
}

export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: MemoryStats;
  throughput: number;
  errorRate: number;
}

// Error types
export interface AppError extends Error {
  code: string;
  context?: string;
  retryable: boolean;
  timestamp: Date;
  cause?: Error;
}
