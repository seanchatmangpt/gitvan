// Core context module for GitVan
// Provides context management with deterministic environment and unctx async safety

import { useGitVan as _useGitVan, withGitVan } from '../composables/ctx.mjs'

export { withGitVan }

export function useGitVan() {
  return _useGitVan()
}

export function tryUseGitVan() {
  try {
    return _useGitVan()
  } catch {
    return null
  }
}

/**
 * Resolve cwd/env from context once to avoid unctx async pitfalls
 * This function captures the context immediately to prevent loss after await calls
 *
 * @returns {Object} { ctx, cwd, env } - Context with deterministic environment
 */
export function bindContext() {
  // Prefer strict `use` if available within a `withGitVan` call
  let ctx;
  try {
    ctx = useGitVan?.();
  } catch {
    ctx = tryUseGitVan?.();
  }

  const cwd = (ctx && ctx.cwd) || process.cwd();

  // Set up deterministic environment with UTC timezone and C locale
  const env = {
    ...process.env,
    TZ: "UTC",
    LANG: "C",
    ...(ctx && ctx.env ? ctx.env : {}),
  };

  return { ctx, cwd, env };
}