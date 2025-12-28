/**
 * @fileoverview GitVan v4 - Event Handling Hooks
 *
 * This module provides hooks for event-driven programming patterns.
 * Implements a reactive event bus with subscription management.
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
  tryUseHookContext,
} from '../core/index.js';

import type {
  EventType,
  EventPayload,
  EventHandler,
  EventSubscription,
  EventSubscriptionOptions,
  EventEmitter,
  EventBusConfig,
  EventHistoryEntry,
  GenericEventPayload,
} from './types.js';

import { DEFAULT_EVENT_BUS_CONFIG } from './types.js';

// ============================================================================
// Event Bus Implementation
// ============================================================================

/**
 * Internal subscription data
 */
interface InternalSubscription<T extends EventPayload = EventPayload> {
  id: string;
  eventType: EventType;
  handler: EventHandler<T>;
  options: EventSubscriptionOptions;
  isActive: boolean;
  lastEmit?: number;
}

/**
 * Global event bus singleton
 */
class EventBus implements EventEmitter {
  private subscriptions = new Map<EventType, InternalSubscription[]>();
  private subscriptionById = new Map<string, InternalSubscription>();
  private history: EventHistoryEntry[] = [];
  private config: Required<EventBusConfig>;
  private idCounter = 0;

  constructor(config: EventBusConfig = {}) {
    this.config = { ...DEFAULT_EVENT_BUS_CONFIG, ...config };
  }

  /**
   * Generate unique subscription ID
   */
  private generateId(): string {
    return `sub_${Date.now()}_${++this.idCounter}`;
  }

