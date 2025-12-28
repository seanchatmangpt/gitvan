/**
 * @fileoverview GitVan v4 - Hook Composition Utilities
 *
 * This module provides utilities for composing hooks together,
 * creating complex workflows from simple building blocks.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import {
  useState,
  useEffect,
  useMemo,
  useComputed,
  useRef,
  type HookCleanup,
  type HookStateResult,
  type AsyncHookResult,
} from '../core/index.js';

// ============================================================================
// Composition Types
// ============================================================================

/**
 * Hook factory function type
 */
export type HookFactory<T, P extends unknown[] = []> = (...params: P) => T;

/**
 * Composed hook result
 */
export interface ComposedHook<T> {
  /** Access the composed value */
  (): T;
  /** Dispose all composed hooks */
  dispose: () => void;
}

/**
 * Pipeline stage
 */
export type PipelineStage<I, O> = (input: I) => O | Promise<O>;

/**
 * Pipeline result
 */
export interface PipelineResult<T> {
  /** Pipeline output */
  readonly data: T | null;
  /** Pipeline error */
  readonly error: Error | null;
  /** Whether pipeline is executing */
  readonly loading: boolean;
  /** Pipeline execution duration */
  readonly duration: number;
}

// ============================================================================
// Hook Composition
// ============================================================================

/**
 * Compose multiple hooks into a single hook
 * All hooks share the same lifecycle
 *
 * @param hooks - Object of hook factories
 * @returns Composed hook returning all results
 *
 * @example
 * ```typescript
 * const useAppState = composeHooks({
 *   repo: useRepositoryInfo,
 *   branch: useBranchInfo,
 *   status: useWorkingDirectoryStatus,
 * });
 *
 * // Usage
 * const state = useAppState();
 * console.log(state.repo().data?.root);
 * console.log(state.branch().data?.name);
 * ```
 */
export function composeHooks<
  T extends Record<string, HookFactory<unknown>>,
>(hooks: T): () => { [K in keyof T]: ReturnType<T[K]> } {
  return () => {
    const result = {} as { [K in keyof T]: ReturnType<T[K]> };

    for (const [key, factory] of Object.entries(hooks)) {
      result[key as keyof T] = factory() as ReturnType<T[keyof T]>;
    }

    return result;
  };
}

/**
 * Create a hook that combines multiple async results
 *
 * @param hooks - Array of async hook results
 * @returns Combined result
 *
 * @example
 * ```typescript
 * const repoInfo = useRepositoryInfo();
 * const branchInfo = useBranchInfo();
 *
 * const combined = useCombine([repoInfo, branchInfo]);
 * // combined.loading is true until both complete
 * // combined.data is [repoData, branchData]
 * ```
 */
export function useCombine<T extends readonly (() => AsyncHookResult<unknown>)[]>(
  hooks: T,
): () => AsyncHookResult<{ [K in keyof T]: T[K] extends () => AsyncHookResult<infer U> ? U : never }> {
  return useComputed(() => {
    const results = hooks.map((h) => h());

    const loading = results.some((r) => r.loading);
    const error = results.find((r) => r.error)?.error ?? null;
    const executed = results.every((r) => r.executed);

    if (loading) {
      return {
        data: null,
        error: null,
        loading: true,
        executed: false,
        duration: 0,
        attempts: 0,
        cached: false,
      };
    }

    if (error) {
      return {
        data: null,
        error,
        loading: false,
        executed: true,
        duration: Math.max(...results.map((r) => r.duration)),
        attempts: Math.max(...results.map((r) => r.attempts)),
        cached: false,
      };
    }

    const data = results.map((r) => r.data) as unknown as {
      [K in keyof T]: T[K] extends () => AsyncHookResult<infer U> ? U : never;
    };

    return {
      data,
      error: null,
      loading: false,
      executed,
      duration: Math.max(...results.map((r) => r.duration)),
      attempts: 1,
      cached: results.every((r) => r.cached),
    };
  });
}

/**
 * Create a hook that waits for all results to be ready
 *
 * @param hooks - Object of async hook results
 * @returns Combined object result
 *
 * @example
 * ```typescript
 * const all = useAll({
 *   repo: useRepositoryInfo(),
 *   status: useWorkingDirectoryStatus(),
 * });
 *
 * if (all().data) {
 *   console.log(all().data.repo.root);
 * }
 * ```
 */
