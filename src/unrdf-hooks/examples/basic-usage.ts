/**
 * @fileoverview GitVan v4 - Basic Hook Usage Examples
 *
 * This module demonstrates basic usage patterns for the hooks system.
 * Each example is self-contained and can be used as a reference.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import {
  // Core state hooks
  useState,
  useComputed,
  useEffect,
  useMemo,
  useReducer,
  useWatch,
  batch,

  // Context management
  createHookContext,
  withHookContext,
  withHookContextAsync,
  useHookContext,
} from '../core/index.js';

import {
  // Repository hooks
  useRepositoryInfo,
  useBranchInfo,
  useHeadInfo,
  useWorkingDirectoryStatus,
  useRepositoryState,
  useIsDirty,
  useCurrentBranch,
} from '../repository/index.js';

import {
  // Git operation hooks
  useGitCommit,
  useGitBranch,
  useGitCheckout,
  useGitMerge,
  useGitStash,
  useGitDiff,
  useGitAdd,
} from '../git/index.js';

import {
  // Event hooks
  useEvent,
  useEmit,
  useEventBus,
} from '../events/index.js';

import {
  // Cache hooks
  useCache,
  useQuery,
  useMutation,
} from '../cache/index.js';

import {
  // Error hooks
  useError,
  useErrorBoundary,
} from '../errors/index.js';

import {
  // Lifecycle hooks
  useLifecycle,
  useInitialize,
  useInterval,
} from '../lifecycle/index.js';

// ============================================================================
// Example 1: Basic State Management
// ============================================================================

/**
 * Demonstrates basic state management with useState and useComputed
 */
export function basicStateExample() {
  // Create reactive state
  const [count, setCount] = useState(0);
  const [multiplier, setMultiplier] = useState(2);

  // Create computed value that depends on both states
  const doubled = useComputed(() => count() * multiplier());

  // Log initial values
  console.log('Count:', count());        // 0
  console.log('Multiplier:', multiplier()); // 2
  console.log('Doubled:', doubled());    // 0

  // Update count - computed automatically updates
  setCount(5);
  console.log('Count:', count());        // 5
  console.log('Doubled:', doubled());    // 10

  // Batch updates for efficiency
  batch(() => {
    setCount(10);
    setMultiplier(3);
  });
  console.log('Count:', count());        // 10
  console.log('Doubled:', doubled());    // 30
}

// ============================================================================
// Example 2: Effects and Cleanup
// ============================================================================

/**
 * Demonstrates effect hooks with cleanup
 */
export function effectsExample() {
  const [logEnabled, setLogEnabled] = useState(true);
  const [message, setMessage] = useState('Hello');

  // Effect that runs when message changes
  const cleanup = useEffect(() => {
    if (logEnabled()) {
      console.log('Message changed:', message());
    }

    // Return cleanup function
    return () => {
      console.log('Cleaning up previous effect');
    };
  });

  // Update message - effect runs
  setMessage('World');

  // Disable logging
  setLogEnabled(false);
  setMessage('Goodbye'); // No log

  // Cleanup when done
  cleanup();
}

// ============================================================================
// Example 3: Repository State
// ============================================================================

/**
 * Demonstrates repository state hooks
 */
export async function repositoryStateExample() {
  const context = createHookContext({ cwd: process.cwd() });

  await withHookContextAsync(context, async () => {
    // Get repository information
    const repoInfo = useRepositoryInfo();
    const branchInfo = useBranchInfo();
    const statusInfo = useWorkingDirectoryStatus();

    // Wait for data to load
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Access the results
    const repo = repoInfo();
    const branch = branchInfo();
    const status = statusInfo();

    if (repo.data) {
      console.log('Repository root:', repo.data.root);
      console.log('Is repository:', repo.data.isRepository);
    }

    if (branch.data) {
      console.log('Current branch:', branch.data.name);
      console.log('Is detached:', branch.data.isDetached);
    }

    if (status.data) {
      console.log('Is clean:', status.data.clean);
      console.log('Staged files:', status.data.staged);
      console.log('Unstaged files:', status.data.unstaged);
    }
  });
}

