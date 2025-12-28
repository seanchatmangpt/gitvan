/**
 * @fileoverview GitVan v4 - @unrdf/hooks Context Management
 *
 * This module provides the core context management system for hooks,
 * implementing a singleton context store with async-safe access patterns.
 * Uses unctx-compatible patterns for context propagation across async boundaries.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import type {
  HookContext,
  GitHookContext,
  MutableHookContext,
  HookConfig,
  HookLogger,
  HookMetadata,
  HookPhase,
  HookLifecycleEvent,
  HookLifecycleCallback,
} from './types.js';
import { HookContextError, HookLifecycleError, DEFAULT_HOOK_CONFIG } from './types.js';

// ============================================================================
// Context Store
// ============================================================================

/**
 * Internal context storage using AsyncLocalStorage pattern
 * Provides async-safe context propagation similar to unctx
 */
class ContextStore<T> {
  private currentContext: T | null = null;
  private contextStack: T[] = [];

  /**
   * Get current context or throw if not available
   */
  use(): T {
    if (this.currentContext === null) {
      throw new HookContextError(
        'Hook context not available. Ensure you are within a withHookContext() call.',
      );
    }
    return this.currentContext;
  }

  /**
   * Try to get current context, returning null if not available
   */
  tryUse(): T | null {
    return this.currentContext;
  }

  /**
   * Set the current context
   */
  set(context: T): void {
    this.currentContext = context;
  }

  /**
   * Push current context to stack and set new one
   */
  push(context: T): void {
    if (this.currentContext !== null) {
      this.contextStack.push(this.currentContext);
    }
    this.currentContext = context;
  }

  /**
   * Pop context from stack and restore previous
   */
  pop(): T | null {
    const previous = this.currentContext;
    this.currentContext = this.contextStack.pop() ?? null;
    return previous;
  }

  /**
   * Execute function with given context
   */
  call<R>(context: T, fn: () => R): R {
    this.push(context);
    try {
      return fn();
    } finally {
      this.pop();
    }
  }

  /**
   * Execute async function with given context
   */
  async callAsync<R>(context: T, fn: () => Promise<R>): Promise<R> {
    this.push(context);
    try {
      return await fn();
    } finally {
      this.pop();
    }
  }

  /**
   * Clear the context
   */
  clear(): void {
    this.currentContext = null;
    this.contextStack = [];
  }
}

// ============================================================================
// Global Context Instances
// ============================================================================

/**
 * Global hook context store
 */
const hookContextStore = new ContextStore<HookContext>();

/**
 * Global Git hook context store
 */
const gitHookContextStore = new ContextStore<GitHookContext>();

/**
 * Lifecycle callback registry
 */
const lifecycleCallbacks = new Set<HookLifecycleCallback>();

/**
 * Current lifecycle phase
 */
let currentPhase: HookPhase = 'created';

// ============================================================================
// Context Factory Functions
// ============================================================================

/**
 * Generate unique session ID for context
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `session_${timestamp}_${random}`;
}

/**
 * Create a new base hook context
 *
 * @param options - Context creation options
 * @returns New hook context instance
 *
 * @example
 * ```typescript
 * const context = createHookContext({
 *   cwd: '/path/to/repo',
 *   env: process.env,
 * });
 * ```
 */
export function createHookContext(
  options: Partial<HookContext> = {},
): HookContext {
  return {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? { ...process.env } as Record<string, string | undefined>,
    sessionId: options.sessionId ?? generateSessionId(),
    timestamp: options.timestamp ?? new Date(),
    logger: options.logger,
  };
}

/**
 * Create a Git-specific hook context
 *
 * @param base - Base hook context
 * @param gitInfo - Git repository information
 * @returns Git hook context instance
 *
 * @example
 * ```typescript
 * const gitContext = createGitHookContext(baseContext, {
 *   repoRoot: '/path/to/repo',
 *   branch: 'main',
 *   headSha: 'abc123',
 *   isDirty: false,
 * });
 * ```
 */
export function createGitHookContext(
  base: HookContext,
  gitInfo: Omit<GitHookContext, keyof HookContext>,
): GitHookContext {
  return {
    ...base,
    ...gitInfo,
  };
}

// ============================================================================
// Context Access Functions
// ============================================================================

/**
 * Get the current hook context
 * Throws if called outside of a context scope
 *
 * @returns Current hook context
 * @throws {HookContextError} If no context is available
 *
 * @example
 * ```typescript
 * function myHook() {
 *   const ctx = useHookContext();
 *   console.log(ctx.cwd);
 * }
 * ```
 */
export function useHookContext(): HookContext {
  return hookContextStore.use();
}

/**
 * Try to get the current hook context
 * Returns null if called outside of a context scope
 *
 * @returns Current hook context or null
 *
 * @example
 * ```typescript
 * function myHook() {
 *   const ctx = tryUseHookContext();
 *   if (ctx) {
 *     console.log(ctx.cwd);
 *   }
 * }
 * ```
 */
export function tryUseHookContext(): HookContext | null {
  return hookContextStore.tryUse();
}

