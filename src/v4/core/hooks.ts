/**
 * GitVan v4 Core Hooks
 *
 * Composable hooks for building reactive APIs following @unrdf/hooks patterns.
 *
 * @packageDocumentation
 * @module @gitvan/v4/core/hooks
 */

import type {
  HookState,
  Disposer,
  ApiRequest,
  ApiResponse,
  ValidationError,
  HookPriority,
  Effect,
} from '../types/index.js';
import {
  signal,
  computed,
  effect,
  watch,
  batch,
  type WritableSignal,
  type Signal,
  type ComputedSignal,
} from './signals.js';
// Simple logger for error reporting
const logger = {
  error: (...args: any[]) => {
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
    } else {
      console.error(...args);
    }
  }
};

import {
  getCurrentContext,
  createContext,
  runInContext,
  onCleanup,
  inject,
  tryInject,
  Tokens,
} from './context.js';

// =============================================================================
// State Hooks
// =============================================================================

/**
 * Create a reactive state with metadata tracking
 *
 * @example
 * ```ts
 * const [state, setState] = useState({ count: 0 });
 * setState({ count: state.value.count + 1 });
 * ```
 */
export function useState<T>(
  initialValue: T
): [HookState<T>, (value: T | ((prev: T) => T)) => void] {
  const valueSignal = signal(initialValue);
  const versionSignal = signal(0);
  const updatedAtSignal = signal(Date.now());
  const isStaleSignal = signal(false);
  const isPendingSignal = signal(false);
  const errorSignal = signal<Error | undefined>(undefined);
  const previousValueSignal = signal<T | undefined>(undefined);

  const state: HookState<T> = {
    get value() {
      return valueSignal();
    },
    get previousValue() {
      return previousValueSignal();
    },
    get version() {
      return versionSignal();
    },
    get updatedAt() {
      return updatedAtSignal();
    },
    get isStale() {
      return isStaleSignal();
    },
    get isPending() {
      return isPendingSignal();
    },
    get error() {
      return errorSignal();
    },
  };

  const setState = (valueOrFn: T | ((prev: T) => T)): void => {
    batch(() => {
      previousValueSignal.set(valueSignal.peek());
      const newValue =
        typeof valueOrFn === 'function'
          ? (valueOrFn as (prev: T) => T)(valueSignal.peek())
          : valueOrFn;
      valueSignal.set(newValue);
      versionSignal.update((v) => v + 1);
      updatedAtSignal.set(Date.now());
      isStaleSignal.set(false);
      errorSignal.set(undefined);
    });
  };

  return [state, setState];
}

/**
 * Create a reducer-based state
 *
 * @example
 * ```ts
 * const [state, dispatch] = useReducer(
 *   (state, action) => {
 *     switch (action.type) {
 *       case 'increment': return { count: state.count + 1 };
 *       default: return state;
 *     }
 *   },
 *   { count: 0 }
 * );
 * dispatch({ type: 'increment' });
 * ```
 */
export function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S
): [Signal<S>, (action: A) => void] {
  const stateSignal = signal(initialState);

  const dispatch = (action: A): void => {
    stateSignal.update((current) => reducer(current, action));
  };

  return [stateSignal, dispatch];
}

// =============================================================================
// Effect Hooks
// =============================================================================

/**
 * Run an effect when dependencies change
 *
 * @example
 * ```ts
 * const count = signal(0);
 * useEffect(() => {
 *   console.log('Count changed:', count());
 *   return () => console.log('Cleanup');
 * });
 * ```
 */
export function useEffect(
  effectFn: () => void | Disposer | Promise<void | Disposer>
): Disposer {
  let cleanup: Disposer | void;

  const stop = effect(async () => {
    // Run previous cleanup
    if (cleanup) {
      await cleanup();
    }
    // Run effect and capture new cleanup
    cleanup = await effectFn();
  });

  // Register context cleanup
  onCleanup(async () => {
    stop();
    if (cleanup) {
      await cleanup();
    }
  });

  return stop;
}

/**
 * Run an effect only once on mount
 */
export function useMountEffect(
  effectFn: () => void | Disposer | Promise<void | Disposer>
): void {
  let hasRun = false;
  let cleanup: Disposer | void;

  const ctx = getCurrentContext();
  if (!hasRun) {
    hasRun = true;
    Promise.resolve(effectFn()).then((c) => {
      cleanup = c;
    });
  }

  if (ctx) {
    onCleanup(async () => {
      if (cleanup) {
        await cleanup();
      }
    });
  }
}

/**
 * Run an effect when specific signals change
 */
export function useWatch<T>(
  source: Signal<T> | (() => T),
  callback: (value: T, previousValue?: T) => void | Promise<void>,
  options?: { immediate?: boolean; deep?: boolean }
): Disposer {
  const stop = watch(source, callback, options);
  onCleanup(stop);
  return stop;
}

// =============================================================================
// Memo Hooks
// =============================================================================

/**
 * Memoize a computed value
 *
 * @example
 * ```ts
 * const expensiveValue = useMemo(() => {
 *   return heavyComputation(input());
 * });
 * ```
 */
