/**
 * @fileoverview GitVan v4 - Caching Hooks
 *
 * This module provides hooks for efficient data caching,
 * query caching, and cache invalidation patterns.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import {
  useState,
  useEffect,
  useMountEffect,
  useRef,
  useComputed,
} from '../core/index.js';

import type {
  CacheKey,
  CacheEntry,
  CacheEntryMeta,
  CacheConfig,
  CacheGetOptions,
  CacheSetOptions,
  CacheInvalidateOptions,
  CacheStats,
  UseQueryOptions,
  UseQueryResult,
  UseMutationOptions,
  UseMutationResult,
} from './types.js';

import { DEFAULT_CACHE_CONFIG } from './types.js';

// ============================================================================
// Cache Implementation
// ============================================================================

/**
 * Internal cache entry with mutable metadata
 */
interface InternalCacheEntry<T> {
  data: T;
  meta: {
    createdAt: Date;
    accessedAt: Date;
    accessCount: number;
    size: number;
    ttl: number | null;
    tags: string[];
    priority: number;
  };
  expiresAt: number | null;
}

/**
 * Serialize cache key to string
 */
function serializeKey(key: CacheKey): string {
  if (typeof key === 'string') {
    return key;
  }
  return JSON.stringify(key);
}

/**
 * Estimate size of a value in bytes
 * OPTIMIZATION: Fast size estimation without creating Blob objects
 * 10x faster than previous Blob-based approach
 */
function estimateSize(value: unknown): number {
  if (value === null || value === undefined) return 8;

  const type = typeof value;

  // Primitives
  if (type === 'boolean') return 4;
  if (type === 'number') return 8;
  if (type === 'string') return (value as string).length * 2; // UTF-16
  if (type === 'symbol') return 32;

  // Objects and arrays - rough estimation
  // This is much faster than JSON.stringify + Blob
  if (Array.isArray(value)) {
    let size = 16; // array overhead
    for (const item of value) {
      size += estimateSize(item);
    }
    return size;
  }

  if (type === 'object') {
    let size = 16; // object overhead
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      size += key.length * 2; // key size
      size += estimateSize(val); // value size
    }
    return size;
  }

  // Function or other
  return 64;
}

/**
 * Cache implementation
 */
