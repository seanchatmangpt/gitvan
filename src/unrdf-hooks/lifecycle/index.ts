/**
 * @fileoverview GitVan v4 - Lifecycle Management Hooks
 *
 * This module provides hooks for managing application lifecycle,
 * initialization, cleanup, and state persistence.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import {
  useState,
  useEffect,
  useMountEffect,
  useRef,
  type HookCleanup,
  type HookPhase,
  onLifecycleChange,
  transitionPhase,
  getCurrentPhase,
} from '../core/index.js';

// ============================================================================
// Lifecycle Types
// ============================================================================

/**
 * Application lifecycle phases
 */
export type AppPhase =
  | 'initializing'
  | 'loading'
  | 'ready'
  | 'running'
  | 'suspending'
  | 'suspended'
  | 'resuming'
  | 'shutting-down'
  | 'terminated';

/**
 * Lifecycle callback
 */
export type LifecycleCallback = () => void | Promise<void>;

/**
 * Lifecycle handler with priority
 */
export interface LifecycleHandler {
  /** Handler callback */
  callback: LifecycleCallback;
  /** Handler priority (lower = earlier) */
  priority: number;
  /** Handler name for debugging */
  name?: string;
}

/**
 * Lifecycle configuration
 */
export interface LifecycleConfig {
  /** Enable automatic cleanup */
  autoCleanup?: boolean;
  /** Cleanup timeout in milliseconds */
  cleanupTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable state persistence */
  persistState?: boolean;
  /** State persistence key */
  persistKey?: string;
}

/**
 * Default lifecycle configuration
 */
export const DEFAULT_LIFECYCLE_CONFIG: Required<LifecycleConfig> = {
  autoCleanup: true,
  cleanupTimeout: 5000,
  debug: false,
  persistState: false,
  persistKey: 'gitvan-state',
} as const;

// ============================================================================
// Lifecycle Manager
// ============================================================================

/**
 * Internal lifecycle state
 */
interface LifecycleState {
  phase: AppPhase;
  startTime: Date;
  lastPhaseChange: Date;
  handlers: {
    mount: LifecycleHandler[];
    unmount: LifecycleHandler[];
    suspend: LifecycleHandler[];
    resume: LifecycleHandler[];
    shutdown: LifecycleHandler[];
  };
  resources: Map<string, { cleanup: LifecycleCallback; priority: number }>;
}

/**
 * Global lifecycle state
 */
let lifecycleState: LifecycleState = {
  phase: 'initializing',
  startTime: new Date(),
  lastPhaseChange: new Date(),
  handlers: {
    mount: [],
    unmount: [],
    suspend: [],
    resume: [],
    shutdown: [],
  },
  resources: new Map(),
};

/**
 * Lifecycle configuration
 */
let lifecycleConfig: Required<LifecycleConfig> = { ...DEFAULT_LIFECYCLE_CONFIG };

// ============================================================================
// Lifecycle Hooks
// ============================================================================

/**
 * Hook to access and manage application lifecycle
 *
 * @returns Lifecycle state and controls
 *
 * @example
 * ```typescript
 * const { phase, transition, onMount, onUnmount } = useLifecycle();
 *
 * onMount(() => {
 *   console.log('App mounted');
 * });
 *
 * onUnmount(() => {
 *   console.log('App unmounting');
 * });
 * ```
 */
