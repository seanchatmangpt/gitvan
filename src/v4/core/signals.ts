/**
 * GitVan v4 Reactive Signals
 *
 * Core reactive primitives following @unrdf/hooks patterns.
 * Provides fine-grained reactivity for API state management.
 *
 * @packageDocumentation
 * @module @gitvan/v4/core/signals
 */

import type {
  Signal,
  WritableSignal,
  ComputedSignal,
  Effect,
  Disposer,
  HookSubscription,
} from '../types/index.js';

// =============================================================================
// Internal State
// =============================================================================

let currentEffect: EffectImpl | null = null;
let batchDepth = 0;
const pendingEffects = new Set<EffectImpl>();
let effectId = 0;
let signalId = 0;

// =============================================================================
// Signal Implementation
// =============================================================================

/**
 * Internal signal implementation
 */
class SignalImpl<T> implements WritableSignal<T> {
  private _value: T;
  private readonly _initialValue: T;
  private readonly _subscribers = new Set<(value: T) => void>();
  private readonly _id: string;
  private _version = 0;

  constructor(initialValue: T, id?: string) {
    this._value = initialValue;
    this._initialValue = initialValue;
    this._id = id ?? `signal-${++signalId}`;
  }

  /**
   * Get current value (tracks dependency)
   */
  (): T {
    this._trackDependency();
    return this._value;
  }

  /**
   * Get current value without tracking
   */
  peek(): T {
    return this._value;
  }

  /**
   * Check if value is defined
   */
  isDefined(): boolean {
    return this._value !== undefined && this._value !== null;
  }

  /**
   * Set new value
   */
  set(value: T): void {
    if (!Object.is(this._value, value)) {
      this._value = value;
      this._version++;
      this._notifySubscribers();
    }
  }

  /**
   * Update value using transform function
   */
  update(fn: (current: T) => T): void {
    this.set(fn(this._value));
  }

  /**
   * Reset to initial value
   */
  reset(): void {
    this.set(this._initialValue);
  }

  /**
   * Subscribe to changes
   */
  subscribe(callback: (value: T) => void): Disposer {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }

  /**
   * Get signal ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get current version
   */
  get version(): number {
    return this._version;
  }

  private _trackDependency(): void {
    if (currentEffect) {
      currentEffect.addDependency(this);
    }
  }

  private _notifySubscribers(): void {
    if (batchDepth > 0) {
      // Defer notification during batch
      return;
    }
    for (const callback of this._subscribers) {
      try {
        callback(this._value);
      } catch (error) {
        console.error('Error in signal subscriber:', error);
      }
    }
  }
}

// =============================================================================
// Computed Signal Implementation
// =============================================================================

/**
 * Internal computed signal implementation
 */
class ComputedImpl<T> implements ComputedSignal<T> {
  private _value: T | undefined;
  private _isValid = false;
  private readonly _compute: () => T;
  private readonly _dependencies = new Set<SignalImpl<unknown>>();
  private readonly _subscribers = new Set<(value: T) => void>();
  private readonly _id: string;

  constructor(compute: () => T, id?: string) {
    this._compute = compute;
    this._id = id ?? `computed-${++signalId}`;
  }

  /**
   * Get current value (recomputes if stale)
   */
  (): T {
    if (!this._isValid) {
      this._recompute();
    }
    if (currentEffect) {
      // Track this computed as a dependency
      currentEffect.addDependency(this as unknown as SignalImpl<unknown>);
    }
    return this._value!;
  }

  /**
   * Get value without tracking
   */
  peek(): T {
    if (!this._isValid) {
      this._recompute();
    }
    return this._value!;
  }

  /**
   * Check if value is defined
   */
  isDefined(): boolean {
    return this.peek() !== undefined && this.peek() !== null;
  }

  /**
   * Force recomputation
   */
  recompute(): void {
    this._isValid = false;
    this._recompute();
  }

  /**
   * Check if computation is current
   */
  isCurrent(): boolean {
    return this._isValid;
  }

