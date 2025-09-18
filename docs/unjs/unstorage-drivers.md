# GitVan Unstorage Drivers Guide

## Overview

This guide details the implementation of custom unstorage drivers for GitVan that leverage Git's native storage capabilities. These drivers replace traditional filesystem-based storage with Git-native solutions that align with GitVan's philosophy of treating everything as code.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Git Storage Drivers](#git-storage-drivers)
3. [Lock Storage Driver](#lock-storage-driver)
4. [Receipt Storage Driver](#receipt-storage-driver)
5. [Cache Storage Driver](#cache-storage-driver)
6. [Multi-Driver Mounting Strategy](#multi-driver-mounting-strategy)
7. [Performance Optimizations](#performance-optimizations)
8. [Migration Strategy](#migration-strategy)
9. [Implementation Examples](#implementation-examples)

## Architecture Overview

GitVan's storage architecture leverages Git's native capabilities through specialized unstorage drivers:

```
GitVan Storage Layer
├── git-notes (receipts, metadata)
├── git-refs (locks, state)
├── git-objects (content, cache)
├── memory (hot cache)
└── fs (fallback)
```

### Core Principles

- **Git-Native**: All storage operations use Git primitives
- **Atomic**: Leverage Git's atomic reference updates
- **Distributed**: Natural replication through Git remotes
- **Versioned**: Automatic history tracking
- **Conflict-Free**: CRDT-like semantics for concurrent updates

## Git Storage Drivers

### 1. Git Notes Driver

Stores metadata and receipts as Git notes, providing version history and distributed synchronization.

```typescript
// drivers/git-notes.ts
import { defineDriver } from 'unstorage'
import { execSync } from 'child_process'
import { createHash } from 'crypto'

export interface GitNotesOptions {
  ref?: string
  namespace?: string
  workingDir?: string
}

export default defineDriver((opts: GitNotesOptions = {}) => {
  const ref = opts.ref || 'refs/notes/gitvan'
  const namespace = opts.namespace || 'default'
  const workingDir = opts.workingDir || process.cwd()

  const execGit = (command: string): string => {
    try {
      return execSync(`git ${command}`, {
        cwd: workingDir,
        encoding: 'utf8'
      }).trim()
    } catch (error) {
      if (error.status === 1) return '' // Not found
      throw error
    }
  }

  const keyToCommit = (key: string): string => {
    // Use content-addressable hashing for key mapping
    return createHash('sha1').update(`${namespace}:${key}`).digest('hex')
  }

  return {
    name: 'git-notes',

    async hasItem(key: string): Promise<boolean> {
      const commit = keyToCommit(key)
      const result = execGit(`notes --ref=${ref} show ${commit} 2>/dev/null`)
      return result.length > 0
    },

    async getItem(key: string): Promise<string | null> {
      const commit = keyToCommit(key)
      const content = execGit(`notes --ref=${ref} show ${commit} 2>/dev/null`)

      if (!content) return null

      try {
        const parsed = JSON.parse(content)
        return parsed.value || null
      } catch {
        return content
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      const commit = keyToCommit(key)
      const metadata = {
        key,
        value,
        timestamp: Date.now(),
        namespace
      }

      // Create a temporary file for the note content
      const tempFile = `/tmp/gitvan-note-${Date.now()}`
      require('fs').writeFileSync(tempFile, JSON.stringify(metadata, null, 2))

      try {
        execGit(`notes --ref=${ref} add -f -F ${tempFile} ${commit}`)
      } finally {
        require('fs').unlinkSync(tempFile)
      }
    },

    async removeItem(key: string): Promise<void> {
      const commit = keyToCommit(key)
      execGit(`notes --ref=${ref} remove ${commit} 2>/dev/null || true`)
    },

    async getKeys(): Promise<string[]> {
      const notes = execGit(`notes --ref=${ref} list 2>/dev/null`)
      if (!notes) return []

      const keys: string[] = []
      for (const line of notes.split('\n')) {
        if (!line.trim()) continue

        const [noteRef, commit] = line.split(' ')
        const content = execGit(`notes --ref=${ref} show ${commit} 2>/dev/null`)

        try {
          const parsed = JSON.parse(content)
          if (parsed.namespace === namespace) {
            keys.push(parsed.key)
          }
        } catch {
          // Skip malformed notes
        }
      }

      return keys
    },

    async clear(): Promise<void> {
      const keys = await this.getKeys()
      for (const key of keys) {
        await this.removeItem(key)
      }
    }
  }
})
```

### 2. Git Refs Driver

Uses Git references for atomic state updates and distributed locking.

```typescript
// drivers/git-refs.ts
import { defineDriver } from 'unstorage'
import { execSync } from 'child_process'

export interface GitRefsOptions {
  prefix?: string
  workingDir?: string
}

export default defineDriver((opts: GitRefsOptions = {}) => {
  const prefix = opts.prefix || 'refs/gitvan'
  const workingDir = opts.workingDir || process.cwd()

  const execGit = (command: string): string => {
    try {
      return execSync(`git ${command}`, {
        cwd: workingDir,
        encoding: 'utf8'
      }).trim()
    } catch (error) {
      if (error.status === 1) return ''
      throw error
    }
  }

  const keyToRef = (key: string): string => {
    return `${prefix}/${key.replace(/[^a-zA-Z0-9/_-]/g, '_')}`
  }

  return {
    name: 'git-refs',

    async hasItem(key: string): Promise<boolean> {
      const ref = keyToRef(key)
      const result = execGit(`show-ref --verify ${ref} 2>/dev/null`)
      return result.length > 0
    },

    async getItem(key: string): Promise<string | null> {
      const ref = keyToRef(key)
      const sha = execGit(`rev-parse ${ref} 2>/dev/null`)

      if (!sha) return null

      // Get the content from the commit
      const content = execGit(`cat-file -p ${sha}`)
      return content || null
    },

    async setItem(key: string, value: string): Promise<void> {
      const ref = keyToRef(key)

      // Create a blob for the value
      const blobSha = execGit(`hash-object -w --stdin <<< '${value}'`)

      // Create a tree with the blob
      const treeSha = execGit(`mktree <<< '100644 blob ${blobSha}\tvalue'`)

      // Create a commit
      const commitSha = execGit(`commit-tree ${treeSha} -m "Update ${key}"`)

      // Update the reference atomically
      execGit(`update-ref ${ref} ${commitSha}`)
    },

    async removeItem(key: string): Promise<void> {
      const ref = keyToRef(key)
      execGit(`update-ref -d ${ref} 2>/dev/null || true`)
    },

    async getKeys(): Promise<string[]> {
      const refs = execGit(`for-each-ref --format='%(refname)' ${prefix}/ 2>/dev/null`)
      if (!refs) return []

      return refs.split('\n')
        .filter(ref => ref.startsWith(`${prefix}/`))
        .map(ref => ref.replace(`${prefix}/`, '').replace(/_/g, '/'))
    },

    async clear(): Promise<void> {
      const keys = await this.getKeys()
      for (const key of keys) {
        await this.removeItem(key)
      }
    }
  }
})
```

### 3. Git Objects Driver

Stores content directly as Git objects with content-addressable access.

```typescript
// drivers/git-objects.ts
import { defineDriver } from 'unstorage'
import { execSync } from 'child_process'
import { createHash } from 'crypto'

export interface GitObjectsOptions {
  compression?: boolean
  workingDir?: string
}

export default defineDriver((opts: GitObjectsOptions = {}) => {
  const compression = opts.compression ?? true
  const workingDir = opts.workingDir || process.cwd()

  const execGit = (command: string): string => {
    try {
      return execSync(`git ${command}`, {
        cwd: workingDir,
        encoding: 'utf8'
      }).trim()
    } catch (error) {
      if (error.status === 1) return ''
      throw error
    }
  }

  const keyToSha = (key: string): string => {
    // Create deterministic SHA from key
    return createHash('sha1').update(`blob ${key.length}\0${key}`).digest('hex')
  }

  return {
    name: 'git-objects',

    async hasItem(key: string): Promise<boolean> {
      const sha = keyToSha(key)
      const result = execGit(`cat-file -e ${sha} 2>/dev/null && echo exists`)
      return result === 'exists'
    },

    async getItem(key: string): Promise<string | null> {
      const sha = keyToSha(key)
      const content = execGit(`cat-file -p ${sha} 2>/dev/null`)
      return content || null
    },

    async setItem(key: string, value: string): Promise<void> {
      // Hash the content as a Git object
      const sha = execGit(`hash-object -w --stdin <<< '${value}'`)

      // Store key -> SHA mapping in refs for lookup
      execGit(`update-ref refs/gitvan/objects/${key} ${sha}`)
    },

    async removeItem(key: string): Promise<void> {
      execGit(`update-ref -d refs/gitvan/objects/${key} 2>/dev/null || true`)
    },

    async getKeys(): Promise<string[]> {
      const refs = execGit(`for-each-ref --format='%(refname:short)' refs/gitvan/objects/ 2>/dev/null`)
      if (!refs) return []

      return refs.split('\n')
        .filter(ref => ref.startsWith('gitvan/objects/'))
        .map(ref => ref.replace('gitvan/objects/', ''))
    },

    async clear(): Promise<void> {
      execGit(`for-each-ref --format='%(refname)' refs/gitvan/objects/ | xargs -r git update-ref -d`)
    }
  }
})
```

## Lock Storage Driver

Implements distributed locking using atomic Git reference updates.

```typescript
// drivers/lock-storage.ts
import { defineDriver } from 'unstorage'
import gitRefsDriver from './git-refs'

export interface LockOptions {
  ttl?: number // Time-to-live in milliseconds
  workingDir?: string
}

export interface LockInfo {
  owner: string
  acquired: number
  ttl: number
  process: string
}

export default defineDriver((opts: LockOptions = {}) => {
  const baseDriver = gitRefsDriver({
    prefix: 'refs/gitvan/locks',
    workingDir: opts.workingDir
  })

  const ttl = opts.ttl || 30000 // 30 seconds default

  const createLockInfo = (owner: string): LockInfo => ({
    owner,
    acquired: Date.now(),
    ttl,
    process: `${process.pid}@${require('os').hostname()}`
  })

  const isLockExpired = (lockInfo: LockInfo): boolean => {
    return Date.now() > lockInfo.acquired + lockInfo.ttl
  }

  return {
    name: 'lock-storage',

    async acquireLock(key: string, owner: string): Promise<boolean> {
      try {
        // Check if lock already exists
        const existing = await baseDriver.getItem(key)
        if (existing) {
          const lockInfo: LockInfo = JSON.parse(existing)

          // Check if lock is expired
          if (!isLockExpired(lockInfo)) {
            return lockInfo.owner === owner // Already owned by this owner
          }
        }

        // Attempt to acquire lock atomically
        const lockInfo = createLockInfo(owner)
        await baseDriver.setItem(key, JSON.stringify(lockInfo))

        // Verify we actually got the lock (handle race conditions)
        const verified = await baseDriver.getItem(key)
        if (verified) {
          const verifiedInfo: LockInfo = JSON.parse(verified)
          return verifiedInfo.owner === owner &&
                 verifiedInfo.acquired === lockInfo.acquired
        }

        return false
      } catch (error) {
        return false
      }
    },

    async releaseLock(key: string, owner: string): Promise<boolean> {
      try {
        const existing = await baseDriver.getItem(key)
        if (!existing) return true // Already released

        const lockInfo: LockInfo = JSON.parse(existing)

        // Only allow owner to release
        if (lockInfo.owner !== owner) {
          return false
        }

        await baseDriver.removeItem(key)
        return true
      } catch (error) {
        return false
      }
    },

    async isLocked(key: string): Promise<boolean> {
      const existing = await baseDriver.getItem(key)
      if (!existing) return false

      const lockInfo: LockInfo = JSON.parse(existing)
      return !isLockExpired(lockInfo)
    },

    async getLockInfo(key: string): Promise<LockInfo | null> {
      const existing = await baseDriver.getItem(key)
      if (!existing) return null

      const lockInfo: LockInfo = JSON.parse(existing)
      return isLockExpired(lockInfo) ? null : lockInfo
    },

    async renewLock(key: string, owner: string): Promise<boolean> {
      try {
        const existing = await baseDriver.getItem(key)
        if (!existing) return false

        const lockInfo: LockInfo = JSON.parse(existing)

        if (lockInfo.owner !== owner) {
          return false
        }

        // Renew the lock
        const renewed = createLockInfo(owner)
        await baseDriver.setItem(key, JSON.stringify(renewed))
        return true
      } catch (error) {
        return false
      }
    },

    // Cleanup expired locks
    async cleanup(): Promise<void> {
      const keys = await baseDriver.getKeys()

      for (const key of keys) {
        const lockInfo = await this.getLockInfo(key)
        if (!lockInfo) {
          // Lock is expired, remove it
          await baseDriver.removeItem(key)
        }
      }
    }
  }
})
```

## Receipt Storage Driver

Specialized driver for storing execution receipts using Git notes.

```typescript
// drivers/receipt-storage.ts
import { defineDriver } from 'unstorage'
import gitNotesDriver from './git-notes'

export interface Receipt {
  id: string
  command: string
  timestamp: number
  duration: number
  exitCode: number
  output: string
  error?: string
  metadata: Record<string, any>
}

export interface ReceiptStorageOptions {
  workingDir?: string
  compression?: boolean
}

export default defineDriver((opts: ReceiptStorageOptions = {}) => {
  const baseDriver = gitNotesDriver({
    ref: 'refs/notes/gitvan/receipts',
    namespace: 'receipts',
    workingDir: opts.workingDir
  })

  const compress = opts.compression ?? true

  const compressData = (data: string): string => {
    if (!compress) return data
    return require('zlib').gzipSync(data).toString('base64')
  }

  const decompressData = (data: string): string => {
    if (!compress) return data
    try {
      return require('zlib').gunzipSync(Buffer.from(data, 'base64')).toString()
    } catch {
      return data // Fallback for uncompressed data
    }
  }

  return {
    name: 'receipt-storage',

    async storeReceipt(receipt: Receipt): Promise<void> {
      const compressed = compressData(JSON.stringify(receipt))
      await baseDriver.setItem(receipt.id, compressed)
    },

    async getReceipt(id: string): Promise<Receipt | null> {
      const data = await baseDriver.getItem(id)
      if (!data) return null

      try {
        const decompressed = decompressData(data)
        return JSON.parse(decompressed)
      } catch (error) {
        console.warn(`Failed to parse receipt ${id}:`, error)
        return null
      }
    },

    async findReceipts(filter: Partial<Receipt>): Promise<Receipt[]> {
      const keys = await baseDriver.getKeys()
      const receipts: Receipt[] = []

      for (const key of keys) {
        const receipt = await this.getReceipt(key)
        if (!receipt) continue

        // Apply filter
        let matches = true
        for (const [field, value] of Object.entries(filter)) {
          if (receipt[field] !== value) {
            matches = false
            break
          }
        }

        if (matches) {
          receipts.push(receipt)
        }
      }

      return receipts.sort((a, b) => b.timestamp - a.timestamp)
    },

    async getRecentReceipts(limit: number = 50): Promise<Receipt[]> {
      const receipts = await this.findReceipts({})
      return receipts.slice(0, limit)
    },

    async removeReceipt(id: string): Promise<void> {
      await baseDriver.removeItem(id)
    },

    async cleanupOldReceipts(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
      const cutoff = Date.now() - maxAge
      const keys = await baseDriver.getKeys()

      for (const key of keys) {
        const receipt = await this.getReceipt(key)
        if (receipt && receipt.timestamp < cutoff) {
          await this.removeReceipt(receipt.id)
        }
      }
    }
  }
})
```

## Cache Storage Driver

High-performance cache with TTL support and write-through caching.

```typescript
// drivers/cache-storage.ts
import { defineDriver } from 'unstorage'
import gitObjectsDriver from './git-objects'

export interface CacheEntry<T = any> {
  value: T
  timestamp: number
  ttl: number
  hits: number
}

export interface CacheOptions {
  defaultTtl?: number
  maxSize?: number
  workingDir?: string
  writeThrough?: boolean
}

export default defineDriver((opts: CacheOptions = {}) => {
  const defaultTtl = opts.defaultTtl || 3600000 // 1 hour
  const maxSize = opts.maxSize || 1000
  const writeThrough = opts.writeThrough ?? true

  // In-memory cache for hot data
  const memoryCache = new Map<string, CacheEntry>()

  // Persistent storage
  const persistentStorage = gitObjectsDriver({
    workingDir: opts.workingDir
  })

  const isExpired = (entry: CacheEntry): boolean => {
    return Date.now() > entry.timestamp + entry.ttl
  }

  const evictExpired = (): void => {
    for (const [key, entry] of memoryCache.entries()) {
      if (isExpired(entry)) {
        memoryCache.delete(key)
      }
    }
  }

  const evictLru = (): void => {
    if (memoryCache.size <= maxSize) return

    // Sort by hits (ascending) and timestamp (ascending)
    const entries = Array.from(memoryCache.entries())
      .sort(([, a], [, b]) => {
        if (a.hits !== b.hits) return a.hits - b.hits
        return a.timestamp - b.timestamp
      })

    // Remove oldest, least used entries
    const toRemove = entries.slice(0, entries.length - maxSize)
    for (const [key] of toRemove) {
      memoryCache.delete(key)
    }
  }

  return {
    name: 'cache-storage',

    async get<T = any>(key: string): Promise<T | null> {
      // Check memory cache first
      let entry = memoryCache.get(key)

      if (entry && !isExpired(entry)) {
        entry.hits++
        return entry.value
      }

      // Check persistent storage
      if (writeThrough) {
        const stored = await persistentStorage.getItem(key)
        if (stored) {
          try {
            entry = JSON.parse(stored)
            if (entry && !isExpired(entry)) {
              // Restore to memory cache
              memoryCache.set(key, entry)
              evictLru()
              return entry.value
            }
          } catch {
            // Invalid stored data, remove it
            await persistentStorage.removeItem(key)
          }
        }
      }

      return null
    },

    async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || defaultTtl,
        hits: 0
      }

      // Store in memory
      memoryCache.set(key, entry)
      evictExpired()
      evictLru()

      // Store persistently if write-through is enabled
      if (writeThrough) {
        await persistentStorage.setItem(key, JSON.stringify(entry))
      }
    },

    async has(key: string): Promise<boolean> {
      const value = await this.get(key)
      return value !== null
    },

    async delete(key: string): Promise<void> {
      memoryCache.delete(key)
      if (writeThrough) {
        await persistentStorage.removeItem(key)
      }
    },

    async clear(): Promise<void> {
      memoryCache.clear()
      if (writeThrough) {
        await persistentStorage.clear()
      }
    },

    async keys(): Promise<string[]> {
      const memoryKeys = Array.from(memoryCache.keys())

      if (!writeThrough) {
        return memoryKeys
      }

      const persistentKeys = await persistentStorage.getKeys()
      const allKeys = new Set([...memoryKeys, ...persistentKeys])

      return Array.from(allKeys)
    },

    // Cache-specific methods
    async getStats(): Promise<{
      memorySize: number
      totalSize: number
      hitRate: number
    }> {
      const memorySize = memoryCache.size
      const totalSize = writeThrough ? (await persistentStorage.getKeys()).length : memorySize

      let totalHits = 0
      let totalRequests = 0

      for (const entry of memoryCache.values()) {
        totalHits += entry.hits
        totalRequests += entry.hits + 1 // +1 for initial set
      }

      return {
        memorySize,
        totalSize,
        hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
      }
    },

    async cleanup(): Promise<void> {
      evictExpired()

      if (writeThrough) {
        const keys = await persistentStorage.getKeys()
        for (const key of keys) {
          const stored = await persistentStorage.getItem(key)
          if (stored) {
            try {
              const entry = JSON.parse(stored)
              if (isExpired(entry)) {
                await persistentStorage.removeItem(key)
              }
            } catch {
              await persistentStorage.removeItem(key)
            }
          }
        }
      }
    }
  }
})
```

## Multi-Driver Mounting Strategy

Configure different storage drivers for different data types.

```typescript
// storage/index.ts
import { createStorage } from 'unstorage'
import gitNotesDriver from '../drivers/git-notes'
import gitRefsDriver from '../drivers/git-refs'
import gitObjectsDriver from '../drivers/git-objects'
import lockStorageDriver from '../drivers/lock-storage'
import receiptStorageDriver from '../drivers/receipt-storage'
import cacheStorageDriver from '../drivers/cache-storage'
import memoryDriver from 'unstorage/drivers/memory'
import fsDriver from 'unstorage/drivers/fs'

export interface StorageConfig {
  workingDir?: string
  enableCache?: boolean
  enablePersistence?: boolean
  fallbackToFs?: boolean
}

export function createGitVanStorage(config: StorageConfig = {}) {
  const {
    workingDir = process.cwd(),
    enableCache = true,
    enablePersistence = true,
    fallbackToFs = true
  } = config

  const storage = createStorage({
    driver: memoryDriver() // Default in-memory driver
  })

  // Mount specialized drivers for different data types

  // 1. Configuration and metadata -> Git Notes
  storage.mount('config', gitNotesDriver({
    ref: 'refs/notes/gitvan/config',
    namespace: 'config',
    workingDir
  }))

  storage.mount('metadata', gitNotesDriver({
    ref: 'refs/notes/gitvan/metadata',
    namespace: 'metadata',
    workingDir
  }))

  // 2. State and locks -> Git Refs
  storage.mount('locks', lockStorageDriver({
    workingDir,
    ttl: 30000
  }))

  storage.mount('state', gitRefsDriver({
    prefix: 'refs/gitvan/state',
    workingDir
  }))

  // 3. Content and artifacts -> Git Objects
  storage.mount('content', gitObjectsDriver({
    compression: true,
    workingDir
  }))

  storage.mount('artifacts', gitObjectsDriver({
    compression: true,
    workingDir
  }))

  // 4. Execution receipts -> Specialized receipt storage
  storage.mount('receipts', receiptStorageDriver({
    workingDir,
    compression: true
  }))

  // 5. Cache layer -> High-performance cache
  if (enableCache) {
    storage.mount('cache', cacheStorageDriver({
      defaultTtl: 3600000, // 1 hour
      maxSize: 1000,
      workingDir,
      writeThrough: enablePersistence
    }))
  }

  // 6. Temporary data -> Memory only
  storage.mount('temp', memoryDriver())

  // 7. Fallback to filesystem if enabled
  if (fallbackToFs) {
    storage.mount('fs', fsDriver({
      base: `${workingDir}/.gitvan/storage`
    }))
  }

  return storage
}

// Usage examples
export const storage = createGitVanStorage()

// Specialized accessors
export const config = {
  get: (key: string) => storage.getItem(`config:${key}`),
  set: (key: string, value: any) => storage.setItem(`config:${key}`, value),
  remove: (key: string) => storage.removeItem(`config:${key}`)
}

export const locks = {
  acquire: (key: string, owner: string) =>
    storage.getItem(`locks:${key}`)?.acquireLock?.(key, owner),
  release: (key: string, owner: string) =>
    storage.getItem(`locks:${key}`)?.releaseLock?.(key, owner),
  isLocked: (key: string) =>
    storage.getItem(`locks:${key}`)?.isLocked?.(key)
}

export const cache = {
  get: <T>(key: string) => storage.getItem(`cache:${key}`) as Promise<T | null>,
  set: <T>(key: string, value: T, ttl?: number) =>
    storage.getItem(`cache:${key}`)?.set?.(key, value, ttl),
  delete: (key: string) => storage.getItem(`cache:${key}`)?.delete?.(key)
}

export const receipts = {
  store: (receipt: any) =>
    storage.getItem(`receipts:${receipt.id}`)?.storeReceipt?.(receipt),
  get: (id: string) =>
    storage.getItem(`receipts:${id}`)?.getReceipt?.(id),
  find: (filter: any) =>
    storage.getItem('receipts:')?.findReceipts?.(filter)
}
```

## Performance Optimizations

### 1. Layered Caching Strategy

```typescript
// optimizations/layered-cache.ts
export class LayeredCache {
  private layers: Array<{
    name: string
    storage: any
    ttl: number
    priority: number
  }> = []

  addLayer(name: string, storage: any, ttl: number, priority: number = 0) {
    this.layers.push({ name, storage, ttl, priority })
    this.layers.sort((a, b) => b.priority - a.priority)
  }

  async get<T>(key: string): Promise<T | null> {
    for (const layer of this.layers) {
      try {
        const value = await layer.storage.get(key)
        if (value !== null) {
          // Promote to higher layers
          await this.promote(key, value, layer)
          return value
        }
      } catch (error) {
        console.warn(`Cache layer ${layer.name} failed for key ${key}:`, error)
      }
    }
    return null
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Write to all layers
    await Promise.allSettled(
      this.layers.map(layer =>
        layer.storage.set(key, value, ttl || layer.ttl)
      )
    )
  }

  private async promote<T>(key: string, value: T, fromLayer: any): Promise<void> {
    const fromIndex = this.layers.indexOf(fromLayer)
    const higherLayers = this.layers.slice(0, fromIndex)

    await Promise.allSettled(
      higherLayers.map(layer =>
        layer.storage.set(key, value, layer.ttl)
      )
    )
  }
}
```

### 2. Batch Operations

```typescript
// optimizations/batch-operations.ts
export class BatchProcessor {
  private batches = new Map<string, Array<{
    operation: 'get' | 'set' | 'delete'
    key: string
    value?: any
    resolve: (value: any) => void
    reject: (error: any) => void
  }>>()

  private timers = new Map<string, NodeJS.Timeout>()

  async batchGet(storage: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.addToBatch(storage, {
        operation: 'get',
        key,
        resolve,
        reject
      })
    })
  }

  async batchSet(storage: string, key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.addToBatch(storage, {
        operation: 'set',
        key,
        value,
        resolve,
        reject
      })
    })
  }

  private addToBatch(storage: string, operation: any): void {
    if (!this.batches.has(storage)) {
      this.batches.set(storage, [])
    }

    this.batches.get(storage)!.push(operation)

    // Clear existing timer
    if (this.timers.has(storage)) {
      clearTimeout(this.timers.get(storage)!)
    }

    // Set new timer to process batch
    this.timers.set(storage, setTimeout(() => {
      this.processBatch(storage)
    }, 10)) // 10ms debounce
  }

  private async processBatch(storage: string): Promise<void> {
    const batch = this.batches.get(storage) || []
    if (batch.length === 0) return

    this.batches.delete(storage)
    this.timers.delete(storage)

    // Group operations by type
    const gets = batch.filter(op => op.operation === 'get')
    const sets = batch.filter(op => op.operation === 'set')
    const deletes = batch.filter(op => op.operation === 'delete')

    try {
      // Process gets in parallel
      if (gets.length > 0) {
        const getResults = await Promise.allSettled(
          gets.map(async op => {
            const value = await this.getStorageDriver(storage).getItem(op.key)
            return { op, value }
          })
        )

        getResults.forEach(result => {
          if (result.status === 'fulfilled') {
            result.value.op.resolve(result.value.value)
          } else {
            result.value.op.reject(result.reason)
          }
        })
      }

      // Process sets in parallel
      if (sets.length > 0) {
        const setResults = await Promise.allSettled(
          sets.map(async op => {
            await this.getStorageDriver(storage).setItem(op.key, op.value)
            return op
          })
        )

        setResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            sets[index].resolve(undefined)
          } else {
            sets[index].reject(result.reason)
          }
        })
      }

      // Process deletes in parallel
      if (deletes.length > 0) {
        const deleteResults = await Promise.allSettled(
          deletes.map(async op => {
            await this.getStorageDriver(storage).removeItem(op.key)
            return op
          })
        )

        deleteResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            deletes[index].resolve(undefined)
          } else {
            deletes[index].reject(result.reason)
          }
        })
      }
    } catch (error) {
      // Reject all operations in batch
      batch.forEach(op => op.reject(error))
    }
  }

  private getStorageDriver(storage: string): any {
    // Implementation depends on your storage setup
    throw new Error('getStorageDriver must be implemented')
  }
}
```

### 3. Compression and Serialization

```typescript
// optimizations/compression.ts
import { gzipSync, gunzipSync } from 'zlib'

export class CompressionUtils {
  static compress(data: any): string {
    const json = JSON.stringify(data)
    const compressed = gzipSync(json)
    return compressed.toString('base64')
  }

  static decompress(data: string): any {
    try {
      const buffer = Buffer.from(data, 'base64')
      const decompressed = gunzipSync(buffer)
      return JSON.parse(decompressed.toString())
    } catch (error) {
      // Fallback for uncompressed data
      return JSON.parse(data)
    }
  }

  static shouldCompress(data: any): boolean {
    const json = JSON.stringify(data)
    return json.length > 1024 // Compress if larger than 1KB
  }
}
```

## Migration Strategy

### 1. Migration Planning

```typescript
// migration/migrator.ts
export interface MigrationStep {
  id: string
  description: string
  from: string
  to: string
  transform?: (data: any) => any
  validate?: (data: any) => boolean
}

export class StorageMigrator {
  private steps: MigrationStep[] = []

  addMigration(step: MigrationStep): void {
    this.steps.push(step)
  }

  async migrate(fromStorage: any, toStorage: any): Promise<void> {
    console.log('Starting storage migration...')

    for (const step of this.steps) {
      console.log(`Executing migration: ${step.description}`)

      try {
        await this.executeStep(step, fromStorage, toStorage)
        console.log(`✓ Completed: ${step.description}`)
      } catch (error) {
        console.error(`✗ Failed: ${step.description}`, error)
        throw error
      }
    }

    console.log('Migration completed successfully!')
  }

  private async executeStep(
    step: MigrationStep,
    fromStorage: any,
    toStorage: any
  ): Promise<void> {
    // Get all keys from source
    const keys = await fromStorage.getKeys(step.from)

    for (const key of keys) {
      const data = await fromStorage.getItem(`${step.from}:${key}`)
      if (data === null) continue

      // Transform data if needed
      let transformedData = data
      if (step.transform) {
        transformedData = step.transform(data)
      }

      // Validate data if needed
      if (step.validate && !step.validate(transformedData)) {
        console.warn(`Validation failed for ${key}, skipping`)
        continue
      }

      // Store in destination
      await toStorage.setItem(`${step.to}:${key}`, transformedData)
    }
  }
}

// Example usage
const migrator = new StorageMigrator()

migrator.addMigration({
  id: 'fs-to-git-notes',
  description: 'Migrate filesystem config to Git notes',
  from: 'fs/config',
  to: 'config',
  transform: (data) => {
    // Add migration metadata
    return {
      ...data,
      migrated: true,
      migratedAt: Date.now()
    }
  }
})

migrator.addMigration({
  id: 'receipts-compression',
  description: 'Compress existing receipts',
  from: 'receipts',
  to: 'receipts',
  transform: (data) => {
    return CompressionUtils.compress(data)
  }
})
```

### 2. Gradual Migration

```typescript
// migration/gradual-migrator.ts
export class GradualMigrator {
  private readStrategies = new Map<string, Array<any>>()
  private writeStrategy: any
  private migrationProgress = new Map<string, number>()

  setWriteStrategy(storage: any): void {
    this.writeStrategy = storage
  }

  addReadStrategy(name: string, storage: any, priority: number = 0): void {
    if (!this.readStrategies.has(name)) {
      this.readStrategies.set(name, [])
    }

    this.readStrategies.get(name)!.push({ storage, priority })
    this.readStrategies.get(name)!.sort((a, b) => b.priority - a.priority)
  }

  async get(key: string): Promise<any> {
    const strategies = this.readStrategies.get('read') || []

    for (const { storage } of strategies) {
      try {
        const value = await storage.getItem(key)
        if (value !== null) {
          // Found data, migrate it to write strategy if different
          if (storage !== this.writeStrategy) {
            await this.writeStrategy.setItem(key, value)
            this.updateMigrationProgress(key)
          }
          return value
        }
      } catch (error) {
        console.warn(`Read strategy failed for ${key}:`, error)
      }
    }

    return null
  }

  async set(key: string, value: any): Promise<void> {
    await this.writeStrategy.setItem(key, value)
    this.updateMigrationProgress(key)
  }

  private updateMigrationProgress(key: string): void {
    const progress = this.migrationProgress.get(key) || 0
    this.migrationProgress.set(key, progress + 1)
  }

  getMigrationStats(): { total: number; migrated: number; progress: number } {
    const total = this.migrationProgress.size
    const migrated = Array.from(this.migrationProgress.values())
      .filter(count => count > 0).length

    return {
      total,
      migrated,
      progress: total > 0 ? migrated / total : 0
    }
  }
}
```

## Implementation Examples

### 1. Complete Setup Example

```typescript
// examples/complete-setup.ts
import { createGitVanStorage } from '../storage'
import { StorageMigrator } from '../migration/migrator'

async function setupGitVanStorage() {
  // Create storage with all drivers
  const storage = createGitVanStorage({
    workingDir: process.cwd(),
    enableCache: true,
    enablePersistence: true,
    fallbackToFs: true
  })

  // Initialize Git repository if needed
  const { execSync } = require('child_process')
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' })
  } catch {
    execSync('git init')
    execSync('git config user.name "GitVan"')
    execSync('git config user.email "gitvan@localhost"')
  }

  // Create initial commit if repository is empty
  try {
    execSync('git rev-parse HEAD', { stdio: 'ignore' })
  } catch {
    execSync('git commit --allow-empty -m "Initial GitVan commit"')
  }

  // Set up initial configuration
  await storage.setItem('config:version', '1.0.0')
  await storage.setItem('config:initialized', true)
  await storage.setItem('config:drivers', {
    'config': 'git-notes',
    'state': 'git-refs',
    'content': 'git-objects',
    'cache': 'memory+git-objects',
    'locks': 'git-refs+atomic'
  })

  return storage
}

// Usage
async function main() {
  const storage = await setupGitVanStorage()

  // Store some configuration
  await storage.setItem('config:project', {
    name: 'my-project',
    version: '1.0.0',
    features: ['git-storage', 'distributed-cache']
  })

  // Acquire a lock
  const lockAcquired = await storage.getItem('locks:deploy')?.acquireLock?.('deploy', 'user-123')
  console.log('Lock acquired:', lockAcquired)

  // Store content
  await storage.setItem('content:readme', '# My Project\\n\\nThis is a GitVan project.')

  // Cache some data
  await storage.getItem('cache:api-response')?.set?.('user-data', { id: 123, name: 'John' }, 3600000)

  // Store a receipt
  await storage.getItem('receipts:cmd-123')?.storeReceipt?.({
    id: 'cmd-123',
    command: 'npm test',
    timestamp: Date.now(),
    duration: 5000,
    exitCode: 0,
    output: 'All tests passed',
    metadata: { branch: 'main' }
  })

  console.log('GitVan storage setup complete!')
}

if (require.main === module) {
  main().catch(console.error)
}
```

### 2. Performance Testing

```typescript
// examples/performance-test.ts
import { createGitVanStorage } from '../storage'
import { performance } from 'perf_hooks'

async function benchmarkStorageDrivers() {
  const storage = createGitVanStorage()
  const iterations = 1000
  const testData = { message: 'Hello, World!', timestamp: Date.now() }

  const drivers = ['config', 'state', 'content', 'cache']
  const results = new Map<string, { write: number; read: number }>()

  for (const driver of drivers) {
    console.log(`\\nBenchmarking ${driver} driver...`)

    // Benchmark writes
    const writeStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      await storage.setItem(`${driver}:test-${i}`, testData)
    }
    const writeTime = performance.now() - writeStart

    // Benchmark reads
    const readStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      await storage.getItem(`${driver}:test-${i}`)
    }
    const readTime = performance.now() - readStart

    results.set(driver, {
      write: writeTime / iterations,
      read: readTime / iterations
    })

    console.log(`${driver}: ${(writeTime / iterations).toFixed(2)}ms write, ${(readTime / iterations).toFixed(2)}ms read`)
  }

  // Cleanup
  for (const driver of drivers) {
    for (let i = 0; i < iterations; i++) {
      await storage.removeItem(`${driver}:test-${i}`)
    }
  }

  return results
}

// Cache performance test
async function benchmarkCache() {
  const storage = createGitVanStorage()
  const cache = storage.getItem('cache:')

  const testSizes = [1, 10, 100, 1000] // KB

  for (const size of testSizes) {
    const data = 'x'.repeat(size * 1024)
    const key = `perf-test-${size}kb`

    // Test write
    const writeStart = performance.now()
    await cache?.set?.(key, data)
    const writeTime = performance.now() - writeStart

    // Test read
    const readStart = performance.now()
    await cache?.get?.(key)
    const readTime = performance.now() - readStart

    console.log(`${size}KB: ${writeTime.toFixed(2)}ms write, ${readTime.toFixed(2)}ms read`)

    await cache?.delete?.(key)
  }
}

if (require.main === module) {
  Promise.all([
    benchmarkStorageDrivers(),
    benchmarkCache()
  ]).then(() => {
    console.log('\\nBenchmark complete!')
  }).catch(console.error)
}
```

### 3. Migration Example

```typescript
// examples/migration-example.ts
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
import { createGitVanStorage } from '../storage'
import { StorageMigrator } from '../migration/migrator'

async function migrateFromFilesystem() {
  // Old filesystem-based storage
  const oldStorage = createStorage({
    driver: fsDriver({ base: './.gitvan-old' })
  })

  // New Git-based storage
  const newStorage = createGitVanStorage()

  // Create migrator
  const migrator = new StorageMigrator()

  // Add migration steps
  migrator.addMigration({
    id: 'config-migration',
    description: 'Migrate configuration files',
    from: 'config',
    to: 'config',
    transform: (data) => ({
      ...data,
      migratedFrom: 'filesystem',
      migratedAt: new Date().toISOString()
    }),
    validate: (data) => data && typeof data === 'object'
  })

  migrator.addMigration({
    id: 'cache-migration',
    description: 'Migrate cache entries',
    from: 'cache',
    to: 'cache',
    transform: (data) => {
      // Convert old cache format to new format
      if (typeof data === 'string') {
        return {
          value: data,
          timestamp: Date.now(),
          ttl: 3600000,
          hits: 0
        }
      }
      return data
    }
  })

  // Execute migration
  await migrator.migrate(oldStorage, newStorage)

  // Verify migration
  const configKeys = await newStorage.getKeys('config')
  console.log(`Migrated ${configKeys.length} configuration items`)

  const cacheKeys = await newStorage.getKeys('cache')
  console.log(`Migrated ${cacheKeys.length} cache items`)
}

if (require.main === module) {
  migrateFromFilesystem().catch(console.error)
}
```

## Best Practices

### 1. Error Handling

- Always handle Git command failures gracefully
- Implement retry logic for transient failures
- Provide meaningful error messages
- Log Git operations for debugging

### 2. Performance

- Use batch operations for multiple items
- Implement proper caching layers
- Consider compression for large data
- Monitor Git repository size

### 3. Security

- Validate all input data
- Use proper Git refs naming
- Implement access controls
- Sanitize keys and values

### 4. Monitoring

- Track storage operation metrics
- Monitor Git repository health
- Log performance statistics
- Alert on storage failures

## Conclusion

These GitVan-specific unstorage drivers provide a Git-native storage foundation that aligns with GitVan's philosophy of treating everything as code. The drivers leverage Git's atomic operations, distributed nature, and version control capabilities to create a robust, scalable storage system.

Key benefits:
- **Git-Native**: All data stored using Git primitives
- **Distributed**: Natural replication through Git remotes
- **Atomic**: Leverages Git's atomic reference updates
- **Versioned**: Automatic history tracking
- **Performance**: Layered caching and optimization
- **Migration**: Smooth transition from filesystem storage

The modular design allows for gradual adoption and easy customization based on specific requirements.