export function useLifecycle(): {
  phase: () => AppPhase;
  transition: (newPhase: AppPhase) => Promise<void>;
  onMount: (callback: LifecycleCallback, priority?: number) => () => void;
  onUnmount: (callback: LifecycleCallback, priority?: number) => () => void;
  onSuspend: (callback: LifecycleCallback, priority?: number) => () => void;
  onResume: (callback: LifecycleCallback, priority?: number) => () => void;
  onShutdown: (callback: LifecycleCallback, priority?: number) => () => void;
  uptime: () => number;
  isReady: () => boolean;
} {
  const [phase, setPhase] = useState<AppPhase>(lifecycleState.phase);

  const transition = async (newPhase: AppPhase) => {
    const oldPhase = lifecycleState.phase;

    if (lifecycleConfig.debug) {
      console.log(`[Lifecycle] Transitioning: ${oldPhase} -> ${newPhase}`);
    }

    lifecycleState.phase = newPhase;
    lifecycleState.lastPhaseChange = new Date();
    setPhase(newPhase);

    // Execute phase-specific handlers
    switch (newPhase) {
      case 'ready':
        await executeHandlers(lifecycleState.handlers.mount);
        break;
      case 'suspended':
        await executeHandlers(lifecycleState.handlers.suspend);
        break;
      case 'running':
        if (oldPhase === 'suspended' || oldPhase === 'resuming') {
          await executeHandlers(lifecycleState.handlers.resume);
        }
        break;
      case 'terminated':
        await executeHandlers(lifecycleState.handlers.unmount);
        await executeHandlers(lifecycleState.handlers.shutdown);
        break;
    }

    // Sync with core lifecycle
    await transitionPhase(newPhase as HookPhase);
  };

  const registerHandler = (
    type: keyof typeof lifecycleState.handlers,
    callback: LifecycleCallback,
    priority: number = 0,
  ): (() => void) => {
    const handler: LifecycleHandler = { callback, priority };
    lifecycleState.handlers[type].push(handler);
    lifecycleState.handlers[type].sort((a, b) => a.priority - b.priority);

    return () => {
      const index = lifecycleState.handlers[type].indexOf(handler);
      if (index > -1) {
        lifecycleState.handlers[type].splice(index, 1);
      }
    };
  };

  const uptime = () => Date.now() - lifecycleState.startTime.getTime();

  const isReady = () => {
    const p = phase();
    return p === 'ready' || p === 'running';
  };

  return {
    phase,
    transition,
    onMount: (cb, priority) => registerHandler('mount', cb, priority),
    onUnmount: (cb, priority) => registerHandler('unmount', cb, priority),
    onSuspend: (cb, priority) => registerHandler('suspend', cb, priority),
    onResume: (cb, priority) => registerHandler('resume', cb, priority),
    onShutdown: (cb, priority) => registerHandler('shutdown', cb, priority),
    uptime,
    isReady,
  };
}

/**
 * Execute handlers in priority order
 */
async function executeHandlers(handlers: LifecycleHandler[]): Promise<void> {
  for (const handler of handlers) {
    try {
      if (lifecycleConfig.debug && handler.name) {
        console.log(`[Lifecycle] Executing handler: ${handler.name}`);
      }
      await handler.callback();
    } catch (error) {
      console.error('[Lifecycle] Handler error:', error);
    }
  }
}

/**
 * Hook for initialization logic
 *
 * @param initializer - Initialization function
 * @param deps - Dependencies
 * @returns Initialization state
 *
 * @example
 * ```typescript
 * const { initialized, error, reinitialize } = useInitialize(async () => {
 *   await loadConfig();
 *   await connectDatabase();
 * });
 * ```
 */
export function useInitialize(
  initializer: () => Promise<void> | void,
  deps: readonly unknown[] = [],
): {
  initialized: () => boolean;
  error: () => Error | null;
  reinitialize: () => Promise<void>;
  isInitializing: () => boolean;
} {
  const [state, setState] = useState<{
    initialized: boolean;
    error: Error | null;
    isInitializing: boolean;
  }>({
    initialized: false,
    error: null,
    isInitializing: true,
  });

  const initialize = async () => {
    setState((prev) => ({ ...prev, isInitializing: true, error: null }));

    try {
      await initializer();
      setState({ initialized: true, error: null, isInitializing: false });
    } catch (error) {
      setState({
        initialized: false,
        error: error instanceof Error ? error : new Error(String(error)),
        isInitializing: false,
      });
    }
  };

  useMountEffect(() => {
    initialize();
  });

  const s = state();

  return {
    initialized: () => s.initialized,
    error: () => s.error,
    reinitialize: initialize,
    isInitializing: () => s.isInitializing,
  };
}