  /**
   * Get dependencies
   */
  get dependencies(): ReadonlyArray<Signal<unknown>> {
    return Array.from(this._dependencies) as unknown as Signal<unknown>[];
  }

  /**
   * Subscribe to changes
   */
  subscribe(callback: (value: T) => void): Disposer {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }

  private _recompute(): void {
    const prevEffect = currentEffect;
    const trackingEffect = new EffectImpl(
      () => {},
      `computed-tracker-${this._id}`
    );
    currentEffect = trackingEffect;

    try {
      const newValue = this._compute();
      if (!Object.is(this._value, newValue)) {
        this._value = newValue;
        this._notifySubscribers();
      }
      this._isValid = true;

      // Update dependencies
      this._dependencies.clear();
      for (const dep of trackingEffect.getDependencies()) {
        this._dependencies.add(dep);
        // Subscribe to dependency changes
        dep.subscribe(() => {
          this._isValid = false;
        });
      }
    } finally {
      currentEffect = prevEffect;
    }
  }

  private _notifySubscribers(): void {
    if (batchDepth > 0) return;
    for (const callback of this._subscribers) {
      try {
        callback(this._value!);
      } catch (error) {
        console.error('Error in computed subscriber:', error);
      }
    }
  }
}

// =============================================================================
// Effect Implementation
// =============================================================================

/**
 * Internal effect implementation
 */
class EffectImpl implements Effect {
  readonly id: string;
  private _isActive = true;
  private readonly _fn: () => void | Promise<void>;
  private readonly _dependencies = new Set<SignalImpl<unknown>>();
  private readonly _cleanups: Disposer[] = [];

  constructor(fn: () => void | Promise<void>, id?: string) {
    this._fn = fn;
    this.id = id ?? `effect-${++effectId}`;
  }

  /**
   * Run the effect
   */
  async run(): Promise<void> {
    if (!this._isActive) return;

    // Clean up previous subscriptions
    for (const cleanup of this._cleanups) {
      await cleanup();
    }
    this._cleanups.length = 0;
    this._dependencies.clear();

    const prevEffect = currentEffect;
    currentEffect = this;

    try {
      await this._fn();
    } finally {
      currentEffect = prevEffect;
    }

    // Subscribe to all tracked dependencies
    for (const dep of this._dependencies) {
      const unsubscribe = dep.subscribe(() => {
        if (this._isActive) {
          pendingEffects.add(this);
          schedulePendingEffects();
        }
      });
      this._cleanups.push(unsubscribe);
    }
  }

  /**
   * Stop the effect
   */
  stop(): void {
    this._isActive = false;
    for (const cleanup of this._cleanups) {
      cleanup();
    }
    this._cleanups.length = 0;
    this._dependencies.clear();
  }

  /**
   * Trigger immediate execution
   */
  trigger(): void {
    if (this._isActive) {
      this.run();
    }
  }

  /**
   * Whether effect is active
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Add a dependency (called during effect execution)
   */
  addDependency(signal: SignalImpl<unknown>): void {
    this._dependencies.add(signal);
  }

  /**
   * Get tracked dependencies
   */
  getDependencies(): Set<SignalImpl<unknown>> {
    return this._dependencies;
  }
}

// =============================================================================
// Effect Scheduler
// =============================================================================

let scheduledFlush = false;

function schedulePendingEffects(): void {
  if (scheduledFlush) return;
  scheduledFlush = true;

  queueMicrotask(() => {
    scheduledFlush = false;
    flushPendingEffects();
  });
}

