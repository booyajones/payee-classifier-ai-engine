import React from 'react';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 100;

  constructor(private options: CacheOptions = {}) {}

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Cleanup old entries if cache is full
    if (this.cache.size >= (this.options.maxSize || this.maxSize)) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    // Delete expired entries
    toDelete.forEach(key => this.cache.delete(key));

    // If still too large, remove oldest entries
    if (this.cache.size >= (this.options.maxSize || this.maxSize)) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.cache.size * 0.3));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize || this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl
      }))
    };
  }
}

// Global cache instance
export const requestCache = new RequestCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100
});

// Cache decorator for functions
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  generateKey: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = generateKey(...args);
    
    // Try to get from cache first
    const cached = requestCache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    requestCache.set(key, result, ttl);
    
    return result;
  }) as T;
}

// React hook for cached requests
export function useCachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; enabled?: boolean } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (options.enabled === false) return;

    const fetchData = async () => {
      // Check cache first
      const cached = requestCache.get<T>(key);
      if (cached !== null) {
        setData(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        requestCache.set(key, result, options.ttl);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, options.enabled, options.ttl]);

  const invalidate = React.useCallback(() => {
    requestCache.invalidate(key);
    setData(null);
  }, [key]);

  return { data, loading, error, invalidate };
}