// ============================================================================
// Example 4: Git Operations
// ============================================================================

/**
 * Demonstrates git operation hooks
 */
export async function gitOperationsExample() {
  const context = createHookContext({ cwd: process.cwd() });

  await withHookContextAsync(context, async () => {
    const { commit } = useGitCommit();
    const { create: createBranch, list: listBranches } = useGitBranch();
    const { checkout } = useGitCheckout();
    const { diff } = useGitDiff();
    const { add, addAll } = useGitAdd();

    // List all branches
    const branches = await listBranches({ all: true });
    console.log('Branches:', branches.map((b) => b.name));

    // Get current diff
    const diffResult = await diff({ staged: true });
    console.log('Staged changes:', diffResult.filesChanged, 'files');

    // Example workflow (commented out to avoid side effects):
    //
    // // Stage all changes
    // await addAll();
    //
    // // Create a commit
    // const commitResult = await commit({
    //   message: 'feat: add new feature',
    //   sign: false,
    // });
    //
    // if (commitResult) {
    //   console.log('Created commit:', commitResult.sha);
    // }
    //
    // // Create and checkout a new branch
    // await createBranch({ name: 'feature/new-feature' });
    // await checkout({ target: 'feature/new-feature' });
  });
}

// ============================================================================
// Example 5: Event System
// ============================================================================

/**
 * Demonstrates event hooks
 */
export function eventSystemExample() {
  const emit = useEmit();
  const events = useEventBus();

  // Subscribe to commit events
  useEvent('commit', (payload) => {
    console.log('Commit event received:', payload);
  });

  // Subscribe to multiple events
  events.on('*', (payload) => {
    console.log('Any event:', payload.type);
  });

  // Emit a custom event
  emit('commit', {
    sha: 'abc123',
    shortSha: 'abc123',
    message: 'feat: add feature',
    author: { name: 'John', email: 'john@example.com' },
    branch: 'main',
    filesChanged: 5,
  });
}

// ============================================================================
// Example 6: Caching
// ============================================================================

/**
 * Demonstrates caching hooks
 */
export async function cachingExample() {
  const cache = useCache();

  // Simple cache operations
  cache.set('user:1', { name: 'John', age: 30 }, { ttl: 60000 });

  const user = cache.get<{ name: string; age: number }>('user:1');
  console.log('Cached user:', user);

  // Query hook for automatic caching
  const userQuery = useQuery({
    key: ['user', 2],
    fetcher: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { name: 'Jane', age: 25 };
    },
    ttl: 60000,
    staleTime: 30000,
  });

  // Wait for query
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (userQuery.isSuccess) {
    console.log('Query result:', userQuery.data);
  }

  // Mutation with cache invalidation
  const updateUser = useMutation({
    mutationFn: async (data: { id: number; name: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { ...data, updated: true };
    },
    invalidateQueries: [['user']],
    onSuccess: (data) => {
      console.log('User updated:', data);
    },
  });

  // Execute mutation
  await updateUser.mutateAsync({ id: 1, name: 'John Updated' });

  // Cache stats
  const stats = cache.stats();
  console.log('Cache stats:', stats);
}

// ============================================================================
// Example 7: Error Handling
// ============================================================================

/**
 * Demonstrates error handling hooks
 */
export async function errorHandlingExample() {
  const { error, handleError, clearError } = useError();
  const { execute, executeWithFallback } = useErrorBoundary({
    onError: (err) => console.error('Boundary caught:', err.message),
    log: true,
  });

  // Handle an error
  try {
    throw new Error('Something went wrong');
  } catch (e) {
    handleError(e, { category: 'validation', severity: 'warning' });
  }

  console.log('Current error:', error()?.message);

  // Execute with error boundary
  const result = await execute(async () => {
    // This might throw
    return 'success';
  });

  console.log('Result:', result);

  // Execute with fallback
  const safeResult = await executeWithFallback(
    async () => {
      throw new Error('Failed');
    },
    'default value',
  );

  console.log('Safe result:', safeResult);

  // Clear error
  clearError();
}