function flushPendingEffects(): void {
  const effects = Array.from(pendingEffects);
  pendingEffects.clear();

  for (const effect of effects) {
    effect.run();
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Create a writable signal
 *
 * @example
 * ```ts
 * const count = signal(0);
 * console.log(count()); // 0
 * count.set(1);
 * console.log(count()); // 1
 * ```
 */
export function signal<T>(initialValue: T, id?: string): WritableSignal<T> {
  return new SignalImpl(initialValue, id) as unknown as WritableSignal<T>;
}

/**
 * Create a computed signal (derived from other signals)
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const doubled = computed(() => count() * 2);
 * console.log(doubled()); // 0
 * count.set(5);
 * console.log(doubled()); // 10
 * ```
 */
export function computed<T>(compute: () => T, id?: string): ComputedSignal<T> {
  return new ComputedImpl(compute, id) as unknown as ComputedSignal<T>;
}

/**
 * Create a readonly signal from a writable one
 */
export function readonly<T>(sig: WritableSignal<T>): Signal<T> {
  return {
    (): T {
      return sig();
    },
    subscribe: sig.subscribe.bind(sig),
    peek: sig.peek.bind(sig),
    isDefined: sig.isDefined.bind(sig),
  };
}

/**
 * Create an effect that runs when dependencies change
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const stop = effect(() => {
 *   console.log('Count is:', count());
 * });
 * count.set(1); // Logs: "Count is: 1"
 * stop(); // Stop the effect
 * ```
 */
export function effect(fn: () => void | Promise<void>, id?: string): Disposer {
  const eff = new EffectImpl(fn, id);
  eff.run();
  return () => eff.stop();
}

/**
 * Create an effect with explicit dependencies
 */
export function watch<T>(
  source: Signal<T> | (() => T),
  callback: (value: T, previousValue?: T) => void | Promise<void>,
  options?: { immediate?: boolean }
): Disposer {
  let previousValue: T | undefined;
  const getter = typeof source === 'function' && !('subscribe' in source)
    ? source
    : () => (source as Signal<T>)();

  const eff = new EffectImpl(async () => {
    const value = getter();
    if (previousValue !== undefined || options?.immediate) {
      await callback(value, previousValue);
    }
    previousValue = value;
  });

  eff.run();
  return () => eff.stop();
}

/**
 * Batch multiple signal updates
 *
 * @example
 * ```ts
 * const a = signal(0);
 * const b = signal(0);
 * batch(() => {
 *   a.set(1);
 *   b.set(2);
 * }); // Subscribers only notified once
 * ```
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushPendingEffects();
    }
  }
}

/**
 * Run a function without tracking dependencies
 */
export function untrack<T>(fn: () => T): T {
  const prevEffect = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
  }
}

/**
 * Check if currently tracking dependencies
 */
export function isTracking(): boolean {
  return currentEffect !== null;
}

/**
 * Create a subscription to multiple signals
 */
export function subscribe<T extends Signal<unknown>[]>(
  signals: [...T],
  callback: (...values: { [K in keyof T]: T[K] extends Signal<infer V> ? V : never }) => void
): Disposer {
  const disposers: Disposer[] = [];

  for (const sig of signals) {
    disposers.push(
      sig.subscribe(() => {
        const values = signals.map((s) => s.peek()) as any;
        callback(...values);
      })
    );
  }

  return () => {
    for (const dispose of disposers) {
      dispose();
    }
  };
}

/**
 * Create a deferred signal that only updates after delay
 */
export function deferred<T>(
  source: Signal<T>,
  delayMs: number
): Signal<T> {
  const deferredValue = signal(source.peek());
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  source.subscribe((value) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      deferredValue.set(value);
      timeoutId = null;
    }, delayMs);
  });

  return readonly(deferredValue);
}

/**
 * Create a signal that throttles updates
 */
export function throttled<T>(
  source: WritableSignal<T>,
  intervalMs: number
): WritableSignal<T> {
  let lastUpdate = 0;
  let pendingValue: T | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttledSignal = signal(source.peek());

  const update = (value: T) => {
    const now = Date.now();
    const elapsed = now - lastUpdate;

    if (elapsed >= intervalMs) {
      lastUpdate = now;
      throttledSignal.set(value);
    } else {
      pendingValue = value;
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastUpdate = Date.now();
          throttledSignal.set(pendingValue!);
          timeoutId = null;
        }, intervalMs - elapsed);
      }
    }
  };

  source.subscribe(update);

  return {
    ...throttledSignal,
    set: (value: T) => {
      source.set(value);
    },
    update: (fn: (current: T) => T) => {
      source.update(fn);
    },
    reset: () => {
      source.reset();
    },
  } as WritableSignal<T>;
}
