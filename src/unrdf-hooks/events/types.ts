/**
 * @fileoverview GitVan v4 - Event Handling Hook Types
 *
 * Type definitions for event system hooks providing
 * type-safe event handling and emission.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * Git event types that can be subscribed to
 */
export type GitEventType =
  | 'commit'
  | 'branch:create'
  | 'branch:delete'
  | 'branch:checkout'
  | 'merge'
  | 'rebase'
  | 'tag:create'
  | 'tag:delete'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'stash'
  | 'reset'
  | 'clean';

/**
 * File system event types
 */
export type FileEventType =
  | 'file:create'
  | 'file:modify'
  | 'file:delete'
  | 'file:rename';

/**
 * Repository event types
 */
export type RepositoryEventType =
  | 'repo:init'
  | 'repo:clone'
  | 'repo:worktree:add'
  | 'repo:worktree:remove';

/**
 * Job event types
 */
export type JobEventType =
  | 'job:start'
  | 'job:complete'
  | 'job:error'
  | 'job:progress';

/**
 * Hook event types
 */
export type HookEventType =
  | 'hook:register'
  | 'hook:unregister'
  | 'hook:trigger'
  | 'hook:complete';

/**
 * All event types combined
 */
export type EventType =
  | GitEventType
  | FileEventType
  | RepositoryEventType
  | JobEventType
  | HookEventType
  | string; // Allow custom event types

// ============================================================================
// Event Payload Types
// ============================================================================

/**
 * Base event payload
 */
export interface BaseEventPayload {
  /** Event timestamp */
  readonly timestamp: Date;
  /** Session ID */
  readonly sessionId: string;
  /** Working directory */
  readonly cwd: string;
}

/**
 * Git commit event payload
 */
export interface CommitEventPayload extends BaseEventPayload {
  readonly type: 'commit';
  readonly sha: string;
  readonly shortSha: string;
  readonly message: string;
  readonly author: {
    readonly name: string;
    readonly email: string;
  };
  readonly branch: string;
  readonly filesChanged: number;
}

/**
 * Branch event payload
 */
export interface BranchEventPayload extends BaseEventPayload {
  readonly type: 'branch:create' | 'branch:delete' | 'branch:checkout';
  readonly branch: string;
  readonly previousBranch?: string;
  readonly startPoint?: string;
}

/**
 * Merge event payload
 */
export interface MergeEventPayload extends BaseEventPayload {
  readonly type: 'merge';
  readonly source: string;
  readonly target: string;
  readonly sha?: string;
  readonly fastForward: boolean;
  readonly conflicts: readonly string[];
}

/**
 * Rebase event payload
 */
export interface RebaseEventPayload extends BaseEventPayload {
  readonly type: 'rebase';
  readonly onto: string;
  readonly branch: string;
  readonly commitsRebased: number;
  readonly completed: boolean;
}

/**
 * Tag event payload
 */
export interface TagEventPayload extends BaseEventPayload {
  readonly type: 'tag:create' | 'tag:delete';
  readonly tag: string;
  readonly sha?: string;
  readonly message?: string;
}

/**
 * Remote operation event payload
 */
export interface RemoteEventPayload extends BaseEventPayload {
  readonly type: 'push' | 'pull' | 'fetch';
  readonly remote: string;
  readonly branch?: string;
  readonly success: boolean;
}

/**
 * File event payload
 */
export interface FileEventPayload extends BaseEventPayload {
  readonly type: 'file:create' | 'file:modify' | 'file:delete' | 'file:rename';
  readonly path: string;
  readonly previousPath?: string;
}

/**
 * Job event payload
 */
export interface JobEventPayload extends BaseEventPayload {
  readonly type: 'job:start' | 'job:complete' | 'job:error' | 'job:progress';
  readonly jobId: string;
  readonly jobName: string;
  readonly progress?: number;
  readonly error?: string;
  readonly duration?: number;
  readonly result?: unknown;
}

/**
 * Hook event payload
 */