export function useAll<T extends Record<string, () => AsyncHookResult<unknown>>>(
  hooks: T,
): () => AsyncHookResult<{ [K in keyof T]: T[K] extends () => AsyncHookResult<infer U> ? U : never }> {
  return useComputed(() => {
    const results: Record<string, AsyncHookResult<unknown>> = {};

    for (const [key, hook] of Object.entries(hooks)) {
      results[key] = hook();
    }

    const loading = Object.values(results).some((r) => r.loading);
    const error = Object.values(results).find((r) => r.error)?.error ?? null;

    if (loading) {
      return {
        data: null,
        error: null,
        loading: true,
        executed: false,
        duration: 0,
        attempts: 0,
        cached: false,
      };
    }

    if (error) {
      return {
        data: null,
        error,
        loading: false,
        executed: true,
        duration: 0,
        attempts: 1,
        cached: false,
      };
    }

    const data = {} as { [K in keyof T]: T[K] extends () => AsyncHookResult<infer U> ? U : never };
    for (const [key, result] of Object.entries(results)) {
      (data as Record<string, unknown>)[key] = result.data;
    }

    return {
      data,
      error: null,
      loading: false,
      executed: true,
      duration: Math.max(...Object.values(results).map((r) => r.duration)),
      attempts: 1,
      cached: Object.values(results).every((r) => r.cached),
    };
  });
}

/**
 * Create a hook that races multiple async results
 *
 * @param hooks - Array of async hook results
 * @returns First completed result
 *
 * @example
 * ```typescript
 * const fastest = useRace([
 *   useSlowSource(),
 *   useFastSource(),
 * ]);
 * ```
 */
export function useRace<T>(
  hooks: readonly (() => AsyncHookResult<T>)[],
): () => AsyncHookResult<T> {
  return useComputed(() => {
    const results = hooks.map((h) => h());

    // Find first non-loading result
    const completed = results.find((r) => !r.loading);

    if (completed) {
      return completed;
    }

    // All still loading
    return {
      data: null,
      error: null,
      loading: true,
      executed: false,
      duration: 0,
      attempts: 0,
      cached: false,
    };
  });
}

// ============================================================================
// Pipeline Composition
// ============================================================================

/**
 * Create a pipeline of async transformations
 *
 * @param stages - Pipeline stages
 * @returns Pipeline executor
 *
 * @example
 * ```typescript
 * const pipeline = usePipeline(
 *   () => useRepositoryInfo()(),
 *   (repo) => repo.data?.root,
 *   async (root) => await fs.readdir(root),
 *   (files) => files.filter(f => f.endsWith('.ts'))
 * );
 *
 * const result = await pipeline.execute();
 * ```
 */
export function usePipeline<T>(...stages: PipelineStage<unknown, unknown>[]): {
  execute: () => Promise<PipelineResult<T>>;
} {
  return {
    async execute(): Promise<PipelineResult<T>> {
      const startTime = Date.now();
      let current: unknown = undefined;

      try {
        for (const stage of stages) {
          current = await stage(current);
        }

        return {
          data: current as T,
          error: null,
          loading: false,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          duration: Date.now() - startTime,
        };
      }
    },
  };
}

/**
 * Chain multiple hooks where each depends on the previous
 *
 * @param initial - Initial hook
 * @param transforms - Transform functions
 * @returns Chained result
 *
 * @example
 * ```typescript
 * const result = useChain(
 *   useRepositoryInfo,
 *   (repo) => useBranchInfo(repo.data?.root),
 *   (branch) => useCommitHistory(branch.data?.name)
 * );
 * ```
 */
export function useChain<A, B>(
  initial: () => AsyncHookResult<A>,
  transform: (result: AsyncHookResult<A>) => () => AsyncHookResult<B>,
): () => AsyncHookResult<B>;
export function useChain<A, B, C>(
  initial: () => AsyncHookResult<A>,
  transform1: (result: AsyncHookResult<A>) => () => AsyncHookResult<B>,
  transform2: (result: AsyncHookResult<B>) => () => AsyncHookResult<C>,
): () => AsyncHookResult<C>;
export function useChain(...args: unknown[]): () => AsyncHookResult<unknown> {
  const [initial, ...transforms] = args as [
    () => AsyncHookResult<unknown>,
    ...((result: AsyncHookResult<unknown>) => () => AsyncHookResult<unknown>)[],
  ];

  return useComputed(() => {
    let current = initial();

    for (const transform of transforms) {
      if (current.loading || current.error) {
        return current;
      }
      current = transform(current)();
    }

    return current;
  });
}

// ============================================================================
// Conditional Composition
// ============================================================================

/**
 * Conditionally execute a hook based on a predicate
 *
 * @param condition - Condition function
 * @param hook - Hook to execute if condition is true
 * @param fallback - Fallback value if condition is false
 * @returns Conditional result
 *
 * @example
 * ```typescript
 * const dirty = useIsDirty();
 *
 * const changes = useConditional(
 *   dirty,
 *   useWorkingDirectoryStatus,
 *   null
 * );
 * ```
 */
export function useConditional<T>(
  condition: () => boolean,
  hook: () => T,
  fallback: T,
): () => T {
  return useComputed(() => {
    if (condition()) {
      return hook();
    }
    return fallback;
  });
}