export function useMemo<T>(computeFn: () => T): ComputedSignal<T> {
  return computed(computeFn);
}

/**
 * Memoize a callback function
 */
export function useCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps?: unknown[]
): T {
  const cachedCallback = signal<T>(callback);
  const cachedDeps = signal<unknown[] | undefined>(deps);

  // Update callback if deps change
  if (deps) {
    const prevDeps = cachedDeps.peek();
    if (
      !prevDeps ||
      deps.length !== prevDeps.length ||
      deps.some((d, i) => !Object.is(d, prevDeps[i]))
    ) {
      cachedCallback.set(callback);
      cachedDeps.set(deps);
    }
  }

  return cachedCallback.peek();
}

// =============================================================================
// Ref Hooks
// =============================================================================

/**
 * Create a mutable ref that doesn't trigger re-renders
 *
 * @example
 * ```ts
 * const countRef = useRef(0);
 * countRef.current++; // No re-render triggered
 * ```
 */
export function useRef<T>(initialValue: T): { current: T } {
  return { current: initialValue };
}

/**
 * Create a ref that persists across context recreations
 */
export function usePersistentRef<T>(
  key: string,
  initialValue: T
): { current: T } {
  const cache = tryInject(Tokens.Cache) ?? new Map<string, unknown>();

  if (!cache.has(key)) {
    cache.set(key, { current: initialValue });
  }

  return cache.get(key) as { current: T };
}

// =============================================================================
// Async Hooks
// =============================================================================

/**
 * Async state result
 */
export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

/**
 * Handle async data fetching with automatic state management
 *
 * @example
 * ```ts
 * const { data, isLoading, error } = useAsync(async () => {
 *   return await fetchData();
 * });
 * ```
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options?: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
): AsyncState<T> {
  const dataSignal = signal<T | undefined>(undefined);
  const errorSignal = signal<Error | undefined>(undefined);
  const isLoadingSignal = signal(options?.immediate !== false);

  const execute = async (): Promise<void> => {
    isLoadingSignal.set(true);
    errorSignal.set(undefined);

    try {
      const result = await asyncFn();
      dataSignal.set(result);
      options?.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      errorSignal.set(error);
      options?.onError?.(error);
    } finally {
      isLoadingSignal.set(false);
    }
  };

  if (options?.immediate !== false) {
    execute();
  }

  return {
    get data() {
      return dataSignal();
    },
    get error() {
      return errorSignal();
    },
    get isLoading() {
      return isLoadingSignal();
    },
    get isSuccess() {
      return dataSignal() !== undefined && !errorSignal();
    },
    get isError() {
      return errorSignal() !== undefined;
    },
    refetch: execute,
  };
}

/**
 * Debounced async execution
 */
export function useDebouncedAsync<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  delayMs: number
): (...args: Args) => Promise<T | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolveRef: ((value: T | undefined) => void) | null = null;

  const debouncedFn = (...args: Args): Promise<T | undefined> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        resolveRef?.(undefined);
      }

      resolveRef = resolve;
      timeoutId = setTimeout(async () => {
        const result = await asyncFn(...args);
        resolve(result);
        timeoutId = null;
        resolveRef = null;
      }, delayMs);
    });
  };

  onCleanup(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return debouncedFn;
}

// =============================================================================
// Resource Hooks
// =============================================================================

/**
 * Resource state with loading, error, and data
 */
export interface Resource<T> {
  (): T | undefined;
  loading: Signal<boolean>;
  error: Signal<Error | undefined>;
  refetch: () => Promise<void>;
  mutate: (value: T) => void;
}

/**
 * Create a resource with automatic fetching
 *
 * @example
 * ```ts
 * const users = useResource(async () => {
 *   return await api.getUsers();
 * });
 *
 * // Access data
 * const userList = users();
 * ```
 */
export function useResource<T>(
  fetcher: () => Promise<T>,
  options?: {
    initialValue?: T;
    refetchInterval?: number;
    onError?: (error: Error) => void;
  }
): Resource<T> {
  const dataSignal = signal<T | undefined>(options?.initialValue);
  const loadingSignal = signal(true);
  const errorSignal = signal<Error | undefined>(undefined);

  const fetch = async (): Promise<void> => {
    loadingSignal.set(true);
    errorSignal.set(undefined);

    try {
      const result = await fetcher();
      dataSignal.set(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      errorSignal.set(error);
      options?.onError?.(error);
    } finally {
      loadingSignal.set(false);
    }
  };

  // Initial fetch
  fetch();

  // Refetch interval
  if (options?.refetchInterval) {
    const intervalId = setInterval(fetch, options.refetchInterval);
    onCleanup(() => clearInterval(intervalId));
  }

  const resource: Resource<T> = Object.assign(
    () => dataSignal(),
    {
      loading: loadingSignal,
      error: errorSignal,
      refetch: fetch,
      mutate: (value: T) => dataSignal.set(value),
    }
  );

  return resource;
}

// =============================================================================
// Event Hooks
// =============================================================================

/**
 * Event handler registry
 */
export interface EventRegistry<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void
  ): Disposer;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void;
  once<K extends keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void
  ): Disposer;
}