export interface HookEventPayload extends BaseEventPayload {
  readonly type: 'hook:register' | 'hook:unregister' | 'hook:trigger' | 'hook:complete';
  readonly hookId: string;
  readonly eventType: EventType;
  readonly result?: unknown;
}

/**
 * Generic event payload for custom events
 */
export interface GenericEventPayload extends BaseEventPayload {
  readonly type: string;
  readonly data?: unknown;
}

/**
 * Union of all event payloads
 */
export type EventPayload =
  | CommitEventPayload
  | BranchEventPayload
  | MergeEventPayload
  | RebaseEventPayload
  | TagEventPayload
  | RemoteEventPayload
  | FileEventPayload
  | JobEventPayload
  | HookEventPayload
  | GenericEventPayload;

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Event handler function
 */
export type EventHandler<T extends EventPayload = EventPayload> = (
  payload: T,
) => void | Promise<void>;

/**
 * Event filter function
 */
export type EventFilter<T extends EventPayload = EventPayload> = (
  payload: T,
) => boolean;

/**
 * Event transformer function
 */
export type EventTransformer<T extends EventPayload = EventPayload, R = T> = (
  payload: T,
) => R;

// ============================================================================
// Event Subscription Types
// ============================================================================

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  /** Only handle events matching filter */
  readonly filter?: EventFilter;
  /** Transform payload before handling */
  readonly transform?: EventTransformer;
  /** Run handler only once */
  readonly once?: boolean;
  /** Priority (lower runs first) */
  readonly priority?: number;
  /** Debounce delay in milliseconds */
  readonly debounce?: number;
  /** Throttle interval in milliseconds */
  readonly throttle?: number;
  /** Error handler */
  readonly onError?: (error: Error) => void;
}

/**
 * Event subscription handle
 */
export interface EventSubscription {
  /** Unsubscribe from event */
  readonly unsubscribe: () => void;
  /** Subscription ID */
  readonly id: string;
  /** Event type subscribed to */
  readonly eventType: EventType;
  /** Whether subscription is active */
  readonly isActive: () => boolean;
}

// ============================================================================
// Event Emitter Types
// ============================================================================

/**
 * Event emitter interface
 */
export interface EventEmitter {
  /** Emit an event */
  emit<T extends EventPayload>(type: EventType, payload: Omit<T, 'timestamp' | 'sessionId' | 'cwd' | 'type'>): void;

  /** Subscribe to an event */
  on<T extends EventPayload>(
    type: EventType,
    handler: EventHandler<T>,
    options?: EventSubscriptionOptions,
  ): EventSubscription;

  /** Subscribe to an event once */
  once<T extends EventPayload>(
    type: EventType,
    handler: EventHandler<T>,
    options?: Omit<EventSubscriptionOptions, 'once'>,
  ): EventSubscription;

  /** Unsubscribe from an event */
  off(subscriptionId: string): void;

  /** Remove all subscriptions for an event type */
  removeAllListeners(type?: EventType): void;

  /** Get listener count for an event type */
  listenerCount(type: EventType): number;
}

// ============================================================================
// Event Bus Types
// ============================================================================

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  /** Maximum number of listeners per event */
  readonly maxListeners?: number;
  /** Enable event history */
  readonly enableHistory?: boolean;
  /** Maximum history size */
  readonly maxHistorySize?: number;
  /** Enable debug logging */
  readonly debug?: boolean;
}

/**
 * Event history entry
 */
export interface EventHistoryEntry {
  /** Event type */
  readonly type: EventType;
  /** Event payload */
  readonly payload: EventPayload;
  /** Timestamp */
  readonly timestamp: Date;
  /** Handler count at emission */
  readonly handlerCount: number;
  /** Execution duration */
  readonly duration: number;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default event bus configuration
 */
export const DEFAULT_EVENT_BUS_CONFIG: Required<EventBusConfig> = {
  maxListeners: 100,
  enableHistory: false,
  maxHistorySize: 1000,
  debug: false,
} as const;
