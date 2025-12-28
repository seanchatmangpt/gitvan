/**
 * @fileoverview GitVan v4 - Caching Hooks Module Index
 *
 * Exports all caching hooks and types.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// Export all types
export * from './types.js';

// Export all hooks
export {
  useCache,
  useQuery,
  useMutation,
  useCachedValue,
  useCacheStats,
  usePrefetch,
  useInvalidate,
  resetCache,
} from './hooks.js';