/**
 * Hook for cleanup on unmount
 *
 * @param cleanup - Cleanup function
 * @param deps - Dependencies
 *
 * @example
 * ```typescript
 * useCleanup(() => {
 *   closeConnection();
 *   clearCache();
 * });
 * ```
 */
export function useCleanup(
  cleanup: () => void | Promise<void>,
  deps: readonly unknown[] = [],
): void {
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, deps);
}

/**
 * Hook for resource management with automatic cleanup
 *
 * @param name - Resource name for tracking
 * @param acquire - Resource acquisition function
 * @param release - Resource release function
 * @param priority - Cleanup priority
 * @returns Resource access and status
 *
 * @example
 * ```typescript
 * const { resource, isAcquired, release } = useResource(
 *   'database',
 *   async () => await db.connect(),
 *   async (conn) => await conn.close()
 * );
 * ```
 */
export function useManagedResource<T>(
  name: string,
  acquire: () => Promise<T>,
  release: (resource: T) => Promise<void> | void,
  priority: number = 0,
): {
  resource: () => T | null;
  isAcquired: () => boolean;
  release: () => Promise<void>;
  error: () => Error | null;
} {
  const [state, setState] = useState<{
    resource: T | null;
    isAcquired: boolean;
    error: Error | null;
  }>({
    resource: null,
    isAcquired: false,
    error: null,
  });

  useMountEffect(() => {
    let current: T | null = null;

    acquire()
      .then((r) => {
        current = r;
        setState({ resource: r, isAcquired: true, error: null });

        // Register for lifecycle cleanup
        lifecycleState.resources.set(name, {
          cleanup: async () => {
            if (current) {
              await release(current);
            }
          },
          priority,
        });
      })
      .catch((error) => {
        setState({
          resource: null,
          isAcquired: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return async () => {
      if (current) {
        await release(current);
        lifecycleState.resources.delete(name);
      }
    };
  });

  const manualRelease = async () => {
    const r = state().resource;
    if (r) {
      await release(r);
      setState({ resource: null, isAcquired: false, error: null });
      lifecycleState.resources.delete(name);
    }
  };

  const s = state();

  return {
    resource: () => s.resource,
    isAcquired: () => s.isAcquired,
    release: manualRelease,
    error: () => s.error,
  };
}

/**
 * Hook for async initialization with loading state
 *
 * @param loader - Async loader function
 * @param deps - Dependencies
 * @returns Loading state
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useAsyncInit(async () => {
 *   const config = await loadConfig();
 *   const data = await fetchData(config);
 *   return data;
 * });
 * ```
 */
export function useAsyncInit<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
): {
  data: () => T | null;
  isLoading: () => boolean;
  error: () => Error | null;
  reload: () => Promise<void>;
} {
  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: true,
    error: null,
  });

  const load = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const data = await loader();
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };

  useMountEffect(() => {
    load();
  });

  const s = state();

  return {
    data: () => s.data,
    isLoading: () => s.isLoading,
    error: () => s.error,
    reload: load,
  };
}

/**
 * Hook for interval-based execution
 *
 * @param callback - Callback to execute
 * @param interval - Interval in milliseconds
 * @param options - Interval options
 * @returns Interval controls
 *
 * @example
 * ```typescript
 * const { start, stop, isRunning } = useInterval(() => {
 *   refreshData();
 * }, 5000, { immediate: true });
 * ```
 */
