/**
 * @fileoverview GitVan v4 - Cache Hook Types
 *
 * Type definitions for caching hooks providing
 * efficient data caching and invalidation.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// ============================================================================
// Cache Entry Types
// ============================================================================

/**
 * Cache entry metadata
 */
export interface CacheEntryMeta {
  /** When the entry was created */
  readonly createdAt: Date;
  /** When the entry was last accessed */
  readonly accessedAt: Date;
  /** Number of times accessed */
  readonly accessCount: number;
  /** Size in bytes (estimated) */
  readonly size: number;
  /** Time to live in milliseconds */
  readonly ttl: number | null;
  /** Custom tags for invalidation */
  readonly tags: readonly string[];
}

/**
 * Cache entry with data and metadata
 */
export interface CacheEntry<T> {
  /** Cached data */
  readonly data: T;
  /** Entry metadata */
  readonly meta: CacheEntryMeta;
  /** Whether entry is still valid */
  readonly isValid: boolean;
}

/**
 * Cache key type
 */
export type CacheKey = string | readonly unknown[];

// ============================================================================
// Cache Configuration Types
// ============================================================================

/**
 * Cache eviction policy
 */
export type CacheEvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl';

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries */
  readonly maxSize?: number;
  /** Maximum memory in bytes */
  readonly maxMemory?: number;
  /** Default TTL in milliseconds */
  readonly defaultTtl?: number;
  /** Eviction policy */
  readonly evictionPolicy?: CacheEvictionPolicy;
  /** Enable persistence */
  readonly persist?: boolean;
  /** Persistence path */
  readonly persistPath?: string;
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Enable statistics tracking */
  readonly trackStats?: boolean;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  maxSize: 1000,
  maxMemory: 50 * 1024 * 1024, // 50MB
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  evictionPolicy: 'lru',
  persist: false,
  persistPath: '.cache',
  debug: false,
  trackStats: true,
} as const;

// ============================================================================
// Cache Operation Types
// ============================================================================

/**
 * Options for cache get operations
 */
export interface CacheGetOptions {
  /** Refresh TTL on access */
  readonly refreshTtl?: boolean;
  /** Fallback value if not found */
  readonly fallback?: unknown;
  /** Stale-while-revalidate duration */
  readonly staleWhileRevalidate?: number;
}

/**
 * Options for cache set operations
 */
export interface CacheSetOptions {
  /** Time to live in milliseconds */
  readonly ttl?: number;
  /** Tags for invalidation */
  readonly tags?: readonly string[];
  /** Priority (higher = less likely to evict) */
  readonly priority?: number;
  /** Custom metadata */
  readonly meta?: Record<string, unknown>;
}

/**
 * Options for cache invalidation
 */
export interface CacheInvalidateOptions {
  /** Invalidate by pattern (glob) */
  readonly pattern?: string;
  /** Invalidate by tags */
  readonly tags?: readonly string[];
  /** Invalidate older than timestamp */
  readonly olderThan?: Date;
  /** Cascade invalidation */
  readonly cascade?: boolean;
}

// ============================================================================
// Cache Statistics Types
// ============================================================================

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  readonly entries: number;
  /** Total size in bytes */
  readonly size: number;
  /** Number of cache hits */
  readonly hits: number;
  /** Number of cache misses */
  readonly misses: number;
  /** Hit rate percentage */
  readonly hitRate: number;
  /** Number of evictions */
  readonly evictions: number;
  /** Average entry age in milliseconds */
  readonly averageAge: number;
  /** Cache creation time */
  readonly createdAt: Date;
  /** Last operation time */
  readonly lastOperationAt: Date;
}

// ============================================================================
// Cache Query Types
// ============================================================================

/**
 * Query hook options for cached data fetching
 */
export interface UseQueryOptions<T> {
  /** Cache key */
  readonly key: CacheKey;
  /** Fetch function */
  readonly fetcher: () => Promise<T>;
  /** Time to live in milliseconds */
  readonly ttl?: number;
  /** Stale time in milliseconds */
  readonly staleTime?: number;
  /** Refetch on mount */
  readonly refetchOnMount?: boolean;
  /** Refetch on focus */
  readonly refetchOnFocus?: boolean;
  /** Refetch interval */
  readonly refetchInterval?: number;
  /** Retry count on error */
  readonly retry?: number;
  /** Retry delay in milliseconds */
  readonly retryDelay?: number;
  /** Enable query */
  readonly enabled?: boolean;
  /** Placeholder data while loading */
  readonly placeholderData?: T;
  /** Success callback */
  readonly onSuccess?: (data: T) => void;
  /** Error callback */
  readonly onError?: (error: Error) => void;
  /** Cache tags for invalidation */
  readonly tags?: readonly string[];
}

/**
 * Query hook result
 */
export interface UseQueryResult<T> {
  /** Query data */
  readonly data: T | undefined;
  /** Query error */
  readonly error: Error | null;
  /** Whether query is loading */
  readonly isLoading: boolean;
  /** Whether query is fetching (including background) */
  readonly isFetching: boolean;
  /** Whether data is from cache */
  readonly isStale: boolean;
  /** Whether query succeeded */
  readonly isSuccess: boolean;
  /** Whether query failed */
  readonly isError: boolean;
  /** Refetch function */
  readonly refetch: () => Promise<void>;
  /** Invalidate cache */
  readonly invalidate: () => void;
}

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Mutation hook options
 */
export interface UseMutationOptions<TData, TVariables> {
  /** Mutation function */
  readonly mutationFn: (variables: TVariables) => Promise<TData>;
  /** Invalidate queries on success */
  readonly invalidateQueries?: readonly CacheKey[];
  /** Optimistic update function */
  readonly onMutate?: (variables: TVariables) => Promise<unknown> | unknown;
  /** Success callback */
  readonly onSuccess?: (data: TData, variables: TVariables) => void;
  /** Error callback */
  readonly onError?: (error: Error, variables: TVariables, context: unknown) => void;
  /** Settled callback (success or error) */
  readonly onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  /** Retry count */
  readonly retry?: number;
}

/**
 * Mutation hook result
 */
export interface UseMutationResult<TData, TVariables> {
  /** Mutation data */
  readonly data: TData | undefined;
  /** Mutation error */
  readonly error: Error | null;
  /** Whether mutation is pending */
  readonly isPending: boolean;
  /** Whether mutation succeeded */
  readonly isSuccess: boolean;
  /** Whether mutation failed */
  readonly isError: boolean;
  /** Whether mutation is idle */
  readonly isIdle: boolean;
  /** Mutate function */
  readonly mutate: (variables: TVariables) => void;
  /** Async mutate function */
  readonly mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Reset mutation state */
  readonly reset: () => void;
}

// ============================================================================
// Cache Dependency Types
// ============================================================================

/**
 * Cache dependency definition
 */
export interface CacheDependency {
  /** Dependency key */
  readonly key: CacheKey;
  /** Invalidate when dependency changes */
  readonly invalidateOnChange: boolean;
  /** Cascade to dependents */
  readonly cascade: boolean;
}

/**
 * Cache entry with dependencies
 */
export interface CacheEntryWithDeps<T> extends CacheEntry<T> {
  /** Dependencies this entry depends on */
  readonly dependencies: readonly CacheKey[];
  /** Keys that depend on this entry */
  readonly dependents: readonly CacheKey[];
}
