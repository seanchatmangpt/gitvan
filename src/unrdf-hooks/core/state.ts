/**
 * @fileoverview GitVan v4 - @unrdf/hooks State Management
 *
 * This module provides the core state management primitives for the hooks system.
 * Implements reactive state with signals, computed values, and effect tracking.
 * Designed for TypeScript strict mode with full type inference.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import type {
  HookStateResult,
  HookStateInitializer,
  HookStateSetter,
  HookSubscriber,
  HookUnsubscribe,
  HookSubscriptionOptions,
  HookCleanup,
  HookDependencies,
} from './types.js';
import { isFunction } from './types.js';

// ============================================================================
// Signal Implementation
// ============================================================================

/**
 * Internal signal tracking for dependency collection
 */
let currentEffect: (() => void) | null = null;
let effectBatch: Set<() => void> | null = null;

/**
 * Start batching signal updates
 * Defers subscriber notifications until batch is ended
 */
export function startBatch(): void {
  if (effectBatch === null) {
    effectBatch = new Set();
  }
}

/**
 * End batching and notify all pending subscribers
 */
export function endBatch(): void {
  if (effectBatch !== null) {
    const batch = effectBatch;
    effectBatch = null;
    for (const effect of batch) {
      effect();
    }
  }
}

/**
 * Execute a function within a batch context
 * All signal updates will be deferred until the function completes
 *
 * @param fn - Function to execute in batch
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * batch(() => {
 *   setCount(count() + 1);
 *   setName('new name');
 *   // Subscribers only notified once at the end
 * });
 * ```
 */
export function batch<T>(fn: () => T): T {
  startBatch();
  try {
    return fn();
  } finally {
    endBatch();
  }
}

/**
 * Core signal class implementing reactive state
 * Tracks dependencies and notifies subscribers on changes
 */
class Signal<T> {
  private value: T;
  private subscribers = new Set<() => void>();
  private disposed = false;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Get the current signal value
   * Automatically tracks the current effect as a dependency
   */
  get(): T {
    if (currentEffect !== null) {
      this.subscribers.add(currentEffect);
    }
    return this.value;
  }

  /**
   * Set a new signal value
   * Notifies all subscribers if value changed
   */
  set(newValue: T): void {
    if (this.disposed) {
      throw new Error('Cannot set value on disposed signal');
    }

    if (!Object.is(this.value, newValue)) {
      this.value = newValue;
      this.notify();
    }
  }

  /**
   * Update value using a setter function
   */
  update(setter: HookStateSetter<T>): void {
    const newValue = isFunction(setter) ? setter(this.value) : setter;
    this.set(newValue);
  }

  /**
   * Notify all subscribers of value change
   */
  private notify(): void {
    for (const subscriber of this.subscribers) {
      if (effectBatch !== null) {
        effectBatch.add(subscriber);
      } else {
        subscriber();
      }
    }
  }

  /**
   * Subscribe to value changes
   */
  subscribe(
    callback: HookSubscriber<T>,
    options: HookSubscriptionOptions = {},
  ): HookUnsubscribe {
    const { immediate = false, debounce = 0, distinct = true } = options;
    let lastValue = this.value;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const notify = () => {
      const currentValue = this.value;
      if (distinct && Object.is(currentValue, lastValue)) {
        return;
      }
      lastValue = currentValue;
      callback(currentValue);
    };

    const debouncedNotify = debounce > 0
      ? () => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(notify, debounce);
        }
      : notify;

    this.subscribers.add(debouncedNotify);

    if (immediate) {
      callback(this.value);
    }