/**
 * Create an event registry
 *
 * @example
 * ```ts
 * const events = useEvents<{
 *   userCreated: { id: string; name: string };
 *   userDeleted: { id: string };
 * }>();
 *
 * events.on('userCreated', (user) => {
 *   console.log('User created:', user.name);
 * });
 *
 * events.emit('userCreated', { id: '1', name: 'John' });
 * ```
 */
export function useEvents<
  Events extends Record<string, unknown>
>(): EventRegistry<Events> {
  const handlers = new Map<keyof Events, Set<(payload: unknown) => void>>();

  const on = <K extends keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void
  ): Disposer => {
    if (!handlers.has(event)) {
      handlers.set(event, new Set());
    }
    handlers.get(event)!.add(handler as (payload: unknown) => void);

    const unsubscribe = () => {
      handlers.get(event)?.delete(handler as (payload: unknown) => void);
    };

    onCleanup(unsubscribe);
    return unsubscribe;
  };

  const emit = <K extends keyof Events>(event: K, payload: Events[K]): void => {
    handlers.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.error(`Error in event handler for ${String(event)}:`, error);
      }
    });
  };

  const off = <K extends keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void
  ): void => {
    handlers.get(event)?.delete(handler as (payload: unknown) => void);
  };

  const once = <K extends keyof Events>(
    event: K,
    handler: (payload: Events[K]) => void
  ): Disposer => {
    const wrappedHandler = (payload: Events[K]) => {
      handler(payload);
      off(event, wrappedHandler);
    };
    return on(event, wrappedHandler);
  };

  return { on, emit, off, once };
}

// =============================================================================
// Lifecycle Hooks
// =============================================================================

/**
 * Run callback when hook mounts
 */
export function onMount(callback: () => void | Promise<void>): void {
  useMountEffect(callback);
}

/**
 * Run callback when hook unmounts
 */
export function onUnmount(callback: () => void | Promise<void>): void {
  onCleanup(callback);
}

/**
 * Run callback on every update
 */
export function onUpdate(callback: () => void): Disposer {
  return useEffect(callback);
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Get a unique ID
 */
let idCounter = 0;
export function useId(prefix = 'hook'): string {
  const id = usePersistentRef(`${prefix}-id`, `${prefix}-${++idCounter}`);
  return id.current;
}

/**
 * Toggle boolean state
 */
export function useToggle(
  initialValue = false
): [Signal<boolean>, () => void, (value: boolean) => void] {
  const valueSignal = signal(initialValue);
  const toggle = () => valueSignal.update((v) => !v);
  const setValue = (value: boolean) => valueSignal.set(value);

  return [valueSignal, toggle, setValue];
}

/**
 * Counter state
 */
export function useCounter(
  initialValue = 0,
  options?: { min?: number; max?: number; step?: number }
): {
  count: Signal<number>;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
} {
  const countSignal = signal(initialValue);
  const { min = -Infinity, max = Infinity, step = 1 } = options ?? {};

  const clamp = (value: number) => Math.min(max, Math.max(min, value));

  return {
    count: countSignal,
    increment: () => countSignal.update((v) => clamp(v + step)),
    decrement: () => countSignal.update((v) => clamp(v - step)),
    reset: () => countSignal.set(initialValue),
    set: (value: number) => countSignal.set(clamp(value)),
  };
}

/**
 * Previous value tracking
 */
export function usePrevious<T>(value: Signal<T>): Signal<T | undefined> {
  const previousSignal = signal<T | undefined>(undefined);

  watch(value, (_, prev) => {
    previousSignal.set(prev);
  });

  return previousSignal;
}

/**
 * Interval hook
 */
export function useInterval(
  callback: () => void,
  delayMs: number | null
): { start: () => void; stop: () => void; isRunning: Signal<boolean> } {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const isRunningSignal = signal(false);

  const start = () => {
    if (delayMs !== null && !intervalId) {
      intervalId = setInterval(callback, delayMs);
      isRunningSignal.set(true);
    }
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      isRunningSignal.set(false);
    }
  };

  onCleanup(stop);

  // Auto-start if delay is provided
  if (delayMs !== null) {
    start();
  }

  return { start, stop, isRunning: isRunningSignal };
}

/**
 * Timeout hook
 */
export function useTimeout(
  callback: () => void,
  delayMs: number | null
): { start: () => void; cancel: () => void; isPending: Signal<boolean> } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const isPendingSignal = signal(false);

  const start = () => {
    if (delayMs !== null && !timeoutId) {
      isPendingSignal.set(true);
      timeoutId = setTimeout(() => {
        callback();
        isPendingSignal.set(false);
        timeoutId = null;
      }, delayMs);
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      isPendingSignal.set(false);
    }
  };

  onCleanup(cancel);

  return { start, cancel, isPending: isPendingSignal };
}