/**
 * Switch between hooks based on a selector
 *
 * @param selector - Selector function returning key
 * @param cases - Object mapping keys to hooks
 * @param defaultCase - Default hook if no match
 * @returns Selected hook result
 *
 * @example
 * ```typescript
 * const mode = useMode();
 *
 * const data = useSwitch(
 *   mode,
 *   {
 *     simple: useSimpleView,
 *     detailed: useDetailedView,
 *   },
 *   useDefaultView
 * );
 * ```
 */
export function useSwitch<T, K extends string>(
  selector: () => K,
  cases: Record<K, () => T>,
  defaultCase: () => T,
): () => T {
  return useComputed(() => {
    const key = selector();
    const hook = cases[key] ?? defaultCase;
    return hook();
  });
}

// ============================================================================
// Error Boundary Composition
// ============================================================================

/**
 * Wrap a hook with error recovery
 *
 * @param hook - Hook to wrap
 * @param onError - Error handler
 * @param fallback - Fallback value on error
 * @returns Wrapped hook result
 *
 * @example
 * ```typescript
 * const safe = useWithFallback(
 *   useRepositoryInfo,
 *   (error) => console.error('Failed:', error),
 *   { isRepository: false }
 * );
 * ```
 */
export function useWithFallback<T>(
  hook: () => AsyncHookResult<T>,
  onError: (error: Error) => void,
  fallback: T,
): () => AsyncHookResult<T> {
  return useComputed(() => {
    const result = hook();

    if (result.error) {
      onError(result.error);
      return {
        data: fallback,
        error: null,
        loading: false,
        executed: true,
        duration: result.duration,
        attempts: result.attempts,
        cached: false,
      };
    }

    return result;
  });
}

/**
 * Retry a hook on failure
 *
 * @param hook - Hook factory to retry
 * @param options - Retry options
 * @returns Hook with retry logic
 *
 * @example
 * ```typescript
 * const reliable = useRetry(useNetworkData, {
 *   maxRetries: 3,
 *   delay: 1000,
 *   backoff: 2,
 * });
 * ```
 */
export function useRetry<T>(
  hook: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  } = {},
): () => AsyncHookResult<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = () => true,
  } = options;

  const [state, setState] = useState<AsyncHookResult<T>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const startTime = Date.now();

    async function tryHook() {
      while (attempt < maxRetries + 1) {
        try {
          const data = await hook();

          if (cancelled) return;

          setState({
            data,
            error: null,
            loading: false,
            executed: true,
            duration: Date.now() - startTime,
            attempts: attempt + 1,
            cached: false,
          });
          return;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          attempt++;

          if (cancelled) return;

          if (attempt > maxRetries || !shouldRetry(err, attempt)) {
            setState({
              data: null,
              error: err,
              loading: false,
              executed: true,
              duration: Date.now() - startTime,
              attempts: attempt,
              cached: false,
            });
            return;
          }

          // Wait before retrying
          const waitTime = delay * Math.pow(backoff, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    tryHook();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// ============================================================================
// Debounce and Throttle
// ============================================================================

/**
 * Debounce a hook's reactivity
 *
 * @param hook - Hook to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced hook
 *
 * @example
 * ```typescript
 * const status = useDebounced(useWorkingDirectoryStatus, 500);
 * ```
 */
export function useDebounced<T>(
  hook: () => T,
  delay: number,
): () => T {
  const [value, setValue] = useState<T>(hook);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(() => hook());
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  });

  return value;
}

/**
 * Throttle a hook's updates
 *
 * @param hook - Hook to throttle
 * @param interval - Throttle interval in milliseconds
 * @returns Throttled hook
 *
 * @example
 * ```typescript
 * const status = useThrottled(useWorkingDirectoryStatus, 1000);
 * ```
 */
export function useThrottled<T>(
  hook: () => T,
  interval: number,
): () => T {
  const [value, setValue] = useState<T>(hook);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();

    if (now - lastUpdateRef.current >= interval) {
      lastUpdateRef.current = now;
      setValue(() => hook());
    }
  });

  return value;
}

// ============================================================================
// Resource Management
// ============================================================================

/**
 * Create a hook that manages a resource with cleanup
 *
 * @param acquire - Function to acquire the resource
 * @param release - Function to release the resource
 * @returns Resource hook
 *
 * @example
 * ```typescript
 * const [lock, acquired] = useResource(
 *   () => acquireLock('my-lock'),
 *   (lock) => releaseLock(lock)
 * );
 * ```
 */
export function useResource<T>(
  acquire: () => Promise<T>,
  release: (resource: T) => Promise<void> | void,
): readonly [() => T | null, () => boolean] {
  const [resource, setResource] = useState<T | null>(null);
  const [acquired, setAcquired] = useState(false);

  useEffect(() => {
    let current: T | null = null;

    acquire().then((r) => {
      current = r;
      setResource(() => r);
      setAcquired(() => true);
    }).catch(() => {
      setAcquired(() => false);
    });

    return async () => {
      if (current) {
        await release(current);
        setResource(() => null);
        setAcquired(() => false);
      }
    };
  }, []);

  return [resource, acquired] as const;
}