export function useInterval(
  callback: () => void | Promise<void>,
  interval: number,
  options: {
    immediate?: boolean;
    enabled?: boolean;
  } = {},
): {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
} {
  const { immediate = false, enabled = true } = options;
  const [isRunning, setIsRunning] = useState(enabled);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (intervalRef.current) return;

    if (immediate) {
      callback();
    }

    intervalRef.current = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error('[useInterval] Callback error:', error);
      }
    }, interval);

    setIsRunning(() => true);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(() => false);
  };

  useEffect(() => {
    if (enabled) {
      start();
    }

    return stop;
  }, [enabled, interval]);

  return {
    start,
    stop,
    isRunning,
  };
}

/**
 * Hook for timeout-based execution
 *
 * @param callback - Callback to execute
 * @param delay - Delay in milliseconds
 * @returns Timeout controls
 *
 * @example
 * ```typescript
 * const { start, cancel, isActive } = useTimeout(() => {
 *   showNotification();
 * }, 3000);
 * ```
 */
export function useTimeout(
  callback: () => void | Promise<void>,
  delay: number,
): {
  start: () => void;
  cancel: () => void;
  isActive: () => boolean;
} {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsActive(() => true);

    timeoutRef.current = setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        console.error('[useTimeout] Callback error:', error);
      }
      setIsActive(() => false);
      timeoutRef.current = null;
    }, delay);
  };

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsActive(() => false);
  };

  useEffect(() => {
    return cancel;
  }, []);

  return {
    start,
    cancel,
    isActive,
  };
}

/**
 * Hook for deferred execution after idle
 *
 * @param callback - Callback to execute when idle
 * @param options - Idle options
 * @returns Idle state
 *
 * @example
 * ```typescript
 * useIdle(() => {
 *   performBackgroundTask();
 * }, { timeout: 5000 });
 * ```
 */
export function useIdle(
  callback: () => void | Promise<void>,
  options: { timeout?: number } = {},
): { isIdle: () => boolean } {
  const { timeout = 1000 } = options;
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsIdle(() => false);

    timeoutRef.current = setTimeout(async () => {
      setIsIdle(() => true);
      try {
        await callback();
      } catch (error) {
        console.error('[useIdle] Callback error:', error);
      }
    }, timeout);
  };

  useMountEffect(() => {
    resetTimer();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  });

  return { isIdle };
}

/**
 * Configure lifecycle settings
 *
 * @param config - Lifecycle configuration
 */
export function configureLifecycle(config: Partial<LifecycleConfig>): void {
  lifecycleConfig = { ...lifecycleConfig, ...config };
}

/**
 * Shutdown and cleanup all resources
 *
 * @returns Promise that resolves when shutdown is complete
 */
export async function shutdown(): Promise<void> {
  const lifecycle = useLifecycle();

  // Transition to shutting down
  await lifecycle.transition('shutting-down');

  // Clean up resources in reverse priority order
  const resources = Array.from(lifecycleState.resources.entries())
    .sort(([, a], [, b]) => b.priority - a.priority);

  for (const [name, { cleanup }] of resources) {
    if (lifecycleConfig.debug) {
      console.log(`[Lifecycle] Cleaning up resource: ${name}`);
    }

    try {
      await Promise.race([
        cleanup(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Cleanup timeout for ${name}`)),
            lifecycleConfig.cleanupTimeout,
          ),
        ),
      ]);
    } catch (error) {
      console.error(`[Lifecycle] Cleanup error for ${name}:`, error);
    }
  }

  // Transition to terminated
  await lifecycle.transition('terminated');

  // Clear state
  lifecycleState.resources.clear();
}

/**
 * Reset lifecycle state (primarily for testing)
 */
export function resetLifecycle(): void {
  lifecycleState = {
    phase: 'initializing',
    startTime: new Date(),
    lastPhaseChange: new Date(),
    handlers: {
      mount: [],
      unmount: [],
      suspend: [],
      resume: [],
      shutdown: [],
    },
    resources: new Map(),
  };
  lifecycleConfig = { ...DEFAULT_LIFECYCLE_CONFIG };
}
