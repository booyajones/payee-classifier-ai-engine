
import { PayeeClassification } from '@/lib/types';

export interface CacheEntry {
  id: string;
  fileFingerprint: string;
  data: any;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

export class IntelligentCache {
  private static readonly DB_NAME = 'PayeeClassificationCache';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'cache_entries';
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly CLEANUP_THRESHOLD = 0.8; // 80% of max size

  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IntelligentCache.DB_NAME, IntelligentCache.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(IntelligentCache.STORE_NAME)) {
          const store = db.createObjectStore(IntelligentCache.STORE_NAME, { keyPath: 'id' });
          store.createIndex('fileFingerprint', 'fileFingerprint', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccess', 'lastAccess', { unique: false });
        }
      };
    });
  }

  async get(fileFingerprint: string): Promise<any | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IntelligentCache.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IntelligentCache.STORE_NAME);
      const index = store.index('fileFingerprint');
      const request = index.get(fileFingerprint);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry;
        
        if (entry) {
          // Update access statistics
          entry.accessCount++;
          entry.lastAccess = Date.now();
          store.put(entry);
          
          productionLogger.debug(`[CACHE] Hit for fingerprint: ${fileFingerprint}`);
          resolve(entry.data);
        } else {
          productionLogger.debug(`[CACHE] Miss for fingerprint: ${fileFingerprint}`);
          resolve(null);
        }
      };
    });
  }

  async set(fileFingerprint: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();

    const size = this.estimateSize(data);
    
    // Check if we need cleanup
    const currentSize = await this.getCurrentCacheSize();
    if (currentSize + size > IntelligentCache.MAX_CACHE_SIZE * IntelligentCache.CLEANUP_THRESHOLD) {
      await this.cleanup();
    }

    const entry: CacheEntry = {
      id: `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileFingerprint,
      data,
      timestamp: Date.now(),
      size,
      accessCount: 1,
      lastAccess: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IntelligentCache.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IntelligentCache.STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        productionLogger.debug(`[CACHE] Stored ${size} bytes for fingerprint: ${fileFingerprint}`);
        resolve();
      };
    });
  }

  async generateFileFingerprint(file: File): Promise<string> {
    const metadata = {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      type: file.type
    };

    // Read first and last 1KB for content fingerprinting
    const firstChunk = await this.readFileChunk(file, 0, 1024);
    const lastChunk = await this.readFileChunk(file, Math.max(0, file.size - 1024), 1024);

    const fingerprint = btoa(JSON.stringify({ metadata, firstChunk, lastChunk }));
    return fingerprint;
  }

  private async readFileChunk(file: File, start: number, length: number): Promise<string> {
    const chunk = file.slice(start, start + length);
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(chunk);
    });
  }

  private async getCurrentCacheSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IntelligentCache.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IntelligentCache.STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        resolve(totalSize);
      };
    });
  }

  private async cleanup(): Promise<void> {
    if (!this.db) return;

    productionLogger.debug('[CACHE] Starting intelligent cleanup');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IntelligentCache.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IntelligentCache.STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        
        // Sort by score (lower is better for removal)
        entries.sort((a, b) => {
          const scoreA = this.calculateRemovalScore(a);
          const scoreB = this.calculateRemovalScore(b);
          return scoreA - scoreB;
        });

        // Remove entries until we're under the threshold
        let currentSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        const targetSize = IntelligentCache.MAX_CACHE_SIZE * 0.5; // Clean to 50%
        
        let removedCount = 0;
        for (const entry of entries) {
          if (currentSize <= targetSize) break;
          
          store.delete(entry.id);
          currentSize -= entry.size;
          removedCount++;
        }

        productionLogger.debug(`[CACHE] Cleanup complete: removed ${removedCount} entries`);
        resolve();
      };
    });
  }

  private calculateRemovalScore(entry: CacheEntry): number {
    const now = Date.now();
    const ageHours = (now - entry.timestamp) / (1000 * 60 * 60);
    const timeSinceLastAccessHours = (now - entry.lastAccess) / (1000 * 60 * 60);
    
    // Lower score = higher priority for removal
    // Factors: age, time since last access, access count, size
    const ageScore = ageHours * 0.1;
    const accessScore = timeSinceLastAccessHours * 0.2;
    const usageScore = Math.max(1, entry.accessCount) * -0.1; // Negative because more usage = keep longer
    const sizeScore = entry.size / (1024 * 1024) * 0.05; // MB
    
    return ageScore + accessScore + usageScore + sizeScore;
  }

  private estimateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  async clear(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([IntelligentCache.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IntelligentCache.STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        productionLogger.debug('[CACHE] Cache cleared');
        resolve();
      };
    });
  }
}

export const intelligentCache = new IntelligentCache();
