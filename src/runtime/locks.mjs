import { useGit } from '../composables/git.mjs'

/**
 * Acquire atomic lock using git refs
 * Returns lock ref if successful, null if already locked
 */
export function acquireLock(key, sha) {
  const git = useGit()
  const ref = `${key}`
  const input = `create ${ref} ${sha}\n`
  try {
    git.updateRefStdin(input)
    return ref
  } catch {
    return null
  }
}

/**
 * Generate worktree-scoped lock reference
 * Format: refs/gitvan/locks/<worktree-id>/<event-id>/<sha>
 */
export function worktreeLockRef(locksRoot, wtId, eventId, sha) {
  const cleanEventId = eventId.replace(/[\\/]/g, '-')
  return `${locksRoot}/${wtId}/${cleanEventId}/${sha}`
}

/**
 * Release lock by deleting the ref
 */
export function releaseLock(ref) {
  if (!ref) return

  const git = useGit()
  try {
    git.delRef(ref)
  } catch (err) {
    console.warn(`Error releasing lock ${ref}:`, err.message)
  }
}

/**
 * Check if lock exists
 */
export function isLocked(ref) {
  if (!ref) return false

  const git = useGit()
  try {
    const refs = git.listRefs(ref)
    return refs.includes(ref)
  } catch {
    return false
  }
}

/**
 * Legacy LockManager class for backward compatibility
 */
export class LockManager {
  constructor(worktreePath) {
    this.worktreePath = worktreePath
  }

  acquireLock(name, timeoutMs = 30000) {
    const startTime = Date.now()
    const lockRef = `refs/gitvan/locks/legacy/${name}`

    while (Date.now() - startTime < timeoutMs) {
      const acquired = acquireLock(lockRef, 'HEAD')
      if (acquired) {
        return new Lock(acquired)
      }

      // Wait 50ms before retrying
      new Promise(resolve => setTimeout(resolve, 50))
    }

    throw new Error(`Failed to acquire lock '${name}' within ${timeoutMs}ms`)
  }

  isLocked(name) {
    const lockRef = `refs/gitvan/locks/legacy/${name}`
    return isLocked(lockRef)
  }

  cleanup() {
    const git = useGit()
    try {
      const lockRefs = git.listRefs('refs/gitvan/locks/legacy/')
      for (const ref of lockRefs) {
        git.delRef(ref)
      }
    } catch (err) {
      console.warn('Error cleaning up locks:', err.message)
    }
  }
}

class Lock {
  constructor(lockRef) {
    this.lockRef = lockRef
    this.released = false
  }

  release() {
    if (this.released) return

    releaseLock(this.lockRef)
    this.released = true
  }
}