    return () => {
      this.subscribers.delete(debouncedNotify);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Dispose the signal and clear subscribers
   */
  dispose(): void {
    this.disposed = true;
    this.subscribers.clear();
  }
}

// ============================================================================
// State Hook
// ============================================================================

/**
 * Create a reactive state value
 * Returns a getter function and a setter function
 *
 * @param initialValue - Initial state value or factory function
 * @returns Tuple of [getter, setter]
 *
 * @example
 * ```typescript
 * const [count, setCount] = useState(0);
 * console.log(count()); // 0
 * setCount(5);
 * console.log(count()); // 5
 * setCount(prev => prev + 1);
 * console.log(count()); // 6
 * ```
 */
export function useState<T>(
  initialValue: HookStateInitializer<T>,
): readonly [() => T, (setter: HookStateSetter<T>) => void] {
  const initial = isFunction(initialValue) ? initialValue() : initialValue;
  const signal = new Signal(initial);

  return [
    () => signal.get(),
    (setter: HookStateSetter<T>) => signal.update(setter),
  ] as const;
}

/**
 * Create a ref - mutable container without reactivity
 * Useful for storing values that don't need to trigger re-renders
 *
 * @param initialValue - Initial value
 * @returns Object with current property
 *
 * @example
 * ```typescript
 * const countRef = useRef(0);
 * countRef.current++; // No reactivity triggered
 * ```
 */
export function useRef<T>(initialValue: T): { current: T } {
  return { current: initialValue };
}

// ============================================================================
// Computed Hook
// ============================================================================

/**
 * Create a computed value that automatically updates when dependencies change
 *
 * @param compute - Computation function
 * @returns Getter function for computed value
 *
 * @example
 * ```typescript
 * const [firstName, setFirstName] = useState('John');
 * const [lastName, setLastName] = useState('Doe');
 *
 * const fullName = useComputed(() => `${firstName()} ${lastName()}`);
 * console.log(fullName()); // 'John Doe'
 *
 * setFirstName('Jane');
 * console.log(fullName()); // 'Jane Doe'
 * ```
 */
export function useComputed<T>(compute: () => T): () => T {
  let cachedValue: T;
  let isDirty = true;
  const dependencySignal = new Signal<number>(0);

  // Track dependencies on first computation
  const recompute = () => {
    isDirty = true;
    dependencySignal.update((v) => v + 1);
  };

  return () => {
    // Track this computed in any parent effect
    dependencySignal.get();

    if (isDirty) {
      const previousEffect = currentEffect;
      currentEffect = recompute;
      try {
        cachedValue = compute();
        isDirty = false;
      } finally {
        currentEffect = previousEffect;
      }
    }
    return cachedValue;
  };
}

// ============================================================================
// Effect Hook
// ============================================================================

/**
 * Create an effect that runs when dependencies change
 * Returns a cleanup function
 *
 * @param effect - Effect function (may return cleanup)
 * @param deps - Optional dependency array
 * @returns Cleanup function
 *
 * @example
 * ```typescript
 * const [count, setCount] = useState(0);
 *
 * const cleanup = useEffect(() => {
 *   console.log('Count changed to:', count());
 *
 *   return () => {
 *     console.log('Cleaning up...');
 *   };
 * });
 *
 * setCount(1); // Logs: "Count changed to: 1"
 * cleanup(); // Logs: "Cleaning up..."
 * ```
 */
export function useEffect(
  effect: () => HookCleanup | void,
  deps?: HookDependencies,
): HookCleanup {
  let cleanup: HookCleanup | void;
  let previousDeps: HookDependencies | undefined;
  let isFirst = true;

  const runEffect = async () => {
    // Clean up previous effect
    if (cleanup) {
      await cleanup();
    }

    // Run new effect
    cleanup = effect();
  };

  // If deps provided, only run when deps change
  if (deps !== undefined) {
    const depsChanged = () => {
      if (isFirst) {
        isFirst = false;
        previousDeps = [...deps];
        return true;
      }

      if (previousDeps === undefined || previousDeps.length !== deps.length) {
        previousDeps = [...deps];
        return true;
      }

      for (let i = 0; i < deps.length; i++) {
        if (!Object.is(deps[i], previousDeps[i])) {
          previousDeps = [...deps];
          return true;
        }
      }
      return false;
    };

    if (depsChanged()) {
      runEffect();
    }

    // Return cleanup that also handles dep tracking
    return async () => {
      if (cleanup) {
        await cleanup();
      }
    };
  }

  // Auto-track dependencies if no deps array provided
  const previousEffect = currentEffect;
  currentEffect = () => {
    runEffect();
  };

  try {
    runEffect();
  } finally {
    currentEffect = previousEffect;
  }

  return async () => {
    if (cleanup) {
      await cleanup();
    }
  };
}

/**
 * Create an effect that runs on mount only
 *
 * @param effect - Effect function
 * @returns Cleanup function
 *
 * @example
 * ```typescript
 * const cleanup = useMountEffect(() => {
 *   console.log('Mounted!');
 *   return () => console.log('Unmounted!');
 * });
 * ```
 */
export function useMountEffect(effect: () => HookCleanup | void): HookCleanup {
  return useEffect(effect, []);
}

// ============================================================================
// Memo Hook
// ============================================================================

/**
 * Memoize a value, recomputing only when dependencies change
 *
 * @param factory - Factory function to compute value
 * @param deps - Dependency array
 * @returns Memoized value
 *
 * @example
 * ```typescript
 * const [items, setItems] = useState([1, 2, 3]);
 *
 * const sum = useMemo(() => {
 *   return items().reduce((a, b) => a + b, 0);
 * }, [items]);
 *
 * console.log(sum()); // 6
 * ```
 */
export function useMemo<T>(
  factory: () => T,
  deps: HookDependencies,
): () => T {
  let cachedValue: T;
  let previousDeps: unknown[] | undefined;
  let isComputed = false;

  return () => {
    const depsChanged = () => {
      if (!isComputed) {
        return true;
      }

      if (previousDeps === undefined || previousDeps.length !== deps.length) {
        return true;
      }

      for (let i = 0; i < deps.length; i++) {
        const depValue = typeof deps[i] === 'function'
          ? (deps[i] as () => unknown)()
          : deps[i];
        if (!Object.is(depValue, previousDeps[i])) {
          return true;
        }
      }
      return false;
    };

    if (depsChanged()) {
      previousDeps = deps.map((dep) =>
        typeof dep === 'function' ? (dep as () => unknown)() : dep,
      );
      cachedValue = factory();
      isComputed = true;
    }

    return cachedValue;
  };
}

/**
 * Memoize a callback function
 *
 * @param callback - Callback function to memoize
 * @param deps - Dependency array
 * @returns Memoized callback
 *
 * @example
 * ```typescript
 * const [count, setCount] = useState(0);
 *
 * const handleClick = useCallback(() => {
 *   setCount(prev => prev + 1);
 * }, []);
 * ```
 */
export function useCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: HookDependencies,
): () => T {
  return useMemo(() => callback, deps);
}