  /**
   * Get current context info for event payloads
   */
  private getContextInfo(): Pick<EventPayload, 'timestamp' | 'sessionId' | 'cwd'> {
    const ctx = tryUseHookContext();
    return {
      timestamp: new Date(),
      sessionId: ctx?.sessionId ?? 'unknown',
      cwd: ctx?.cwd ?? process.cwd(),
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T extends EventPayload>(
    type: EventType,
    partialPayload: Omit<T, 'timestamp' | 'sessionId' | 'cwd' | 'type'>,
  ): void {
    const startTime = Date.now();
    const contextInfo = this.getContextInfo();

    const payload = {
      ...partialPayload,
      ...contextInfo,
      type,
    } as T;

    const subscriptions = this.subscriptions.get(type) ?? [];
    const wildcardSubscriptions = this.subscriptions.get('*') ?? [];
    const allSubscriptions = [...subscriptions, ...wildcardSubscriptions];

    // Sort by priority (lower first)
    allSubscriptions.sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0));

    if (this.config.debug) {
      console.log(`[EventBus] Emitting ${type} to ${allSubscriptions.length} handlers`);
    }

    // Track for history
    let handlerCount = 0;

    for (const subscription of allSubscriptions) {
      if (!subscription.isActive) continue;

      // Apply filter
      if (subscription.options.filter && !subscription.options.filter(payload)) {
        continue;
      }

      // Apply throttle
      if (subscription.options.throttle && subscription.lastEmit) {
        if (Date.now() - subscription.lastEmit < subscription.options.throttle) {
          continue;
        }
      }

      // Apply debounce
      if (subscription.options.debounce) {
        const timeoutId = setTimeout(() => {
          this.executeHandler(subscription, payload);
        }, subscription.options.debounce);

        // Store timeout for potential cancellation
        continue;
      }

      this.executeHandler(subscription, payload);
      handlerCount++;

      // Handle once option
      if (subscription.options.once) {
        this.off(subscription.id);
      }
    }

    // Record in history
    if (this.config.enableHistory) {
      this.history.push({
        type,
        payload,
        timestamp: new Date(),
        handlerCount,
        duration: Date.now() - startTime,
      });

      // Trim history if needed
      while (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }
  }

  /**
   * Execute a handler safely
   */
  private async executeHandler<T extends EventPayload>(
    subscription: InternalSubscription<T>,
    payload: T,
  ): Promise<void> {
    subscription.lastEmit = Date.now();

    try {
      // Apply transform if present
      const finalPayload = subscription.options.transform
        ? subscription.options.transform(payload)
        : payload;

      await subscription.handler(finalPayload as T);
    } catch (error) {
      if (subscription.options.onError) {
        subscription.options.onError(error instanceof Error ? error : new Error(String(error)));
      } else if (this.config.debug) {
        console.error(`[EventBus] Handler error for ${subscription.eventType}:`, error);
      }
    }
  }

  /**
   * Subscribe to an event
   */
  on<T extends EventPayload>(
    type: EventType,
    handler: EventHandler<T>,
    options: EventSubscriptionOptions = {},
  ): EventSubscription {
    const id = this.generateId();

    const subscription: InternalSubscription<T> = {
      id,
      eventType: type,
      handler: handler as EventHandler,
      options,
      isActive: true,
    };

    // Check max listeners
    const existing = this.subscriptions.get(type) ?? [];
    if (existing.length >= this.config.maxListeners) {
      console.warn(`[EventBus] Max listeners (${this.config.maxListeners}) reached for ${type}`);
    }

    this.subscriptions.set(type, [...existing, subscription as InternalSubscription]);
    this.subscriptionById.set(id, subscription as InternalSubscription);

    if (this.config.debug) {
      console.log(`[EventBus] Subscribed to ${type} with ID ${id}`);
    }

    return {
      unsubscribe: () => this.off(id),
      id,
      eventType: type,
      isActive: () => subscription.isActive,
    };
  }

  /**
   * Subscribe to an event once
   */
  once<T extends EventPayload>(
    type: EventType,
    handler: EventHandler<T>,
    options: Omit<EventSubscriptionOptions, 'once'> = {},
  ): EventSubscription {
    return this.on(type, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off(subscriptionId: string): void {
    const subscription = this.subscriptionById.get(subscriptionId);
    if (!subscription) return;

    subscription.isActive = false;
    this.subscriptionById.delete(subscriptionId);

    const subs = this.subscriptions.get(subscription.eventType) ?? [];
    this.subscriptions.set(
      subscription.eventType,
      subs.filter((s) => s.id !== subscriptionId),
    );

    if (this.config.debug) {
      console.log(`[EventBus] Unsubscribed ${subscriptionId} from ${subscription.eventType}`);
    }
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(type?: EventType): void {
    if (type) {
      const subs = this.subscriptions.get(type) ?? [];
      for (const sub of subs) {
        sub.isActive = false;
        this.subscriptionById.delete(sub.id);
      }
      this.subscriptions.delete(type);
    } else {
      for (const sub of this.subscriptionById.values()) {
        sub.isActive = false;
      }
      this.subscriptions.clear();
      this.subscriptionById.clear();
    }
  }

  /**
   * Get listener count for an event type
   */
  listenerCount(type: EventType): number {
    return (this.subscriptions.get(type) ?? []).filter((s) => s.isActive).length;
  }

  /**
   * Get event history
   */
  getHistory(type?: EventType): readonly EventHistoryEntry[] {
    if (type) {
      return this.history.filter((e) => e.type === type);
    }
    return [...this.history];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get all active event types
   */
  getEventTypes(): readonly EventType[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Global event bus instance
let globalEventBus: EventBus | null = null;

/**
 * Get or create the global event bus
 */
function getEventBus(config?: EventBusConfig): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus(config);
  }
  return globalEventBus;
}

// ============================================================================
// Event Hooks
// ============================================================================

/**
 * Hook to access the event bus
 *
 * @param config - Optional event bus configuration
 * @returns Event emitter interface
 *
 * @example
 * ```typescript
 * const events = useEventBus();
 *
 * // Emit an event
 * events.emit('commit', {
 *   sha: 'abc123',
 *   message: 'feat: add feature',
 * });
 * ```
 */
export function useEventBus(config?: EventBusConfig): EventEmitter {
  return getEventBus(config);
}

/**
 * Hook to subscribe to a specific event type
 * Automatically unsubscribes on cleanup
 *
 * @param type - Event type to subscribe to
 * @param handler - Event handler function
 * @param options - Subscription options
 * @returns Subscription handle
 *
 * @example
 * ```typescript
 * useEvent('commit', (payload) => {
 *   console.log('New commit:', payload.sha);
 * });
 * ```
 */
export function useEvent<T extends EventPayload>(
  type: EventType,
  handler: EventHandler<T>,
  options: EventSubscriptionOptions = {},
): EventSubscription {
  const bus = getEventBus();
  const subscriptionRef = useRef<EventSubscription | null>(null);

  useMountEffect(() => {
    subscriptionRef.current = bus.on(type, handler, options);

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  });

  // Return a proxy subscription that references the current one
  return {
    unsubscribe: () => subscriptionRef.current?.unsubscribe(),
    id: subscriptionRef.current?.id ?? '',
    eventType: type,
    isActive: () => subscriptionRef.current?.isActive() ?? false,
  };
}

/**
 * Hook to subscribe to multiple event types
 *
 * @param types - Array of event types to subscribe to
 * @param handler - Event handler function
 * @param options - Subscription options
 * @returns Array of subscription handles
 *
 * @example
 * ```typescript
 * useEvents(
 *   ['commit', 'merge', 'rebase'],
 *   (payload) => {
 *     console.log('Git operation:', payload.type);
 *   }
 * );
 * ```
 */
export function useEvents<T extends EventPayload>(
  types: readonly EventType[],
  handler: EventHandler<T>,
  options: EventSubscriptionOptions = {},
): readonly EventSubscription[] {
  const bus = getEventBus();
  const subscriptionsRef = useRef<EventSubscription[]>([]);

  useMountEffect(() => {
    subscriptionsRef.current = types.map((type) =>
      bus.on(type, handler, options),
    );

    return () => {
      for (const sub of subscriptionsRef.current) {
        sub.unsubscribe();
      }
    };
  });

  return subscriptionsRef.current;
}

/**
 * Hook to emit events
 *
 * @returns Emit function
 *
 * @example
 * ```typescript
 * const emit = useEmit();
 *
 * const handleCommit = () => {
 *   emit('commit', { sha: 'abc123', message: 'feat: add' });
 * };
 * ```
 */
export function useEmit(): <T extends EventPayload>(
  type: EventType,
  payload: Omit<T, 'timestamp' | 'sessionId' | 'cwd' | 'type'>,
) => void {
  const bus = getEventBus();

  return <T extends EventPayload>(
    type: EventType,
    payload: Omit<T, 'timestamp' | 'sessionId' | 'cwd' | 'type'>,
  ) => {
    bus.emit<T>(type, payload);
  };
}

/**
 * Hook to wait for a specific event
 *
 * @param type - Event type to wait for
 * @param filter - Optional filter function
 * @param timeout - Optional timeout in milliseconds
 * @returns Promise that resolves with the event payload
 *
 * @example
 * ```typescript
 * const commit = await useWaitForEvent('commit', {
 *   filter: (p) => p.branch === 'main',
 *   timeout: 5000,
 * });
 * ```
 */
export function useWaitForEvent<T extends EventPayload>(
  type: EventType,
  options: {
    filter?: (payload: T) => boolean;
    timeout?: number;
  } = {},
): Promise<T> {
  const bus = getEventBus();

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const subscription = bus.on<T>(
      type,
      (payload) => {
        if (!options.filter || options.filter(payload)) {
          if (timeoutId) clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(payload);
        }
      },
      { once: false },
    );

    if (options.timeout) {
      timeoutId = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error(`Timeout waiting for event: ${type}`));
      }, options.timeout);
    }
  });
}

