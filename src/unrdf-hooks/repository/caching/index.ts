/**
 * @fileoverview Caching infrastructure for repository state
 *
 * Provides TTL-based caching for repository queries with automatic invalidation.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import type {
  RepositoryInfo,
  BranchInfo,
  WorkingDirectoryStatus,
} from '../types.js';

// ============================================================================
// Cache Data Structures
// ============================================================================

interface CachedRepositoryInfo {
  data: RepositoryInfo;
  timestamp: number;
  cwd: string;
}

interface CachedBranchInfo {
  data: BranchInfo;
  timestamp: number;
  cwd: string;
}

interface CachedWorkingDirectoryStatus {
  data: WorkingDirectoryStatus;
  timestamp: number;
  cwd: string;
  includeFiles: boolean;
}

// ============================================================================
// Cache TTLs
// ============================================================================

const REPO_INFO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BRANCH_INFO_CACHE_TTL = 30 * 1000; // 30 seconds
const STATUS_CACHE_TTL = 5 * 1000; // 5 seconds

// ============================================================================
// Cache Stores
// ============================================================================

const repoInfoCache = new Map<string, CachedRepositoryInfo>();
const branchInfoCache = new Map<string, CachedBranchInfo>();
const statusCache = new Map<string, CachedWorkingDirectoryStatus>();

// ============================================================================
// Repository Info Cache
// ============================================================================

/**
 * Get cached repository info or null if expired/missing
 */
export function getCachedRepoInfo(cwd: string): RepositoryInfo | null {
  const cached = repoInfoCache.get(cwd);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > REPO_INFO_CACHE_TTL) {
    repoInfoCache.delete(cwd);
    return null;
  }

  return cached.data;
}

/**
 * Cache repository info
 */
export function setCachedRepoInfo(cwd: string, data: RepositoryInfo): void {
  repoInfoCache.set(cwd, {
    data,
    timestamp: Date.now(),
    cwd,
  });
}

// ============================================================================
// Branch Info Cache
// ============================================================================

/**
 * Get cached branch info or null if expired/missing
 */
export function getCachedBranchInfo(cwd: string): BranchInfo | null {
  const cached = branchInfoCache.get(cwd);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > BRANCH_INFO_CACHE_TTL) {
    branchInfoCache.delete(cwd);
    return null;
  }

  return cached.data;
}

/**
 * Cache branch info
 */
export function setCachedBranchInfo(cwd: string, data: BranchInfo): void {
  branchInfoCache.set(cwd, {
    data,
    timestamp: Date.now(),
    cwd,
  });
}

// ============================================================================
// Status Cache
// ============================================================================

/**
 * Get cached status or null if expired/missing
 */
export function getCachedStatus(
  cwd: string,
  includeFiles: boolean,
): WorkingDirectoryStatus | null {
  const key = `${cwd}:${includeFiles}`;
  const cached = statusCache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > STATUS_CACHE_TTL) {
    statusCache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Cache status
 */
export function setCachedStatus(
  cwd: string,
  includeFiles: boolean,
  data: WorkingDirectoryStatus,
): void {
  const key = `${cwd}:${includeFiles}`;
  statusCache.set(key, {
    data,
    timestamp: Date.now(),
    cwd,
    includeFiles,
  });
}

// ============================================================================
// Cache Invalidation
// ============================================================================

/**
 * Invalidate all caches
 */
export function invalidateRepoInfoCache(cwd?: string): void {
  if (cwd) {
    repoInfoCache.delete(cwd);
    branchInfoCache.delete(cwd);
    // Clear status cache entries for this cwd
    for (const key of statusCache.keys()) {
      if (key.startsWith(cwd + ':')) {
        statusCache.delete(key);
      }
    }
  } else {
    repoInfoCache.clear();
    branchInfoCache.clear();
    statusCache.clear();
  }
}
