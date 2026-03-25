import { createContext } from 'unctx'

/**
 * Global GitVan context using unctx for async context preservation
 * Context is maintained through await calls when wrapped properly
 */
const GV = createContext()

/**
 * Execute a function with GitVan context
 * @param {Object} ctx - Context object containing cwd, env, now
 * @param {Function} fn - Async function to execute with context
 * @returns {Promise<any>} Result of the function
 *
 * @example
 * await withGitVan({ cwd: '/path', env: { TZ: 'UTC' } }, async () => {
 *   const git = useGit()
 *   // git operations work here with context
 * })
 */
export function withGitVan(ctx, fn) {
  return GV.call(ctx, fn)
}

/**
 * Get current GitVan context (throws if not available)
 * Must be called synchronously before any await
 * @returns {Object} Context object with cwd, env, now
 * @throws {Error} If context is not available
 *
 * @example
 * function myComposable() {
 *   const ctx = useGitVan()
 *   return { cwd: ctx.cwd }
 * }
 */
export function useGitVan() {
  return GV.use()
}

/**
 * Try to get GitVan context without throwing
 * @returns {Object|null} Context object or null if not available
 */
export function tryUseGitVan() {
  return GV.tryUse()
}