/**
 * Hook to track event history
 *
 * @param type - Optional event type to filter
 * @returns Getter for event history
 *
 * @example
 * ```typescript
 * const history = useEventHistory('commit');
 * console.log('Recent commits:', history());
 * ```
 */
export function useEventHistory(
  type?: EventType,
): () => readonly EventHistoryEntry[] {
  const bus = getEventBus({ enableHistory: true }) as EventBus;
  return () => bus.getHistory(type);
}

/**
 * Hook to track event count
 *
 * @param type - Event type to count
 * @returns Getter for event count
 *
 * @example
 * ```typescript
 * const count = useEventCount('commit');
 * console.log('Commit count:', count());
 * ```
 */
export function useEventCount(type: EventType): () => number {
  const [count, setCount] = useState(0);

  useEvent(type, () => {
    setCount((c) => c + 1);
  });

  return count;
}

/**
 * Hook to create a debounced event handler
 *
 * @param type - Event type to handle
 * @param handler - Event handler
 * @param delay - Debounce delay in milliseconds
 * @returns Subscription handle
 *
 * @example
 * ```typescript
 * useDebouncedEvent('file:modify', (payload) => {
 *   // Only called after 500ms of no events
 *   console.log('File modified:', payload.path);
 * }, 500);
 * ```
 */
export function useDebouncedEvent<T extends EventPayload>(
  type: EventType,
  handler: EventHandler<T>,
  delay: number,
): EventSubscription {
  return useEvent(type, handler, { debounce: delay });
}

/**
 * Hook to create a throttled event handler
 *
 * @param type - Event type to handle
 * @param handler - Event handler
 * @param interval - Throttle interval in milliseconds
 * @returns Subscription handle
 *
 * @example
 * ```typescript
 * useThrottledEvent('file:modify', (payload) => {
 *   // Called at most once per 1000ms
 *   console.log('File modified:', payload.path);
 * }, 1000);
 * ```
 */
export function useThrottledEvent<T extends EventPayload>(
  type: EventType,
  handler: EventHandler<T>,
  interval: number,
): EventSubscription {
  return useEvent(type, handler, { throttle: interval });
}

/**
 * Hook to create an event channel for streaming events
 *
 * @param type - Event type to stream
 * @returns Async generator of events
 *
 * @example
 * ```typescript
 * const channel = useEventChannel('commit');
 *
 * for await (const commit of channel) {
 *   console.log('New commit:', commit.sha);
 * }
 * ```
 */
export function useEventChannel<T extends EventPayload>(
  type: EventType,
): AsyncGenerator<T, void, unknown> {
  const bus = getEventBus();
  const queue: T[] = [];
  let resolve: ((value: T) => void) | null = null;
  let done = false;

  const subscription = bus.on<T>(type, (payload) => {
    if (resolve) {
      resolve(payload);
      resolve = null;
    } else {
      queue.push(payload);
    }
  });

  return {
    async next(): Promise<IteratorResult<T, void>> {
      if (done) {
        return { done: true, value: undefined };
      }

      if (queue.length > 0) {
        return { done: false, value: queue.shift()! };
      }

      return new Promise((res) => {
        resolve = (value: T) => {
          res({ done: false, value });
        };
      });
    },
    async return(): Promise<IteratorResult<T, void>> {
      done = true;
      subscription.unsubscribe();
      return { done: true, value: undefined };
    },
    async throw(e: unknown): Promise<IteratorResult<T, void>> {
      done = true;
      subscription.unsubscribe();
      throw e;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

/**
 * Reset the global event bus (primarily for testing)
 */
export function resetEventBus(): void {
  if (globalEventBus) {
    globalEventBus.removeAllListeners();
    globalEventBus.clearHistory();
    globalEventBus = null;
  }
}