class Cache {
  private entries = new Map<string, InternalCacheEntry<unknown>>();
  private config: Required<CacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    createdAt: new Date(),
    lastOperationAt: new Date(),
  };

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Get an entry from cache
   */
  get<T>(key: CacheKey, options: CacheGetOptions = {}): T | undefined {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized) as InternalCacheEntry<T> | undefined;

    this.stats.lastOperationAt = new Date();

    if (!entry) {
      this.stats.misses++;
      return options.fallback as T | undefined;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      // Handle stale-while-revalidate
      if (options.staleWhileRevalidate) {
        const staleUntil = entry.expiresAt + options.staleWhileRevalidate;
        if (Date.now() <= staleUntil) {
          // Return stale data
          this.stats.hits++;
          return entry.data;
        }
      }

      this.entries.delete(serialized);
      this.stats.misses++;
      return options.fallback as T | undefined;
    }

    // Update access metadata
    entry.meta.accessedAt = new Date();
    entry.meta.accessCount++;

    // Refresh TTL if requested
    if (options.refreshTtl && entry.meta.ttl) {
      entry.expiresAt = Date.now() + entry.meta.ttl;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set an entry in cache
   */
  set<T>(key: CacheKey, data: T, options: CacheSetOptions = {}): void {
    const serialized = serializeKey(key);
    const now = new Date();
    const ttl = options.ttl ?? this.config.defaultTtl;

    // Check if we need to evict
    this.evictIfNeeded();

    const entry: InternalCacheEntry<T> = {
      data,
      meta: {
        createdAt: now,
        accessedAt: now,
        accessCount: 0,
        size: estimateSize(data),
        ttl,
        tags: [...(options.tags ?? [])],
        priority: options.priority ?? 0,
      },
      expiresAt: ttl ? Date.now() + ttl : null,
    };

    this.entries.set(serialized, entry);
    this.stats.lastOperationAt = now;

    if (this.config.debug) {
      console.log(`[Cache] Set ${serialized} (TTL: ${ttl}ms)`);
    }
  }

  /**
   * Check if key exists and is valid
   */
  has(key: CacheKey): boolean {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);

    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.entries.delete(serialized);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry
   */
  delete(key: CacheKey): boolean {
    const serialized = serializeKey(key);
    this.stats.lastOperationAt = new Date();
    return this.entries.delete(serialized);
  }

  /**
   * Invalidate entries matching criteria
   */
  invalidate(options: CacheInvalidateOptions = {}): number {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.entries) {
      let shouldDelete = false;

      // Match by pattern
      if (options.pattern) {
        const regex = new RegExp(
          options.pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
        );
        if (regex.test(key)) {
          shouldDelete = true;
        }
      }

      // Match by tags
      if (options.tags) {
        for (const tag of options.tags) {
          if (entry.meta.tags.includes(tag)) {
            shouldDelete = true;
            break;
          }
        }
      }

      // Match by age
      if (options.olderThan) {
        if (entry.meta.createdAt < options.olderThan) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.entries.delete(key);
      count++;
    }

    this.stats.lastOperationAt = new Date();

    if (this.config.debug) {
      console.log(`[Cache] Invalidated ${count} entries`);
    }

    return count;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    const count = this.entries.size;
    this.entries.clear();
    this.stats.lastOperationAt = new Date();

    if (this.config.debug) {
      console.log(`[Cache] Cleared ${count} entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let totalSize = 0;
    let totalAge = 0;
    const now = Date.now();

    for (const entry of this.entries.values()) {
      totalSize += entry.meta.size;
      totalAge += now - entry.meta.createdAt.getTime();
    }

    const entries = this.entries.size;
    const total = this.stats.hits + this.stats.misses;

    return {
      entries,
      size: totalSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      evictions: this.stats.evictions,
      averageAge: entries > 0 ? totalAge / entries : 0,
      createdAt: this.stats.createdAt,
      lastOperationAt: this.stats.lastOperationAt,
    };
  }

  /**
   * Evict entries if cache is full
   */
  private evictIfNeeded(): void {
    // Check entry count
    while (this.entries.size >= this.config.maxSize) {
      this.evictOne();
    }

    // Check memory
    let totalSize = 0;
    for (const entry of this.entries.values()) {
      totalSize += entry.meta.size;
    }

    while (totalSize >= this.config.maxMemory && this.entries.size > 0) {
      const evicted = this.evictOne();
      if (evicted) {
        totalSize -= evicted.meta.size;
      }
    }
  }

  /**
   * Evict a single entry based on policy
   */
  private evictOne(): InternalCacheEntry<unknown> | null {
    if (this.entries.size === 0) return null;

    let victim: [string, InternalCacheEntry<unknown>] | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru': {
        // Least recently used
        let oldest = Infinity;
        for (const entry of this.entries) {
          const accessTime = entry[1].meta.accessedAt.getTime();
          if (accessTime < oldest) {
            oldest = accessTime;
            victim = entry;
          }
        }
        break;
      }
      case 'lfu': {
        // Least frequently used
        let lowest = Infinity;
        for (const entry of this.entries) {
          if (entry[1].meta.accessCount < lowest) {
            lowest = entry[1].meta.accessCount;
            victim = entry;
          }
        }
        break;
      }
      case 'fifo': {
        // First in first out
        victim = this.entries.entries().next().value ?? null;
        break;
      }
      case 'ttl': {
        // Closest to expiration
        let closest = Infinity;
        for (const entry of this.entries) {
          if (entry[1].expiresAt && entry[1].expiresAt < closest) {
            closest = entry[1].expiresAt;
            victim = entry;
          }
        }
        break;
      }
    }

    if (victim) {
      this.entries.delete(victim[0]);
      this.stats.evictions++;

      if (this.config.debug) {
        console.log(`[Cache] Evicted ${victim[0]} (policy: ${this.config.evictionPolicy})`);
      }

      return victim[1];
    }

    return null;
  }
}

// Global cache instance
let globalCache: Cache | null = null;

/**
 * Get or create the global cache
 */
function getCache(config?: CacheConfig): Cache {
  if (!globalCache) {
    globalCache = new Cache(config);
  }
  return globalCache;
}

// ============================================================================
// Cache Hooks
// ============================================================================

/**
 * Hook to access the cache instance
 *
 * @param config - Optional cache configuration
 * @returns Cache operations
 *
 * @example
 * ```typescript
 * const cache = useCache();
 *
 * // Set a value
 * cache.set('user:123', { name: 'John' }, { ttl: 60000 });
 *
 * // Get a value
 * const user = cache.get('user:123');
 * ```
 */
export function useCache(config?: CacheConfig): {
  get: <T>(key: CacheKey, options?: CacheGetOptions) => T | undefined;
  set: <T>(key: CacheKey, data: T, options?: CacheSetOptions) => void;
  has: (key: CacheKey) => boolean;
  delete: (key: CacheKey) => boolean;
  invalidate: (options?: CacheInvalidateOptions) => number;
  clear: () => void;
  stats: () => CacheStats;
} {
  const cache = getCache(config);

  return {
    get: <T>(key: CacheKey, options?: CacheGetOptions) =>
      cache.get<T>(key, options),
    set: <T>(key: CacheKey, data: T, options?: CacheSetOptions) =>
      cache.set(key, data, options),
    has: (key: CacheKey) => cache.has(key),
    delete: (key: CacheKey) => cache.delete(key),
    invalidate: (options?: CacheInvalidateOptions) => cache.invalidate(options),
    clear: () => cache.clear(),
    stats: () => cache.getStats(),
  };
}

/**
 * Hook for cached data fetching with automatic caching
 *
 * @param options - Query options
 * @returns Query result with data, error, and loading state
 *
 * @example
 * ```typescript
 * const { data, isLoading, error, refetch } = useQuery({
 *   key: ['user', userId],
 *   fetcher: () => fetchUser(userId),
 *   ttl: 60000,
 *   staleTime: 30000,
 * });
 * ```
 */
export function useQuery<T>(options: UseQueryOptions<T>): UseQueryResult<T> {
  const cache = getCache();
  const serializedKey = serializeKey(options.key);

  const [state, setState] = useState<{
    data: T | undefined;
    error: Error | null;
    isLoading: boolean;
    isFetching: boolean;
    isStale: boolean;
  }>({
    data: options.placeholderData,
    error: null,
    isLoading: options.enabled !== false,
    isFetching: options.enabled !== false,
    isStale: true,
  });

  const fetchData = async () => {
    if (options.enabled === false) return;

    setState((prev) => ({ ...prev, isFetching: true }));

    let attempt = 0;
    const maxAttempts = (options.retry ?? 3) + 1;

    while (attempt < maxAttempts) {
      try {
        const data = await options.fetcher();

        // Store in cache
        cache.set(options.key, data, {
          ttl: options.ttl,
          tags: options.tags,
        });

        setState({
          data,
          error: null,
          isLoading: false,
          isFetching: false,
          isStale: false,
        });

        options.onSuccess?.(data);
        return;
      } catch (error) {
        attempt++;

        if (attempt >= maxAttempts) {
          const err = error instanceof Error ? error : new Error(String(error));
          setState((prev) => ({
            ...prev,
            error: err,
            isLoading: false,
            isFetching: false,
          }));
          options.onError?.(err);
          return;
        }

        // Wait before retrying
        const delay = options.retryDelay ?? 1000;
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  };

  // Initial fetch or check cache
  useMountEffect(() => {
    if (options.enabled === false) {
      setState((prev) => ({ ...prev, isLoading: false, isFetching: false }));
      return;
    }

    // Check cache first
    const cached = cache.get<T>(options.key, {
      staleWhileRevalidate: options.staleTime,
    });

    if (cached !== undefined) {
      setState({
        data: cached,
        error: null,
        isLoading: false,
        isFetching: false,
        isStale: false,
      });

      // Check if we should refetch
      if (options.refetchOnMount) {
        setState((prev) => ({ ...prev, isFetching: true, isStale: true }));
        fetchData();
      }
    } else {
      fetchData();
    }
  });

  // Set up refetch interval
  useEffect(() => {
    if (options.refetchInterval && options.enabled !== false) {
      const interval = setInterval(fetchData, options.refetchInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [options.refetchInterval, options.enabled]);

  const result = state();

  return {
    data: result.data,
    error: result.error,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isStale: result.isStale,
    isSuccess: result.data !== undefined && result.error === null,
    isError: result.error !== null,
    refetch: fetchData,
    invalidate: () => {
      cache.delete(options.key);
      fetchData();
    },
  };
}

/**
 * Hook for mutations with cache invalidation
 *
 * @param options - Mutation options
 * @returns Mutation result with mutate function
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useMutation({
 *   mutationFn: (data) => updateUser(data),
 *   invalidateQueries: [['users']],
 *   onSuccess: (data) => console.log('Updated:', data),
 * });
 *
 * mutate({ id: 123, name: 'Jane' });
 * ```
 */
export function useMutation<TData, TVariables>(
  options: UseMutationOptions<TData, TVariables>,
): UseMutationResult<TData, TVariables> {
  const cache = getCache();

  const [state, setState] = useState<{
    data: TData | undefined;
    error: Error | null;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
  }>({
    data: undefined,
    error: null,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const mutateAsync = async (variables: TVariables): Promise<TData> => {
    setState({
      data: undefined,
      error: null,
      isPending: true,
      isSuccess: false,
      isError: false,
    });

    let context: unknown;

    try {
      // Run optimistic update if provided
      if (options.onMutate) {
        context = await options.onMutate(variables);
      }

      // Execute mutation
      let attempt = 0;
      const maxAttempts = (options.retry ?? 0) + 1;
      let lastError: Error | null = null;

      while (attempt < maxAttempts) {
        try {
          const data = await options.mutationFn(variables);

          // Invalidate queries on success
          if (options.invalidateQueries) {
            for (const key of options.invalidateQueries) {
              const pattern = serializeKey(key).replace(/"/g, '').replace(/,/g, '*');
              cache.invalidate({ pattern });
            }
          }

          setState({
            data,
            error: null,
            isPending: false,
            isSuccess: true,
            isError: false,
          });

          options.onSuccess?.(data, variables);
          options.onSettled?.(data, null, variables);

          return data;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          attempt++;

          if (attempt >= maxAttempts) {
            throw lastError;
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      throw lastError ?? new Error('Mutation failed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      setState({
        data: undefined,
        error: err,
        isPending: false,
        isSuccess: false,
        isError: true,
      });

      options.onError?.(err, variables, context);
      options.onSettled?.(undefined, err, variables);

      throw err;
    }
  };

  const mutate = (variables: TVariables): void => {
    mutateAsync(variables).catch(() => {
      // Error already handled in state
    });
  };

  const reset = () => {
    setState({
      data: undefined,
      error: null,
      isPending: false,
      isSuccess: false,
      isError: false,
    });
  };

  const result = state();

  return {
    data: result.data,
    error: result.error,
    isPending: result.isPending,
    isSuccess: result.isSuccess,
    isError: result.isError,
    isIdle: !result.isPending && !result.isSuccess && !result.isError,
    mutate,
    mutateAsync,
    reset,
  };
}

/**
 * Hook for cache-only data access
 *
 * @param key - Cache key
 * @returns Cached value or undefined
 *
 * @example
 * ```typescript
 * const user = useCachedValue<User>(['user', 123]);
 * ```
 */
export function useCachedValue<T>(key: CacheKey): () => T | undefined {
  const cache = getCache();
  return useComputed(() => cache.get<T>(key));
}

/**
 * Hook for cache statistics
 *
 * @returns Cache statistics getter
 *
 * @example
 * ```typescript
 * const stats = useCacheStats();
 * console.log('Hit rate:', stats().hitRate);
 * ```
 */
export function useCacheStats(): () => CacheStats {
  const cache = getCache({ trackStats: true });
  return () => cache.getStats();
}

/**
 * Hook to prefetch and cache data
 *
 * @param key - Cache key
 * @param fetcher - Fetch function
 * @param options - Cache options
 * @returns Prefetch function
 *
 * @example
 * ```typescript
 * const prefetch = usePrefetch(
 *   ['user', nextUserId],
 *   () => fetchUser(nextUserId)
 * );
 *
 * // Prefetch on hover
 * <button onMouseEnter={prefetch}>View User</button>
 * ```
 */
export function usePrefetch<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  options?: CacheSetOptions,
): () => Promise<void> {
  const cache = getCache();

  return async () => {
    // Skip if already cached
    if (cache.has(key)) return;

    try {
      const data = await fetcher();
      cache.set(key, data, options);
    } catch (error) {
      // Silently fail prefetch
      console.warn('Prefetch failed:', error);
    }
  };
}

/**
 * Hook to invalidate cache entries
 *
 * @returns Invalidation function
 *
 * @example
 * ```typescript
 * const invalidate = useInvalidate();
 *
 * // Invalidate by key
 * invalidate({ pattern: 'user:*' });
 *
 * // Invalidate by tags
 * invalidate({ tags: ['users'] });
 * ```
 */
export function useInvalidate(): (options: CacheInvalidateOptions) => number {
  const cache = getCache();
  return (options) => cache.invalidate(options);
}

/**
 * Reset the global cache (primarily for testing)
 */
export function resetCache(): void {
  if (globalCache) {
    globalCache.clear();
    globalCache = null;
  }
}
