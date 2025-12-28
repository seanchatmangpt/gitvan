/**
 * @fileoverview GitVan v4 - @unrdf/hooks Main Module
 *
 * This is the main entry point for the hooks-based state management system.
 * It exports all hooks, types, and utilities for building GitVan applications.
 *
 * ## Overview
 *
 * The @unrdf/hooks system provides a comprehensive set of reactive primitives
 * for building Git-aware applications. It follows React-like patterns but is
 * designed for server-side and CLI applications.
 *
 * ## Key Features
 *
 * - **Reactive State**: Signal-based state management with automatic dependency tracking
 * - **Repository Hooks**: Easy access to Git repository state
 * - **Git Operations**: Type-safe wrappers around Git commands
 * - **Event System**: Pub/sub event handling with filtering and transformation
 * - **Caching**: Intelligent caching with queries and mutations
 * - **Error Handling**: Comprehensive error boundaries and recovery patterns
 * - **Lifecycle Management**: Application lifecycle with resource cleanup
 * - **Composition**: Utilities for combining and extending hooks
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   createHookContext,
 *   withHookContextAsync,
 *   useRepositoryInfo,
 *   useBranchInfo,
 *   useGitCommit,
 * } from '@unrdf/hooks';
 *
 * const context = createHookContext({ cwd: process.cwd() });
 *
 * await withHookContextAsync(context, async () => {
 *   const repo = useRepositoryInfo();
 *   const branch = useBranchInfo();
 *   const { commit } = useGitCommit();
 *
 *   // Wait for data
 *   await new Promise(r => setTimeout(r, 100));
 *
 *   console.log('Repository:', repo().data?.root);
 *   console.log('Branch:', branch().data?.name);
 *
 *   // Create a commit
 *   await commit({ message: 'feat: add new feature' });
 * });
 * ```
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// ============================================================================
// Core Exports
// ============================================================================

export {
  // Types
  type HookCleanup,
  type HookDependency,
  type HookDependencies,
  type HookStateInitializer,
  type HookStateSetter,
  type HookStateResult,
  type HookContext,
  type GitHookContext,
  type HookResult,
  type HookSuccess,
  type HookError,
  type HookLoading,
  type HookSubscriber,
  type HookUnsubscribe,
  type HookSubscriptionOptions,
  type HookPhase,
  type HookLifecycleEvent,
  type HookLifecycleCallback,
  type HookLogLevel,
  type HookLogger,
  type HookConfig,
  type HookMetadata,
  type AsyncHookOptions,
  type HookRetryConfig,
  type AsyncHookResult,

  // Error types
  HookContextError,
  HookLifecycleError,
  HookTimeoutError,

  // Type guards
  isHookSuccess,
  isHookError,
  isHookLoading,
  isFunction,

  // Constants
  DEFAULT_HOOK_CONFIG,

  // Context management
  createHookContext,
  createGitHookContext,
  useHookContext,
  tryUseHookContext,
  useGitHookContext,
  tryUseGitHookContext,
  withHookContext,
  withHookContextAsync,
  withGitHookContext,
  withGitHookContextAsync,
  transitionPhase,
  getCurrentPhase,
  onLifecycleChange,
  deriveContext,
  mergeEnv,
  withDeterministicEnv,
  clearAllContexts,

  // State management
  useState,
  useRef,
  useComputed,
  useEffect,
  useMountEffect,
  useMemo,
  useCallback,
  useReducer,
  useWatch,
  batch,
  startBatch,
  endBatch,
} from './core/index.js';

// ============================================================================
// Repository Exports
// ============================================================================

export {
  // Types
  type RepositoryInfo,
  type BranchInfo,
  type HeadInfo,
  type TrackingStatus,
  type CommitAuthor,
  type WorkingDirectoryStatus,
  type FileStatus,
  type FileChange,
  type RemoteInfo,
  type RemoteBranchInfo,
  type StashEntry,
  type TagInfo,
  type WorktreeInfo,
  type SubmoduleInfo,
  type SubmoduleStatus,
  type RepositoryState,
  type RepositoryStateOptions,

  // Constants
  DEFAULT_REPOSITORY_STATE_OPTIONS,

  // Hooks
  useRepositoryInfo,
  useBranchInfo,
  useHeadInfo,
  useWorkingDirectoryStatus,
  useRemotes,
  useStashes,
  useTags,
  useWorktrees,
  useRepositoryState,
  useIsDirty,
  useCurrentBranch,
  useCurrentSha,
} from './repository/index.js';

// ============================================================================
// Git Operations Exports
// ============================================================================

export {
  // Types
  type GitOperationResult,
  type GitOperationSuccess,
  type GitOperationError,
  type CommitOptions,
  type CommitResult,
  type BranchCreateOptions,
  type BranchDeleteOptions,
  type BranchListOptions,
  type BranchListItem,
  type CheckoutOptions,
  type MergeOptions,
  type MergeResult,
  type RebaseOptions,
  type RebaseResult,
  type ResetMode,
  type ResetOptions,
  type FetchOptions,
  type PushOptions,
  type PushResult,
  type PullOptions,
  type StashSaveOptions,
  type StashApplyOptions,
  type TagCreateOptions,
  type TagDeleteOptions,
  type DiffOptions,
  type DiffEntry,
  type DiffResult,
  type LogOptions,
  type LogEntry,
  type CleanOptions,

  // Hooks
  useGitCommit,
  useGitBranch,
  useGitCheckout,
  useGitMerge,
  useGitRebase,
  useGitReset,
  useGitRemote,
  useGitStash,
  useGitTag,
  useGitDiff,
  useGitLog,
  useGitAdd,
  useGitClean,
} from './git/index.js';

// ============================================================================
// Events Exports
// ============================================================================

export {
  // Types
  type GitEventType,
  type FileEventType,
  type RepositoryEventType,
  type JobEventType,
  type HookEventType,
  type EventType,
  type BaseEventPayload,
  type CommitEventPayload,
  type BranchEventPayload,
  type MergeEventPayload,
  type RebaseEventPayload,
  type TagEventPayload,
  type RemoteEventPayload,
  type FileEventPayload,
  type JobEventPayload,
  type HookEventPayload,
  type GenericEventPayload,
  type EventPayload,
  type EventHandler,
  type EventFilter,
  type EventTransformer,
  type EventSubscriptionOptions,
  type EventSubscription,
  type EventEmitter,
  type EventBusConfig,
  type EventHistoryEntry,

  // Constants
  DEFAULT_EVENT_BUS_CONFIG,

  // Hooks
  useEventBus,
  useEvent,
  useEvents,
  useEmit,
  useWaitForEvent,
  useEventHistory,
  useEventCount,
  useDebouncedEvent,
  useThrottledEvent,
  useEventChannel,
  resetEventBus,
} from './events/index.js';

// ============================================================================
// Cache Exports
// ============================================================================

export {
  // Types
  type CacheKey,
  type CacheEntry,
  type CacheEntryMeta,
  type CacheEvictionPolicy,
  type CacheConfig,
  type CacheGetOptions,
  type CacheSetOptions,
  type CacheInvalidateOptions,
  type CacheStats,
  type UseQueryOptions,
  type UseQueryResult,
  type UseMutationOptions,
  type UseMutationResult,
  type CacheDependency,
  type CacheEntryWithDeps,

  // Constants
  DEFAULT_CACHE_CONFIG,

  // Hooks
  useCache,
  useQuery,
  useMutation,
  useCachedValue,
  useCacheStats,
  usePrefetch,
  useInvalidate,
  resetCache,
} from './cache/index.js';

// ============================================================================
// Composition Exports
// ============================================================================

export {
  // Types
  type HookFactory,
  type ComposedHook,
  type PipelineStage,
  type PipelineResult,

  // Hooks
  composeHooks,
  useCombine,
  useAll,
  useRace,
  usePipeline,
  useChain,
  useConditional,
  useSwitch,
  useWithFallback,
  useRetry,
  useDebounced,
  useThrottled,
  useResource,
} from './composition/index.js';

// ============================================================================
// Error Handling Exports
// ============================================================================

export {
  // Types
  type ErrorSeverity,
  type ErrorCategory,
  type ErrorHandler,
  type ErrorRecovery,
  type ErrorBoundaryConfig,

  // Classes
  HookOperationError,

  // Functions
  registerErrorHandler,

  // Hooks
  useError,
  useErrorBoundary,
  useTryCatch,
  useGracefulDegradation,
  useCircuitBreaker,
  useErrorReporter,
  useErrorAggregator,
} from './errors/index.js';

// ============================================================================
// Lifecycle Exports
// ============================================================================

export {
  // Types
  type AppPhase,
  type LifecycleCallback,
  type LifecycleHandler,
  type LifecycleConfig,

  // Constants
  DEFAULT_LIFECYCLE_CONFIG,

  // Hooks
  useLifecycle,
  useInitialize,
  useCleanup,
  useManagedResource,
  useAsyncInit,
  useInterval,
  useTimeout,
  useIdle,

  // Functions
  configureLifecycle,
  shutdown,
  resetLifecycle,
} from './lifecycle/index.js';

// ============================================================================
// Examples (for reference)
// ============================================================================

export {
  // Basic examples
  basicStateExample,
  effectsExample,
  repositoryStateExample,
  gitOperationsExample,
  eventSystemExample,
  cachingExample,
  errorHandlingExample,
  lifecycleExample,
  reducerExample,
  watchExample,
  runAllExamples,

  // Advanced patterns
  useGitRepository,
  useFeatureFlags,
  useForm,
  usePagination,
  useUndoRedo,
  useGitWorkflow,
  useConnection,
  createStore,
  useStore,
} from './examples/index.js';