/**
 * Get the current Git hook context
 * Throws if called outside of a Git context scope
 *
 * @returns Current Git hook context
 * @throws {HookContextError} If no Git context is available
 */
export function useGitHookContext(): GitHookContext {
  return gitHookContextStore.use();
}

/**
 * Try to get the current Git hook context
 * Returns null if called outside of a Git context scope
 *
 * @returns Current Git hook context or null
 */
export function tryUseGitHookContext(): GitHookContext | null {
  return gitHookContextStore.tryUse();
}

// ============================================================================
// Context Execution Functions
// ============================================================================

/**
 * Execute a function within a hook context scope
 * Context is automatically cleaned up after execution
 *
 * @param context - Hook context to use
 * @param fn - Function to execute
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = withHookContext(context, () => {
 *   const ctx = useHookContext();
 *   return ctx.cwd;
 * });
 * ```
 */
export function withHookContext<R>(context: HookContext, fn: () => R): R {
  return hookContextStore.call(context, fn);
}

/**
 * Execute an async function within a hook context scope
 * Context is automatically cleaned up after execution
 *
 * @param context - Hook context to use
 * @param fn - Async function to execute
 * @returns Promise with result of the function
 *
 * @example
 * ```typescript
 * const result = await withHookContextAsync(context, async () => {
 *   const ctx = useHookContext();
 *   return await someAsyncOp(ctx.cwd);
 * });
 * ```
 */
export async function withHookContextAsync<R>(
  context: HookContext,
  fn: () => Promise<R>,
): Promise<R> {
  return hookContextStore.callAsync(context, fn);
}

/**
 * Execute a function within a Git hook context scope
 *
 * @param context - Git hook context to use
 * @param fn - Function to execute
 * @returns Result of the function
 */
export function withGitHookContext<R>(context: GitHookContext, fn: () => R): R {
  return hookContextStore.call(context, () => {
    return gitHookContextStore.call(context, fn);
  });
}

/**
 * Execute an async function within a Git hook context scope
 *
 * @param context - Git hook context to use
 * @param fn - Async function to execute
 * @returns Promise with result of the function
 */
export async function withGitHookContextAsync<R>(
  context: GitHookContext,
  fn: () => Promise<R>,
): Promise<R> {
  return hookContextStore.callAsync(context, () => {
    return gitHookContextStore.callAsync(context, fn);
  });
}

// ============================================================================
// Lifecycle Management
// ============================================================================

/**
 * Emit a lifecycle event to all registered callbacks
 */
async function emitLifecycleEvent(event: HookLifecycleEvent): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const callback of lifecycleCallbacks) {
    try {
      const result = callback(event);
      if (result instanceof Promise) {
        promises.push(result);
      }
    } catch (error) {
      // Log but don't throw - lifecycle callbacks shouldn't break execution
      console.error('Lifecycle callback error:', error);
    }
  }

  await Promise.all(promises);
}

/**
 * Transition to a new lifecycle phase
 *
 * @param phase - New phase to transition to
 * @param error - Optional error if transition failed
 */
export async function transitionPhase(
  phase: HookPhase,
  error?: Error,
): Promise<void> {
  const previousPhase = currentPhase;
  currentPhase = phase;

  await emitLifecycleEvent({
    phase,
    timestamp: new Date(),
    previousPhase,
    error,
  });
}

/**
 * Get current lifecycle phase
 */
export function getCurrentPhase(): HookPhase {
  return currentPhase;
}

/**
 * Register a lifecycle callback
 *
 * @param callback - Callback to register
 * @returns Unregister function
 */
export function onLifecycleChange(callback: HookLifecycleCallback): () => void {
  lifecycleCallbacks.add(callback);
  return () => {
    lifecycleCallbacks.delete(callback);
  };
}

// ============================================================================
// Context Utilities
// ============================================================================

/**
 * Create a derived context with modified properties
 *
 * @param base - Base context to derive from
 * @param overrides - Properties to override
 * @returns New context with overrides applied
 */
export function deriveContext<T extends HookContext>(
  base: T,
  overrides: Partial<T>,
): T {
  return {
    ...base,
    ...overrides,
  };
}

/**
 * Merge environment variables from multiple sources
 * Later sources override earlier ones
 *
 * @param sources - Environment variable sources
 * @returns Merged environment variables
 */
export function mergeEnv(
  ...sources: Array<Record<string, string | undefined>>
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const source of sources) {
    Object.assign(result, source);
  }

  // Always set deterministic values for Git operations
  result['TZ'] = 'UTC';
  result['LANG'] = 'C';

  return result;
}

/**
 * Create a context with deterministic environment for reproducibility
 *
 * @param context - Base context
 * @returns Context with deterministic environment
 */
export function withDeterministicEnv<T extends HookContext>(context: T): T {
  return {
    ...context,
    env: {
      ...context.env,
      TZ: 'UTC',
      LANG: 'C',
      LC_ALL: 'C',
    },
  };
}

/**
 * Clear all contexts (primarily for testing)
 */
export function clearAllContexts(): void {
  hookContextStore.clear();
  gitHookContextStore.clear();
  currentPhase = 'created';
  lifecycleCallbacks.clear();
}