// ============================================================================
// Example 8: Lifecycle Management
// ============================================================================

/**
 * Demonstrates lifecycle hooks
 */
export async function lifecycleExample() {
  const { phase, transition, onMount, onUnmount, uptime } = useLifecycle();

  // Register lifecycle handlers
  const unregisterMount = onMount(async () => {
    console.log('Application mounted');
  });

  const unregisterUnmount = onUnmount(async () => {
    console.log('Application unmounting');
  });

  // Initialize application
  const { initialized, error, isInitializing } = useInitialize(async () => {
    console.log('Initializing...');
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log('Initialization complete');
  });

  // Wait for initialization
  await new Promise((resolve) => setTimeout(resolve, 200));

  console.log('Initialized:', initialized());
  console.log('Uptime:', uptime(), 'ms');

  // Set up interval
  const { start, stop, isRunning } = useInterval(
    () => {
      console.log('Heartbeat');
    },
    1000,
    { enabled: false },
  );

  // Transition to ready
  await transition('ready');
  console.log('Current phase:', phase());

  // Cleanup
  unregisterMount();
  unregisterUnmount();
}

// ============================================================================
// Example 9: Reducer Pattern
// ============================================================================

/**
 * Demonstrates reducer pattern for complex state
 */
export function reducerExample() {
  type State = {
    count: number;
    history: number[];
  };

  type Action =
    | { type: 'increment' }
    | { type: 'decrement' }
    | { type: 'reset' }
    | { type: 'set'; payload: number };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case 'increment':
        return {
          count: state.count + 1,
          history: [...state.history, state.count + 1],
        };
      case 'decrement':
        return {
          count: state.count - 1,
          history: [...state.history, state.count - 1],
        };
      case 'reset':
        return { count: 0, history: [] };
      case 'set':
        return {
          count: action.payload,
          history: [...state.history, action.payload],
        };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, { count: 0, history: [] });

  // Dispatch actions
  dispatch({ type: 'increment' });
  dispatch({ type: 'increment' });
  dispatch({ type: 'set', payload: 10 });

  console.log('State:', state());
  // { count: 10, history: [1, 2, 10] }
}

// ============================================================================
// Example 10: Watch Pattern
// ============================================================================

/**
 * Demonstrates watch pattern for reactive responses
 */
export function watchExample() {
  const [user, setUser] = useState({ name: 'John', online: false });

  // Watch for changes
  const unwatch = useWatch(
    () => user().online,
    (newValue, oldValue) => {
      console.log(`Online status changed: ${oldValue} -> ${newValue}`);
      if (newValue) {
        console.log('User came online!');
      } else {
        console.log('User went offline');
      }
    },
    { immediate: false },
  );

  // Trigger watch
  setUser({ name: 'John', online: true });
  setUser({ name: 'John', online: false });

  // Stop watching
  unwatch();
}

// ============================================================================
// Run Examples
// ============================================================================

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('=== Basic State Example ===');
  basicStateExample();

  console.log('\n=== Effects Example ===');
  effectsExample();

  console.log('\n=== Reducer Example ===');
  reducerExample();

  console.log('\n=== Watch Example ===');
  watchExample();

  console.log('\n=== Repository State Example ===');
  await repositoryStateExample();

  console.log('\n=== Git Operations Example ===');
  await gitOperationsExample();

  console.log('\n=== Event System Example ===');
  eventSystemExample();

  console.log('\n=== Caching Example ===');
  await cachingExample();

  console.log('\n=== Error Handling Example ===');
  await errorHandlingExample();

  console.log('\n=== Lifecycle Example ===');
  await lifecycleExample();
}