// ============================================================================
// Reducer Hook
// ============================================================================

/**
 * Reducer action type
 */
export type ReducerAction<T = unknown> = {
  type: string;
  payload?: T;
};

/**
 * Reducer function type
 */
export type Reducer<S, A> = (state: S, action: A) => S;

/**
 * Create a reducer-based state
 *
 * @param reducer - Reducer function
 * @param initialState - Initial state
 * @returns Tuple of [state getter, dispatch function]
 *
 * @example
 * ```typescript
 * type CounterAction = { type: 'increment' } | { type: 'decrement' };
 *
 * const counterReducer = (state: number, action: CounterAction) => {
 *   switch (action.type) {
 *     case 'increment': return state + 1;
 *     case 'decrement': return state - 1;
 *   }
 * };
 *
 * const [count, dispatch] = useReducer(counterReducer, 0);
 * dispatch({ type: 'increment' });
 * console.log(count()); // 1
 * ```
 */
export function useReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: HookStateInitializer<S>,
): readonly [() => S, (action: A) => void] {
  const [state, setState] = useState(initialState);

  const dispatch = (action: A) => {
    setState((currentState) => reducer(currentState, action));
  };

  return [state, dispatch] as const;
}

// ============================================================================
// Watch Hook
// ============================================================================

/**
 * Watch a value and execute callback on changes
 *
 * @param source - Source getter function
 * @param callback - Callback to execute on change
 * @param options - Watch options
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const [count, setCount] = useState(0);
 *
 * const unwatch = useWatch(
 *   count,
 *   (newValue, oldValue) => {
 *     console.log(`Changed from ${oldValue} to ${newValue}`);
 *   },
 *   { immediate: true }
 * );
 * ```
 */
export function useWatch<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T | undefined) => void,
  options: HookSubscriptionOptions = {},
): HookUnsubscribe {
  const { immediate = false, debounce = 0 } = options;
  let oldValue: T | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const check = () => {
    const newValue = source();
    if (!Object.is(newValue, oldValue) || immediate && oldValue === undefined) {
      const previous = oldValue;
      oldValue = newValue;

      if (debounce > 0) {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          callback(newValue, previous);
        }, debounce);
      } else {
        callback(newValue, previous);
      }
    }
  };

  // Set up effect to track the source
  const cleanup = useEffect(() => {
    check();
  });

  return () => {
    cleanup();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  };
}
