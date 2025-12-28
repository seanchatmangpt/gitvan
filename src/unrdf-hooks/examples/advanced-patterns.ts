/**
 * @fileoverview GitVan v4 - Advanced Hook Patterns
 *
 * This module demonstrates advanced patterns and composition
 * techniques for building complex hook-based applications.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import {
  useState,
  useComputed,
  useEffect,
  useMemo,
  useCallback,
  batch,
  createHookContext,
  withHookContextAsync,
} from '../core/index.js';

import {
  useRepositoryInfo,
  useBranchInfo,
  useWorkingDirectoryStatus,
  type RepositoryInfo,
  type BranchInfo,
  type WorkingDirectoryStatus,
} from '../repository/index.js';

import {
  useGitCommit,
  useGitBranch,
  useGitStash,
} from '../git/index.js';

import {
  useEventBus,
  useEmit,
} from '../events/index.js';

import {
  useQuery,
  useMutation,
} from '../cache/index.js';

import {
  composeHooks,
  useCombine,
  useAll,
  useChain,
  useConditional,
  usePipeline,
  useWithFallback,
  useRetry,
  useDebounced,
  useThrottled,
  useResource,
} from '../composition/index.js';

import {
  useErrorBoundary,
  useCircuitBreaker,
  useGracefulDegradation,
  HookOperationError,
} from '../errors/index.js';

import {
  useLifecycle,
  useInitialize,
  useManagedResource,
  useInterval,
} from '../lifecycle/index.js';

// ============================================================================
// Pattern 1: Custom Composite Hook
// ============================================================================

/**
 * Custom hook that combines multiple repository hooks
 * into a single, convenient interface
 */
export function useGitRepository() {
  const repoInfo = useRepositoryInfo();
  const branchInfo = useBranchInfo();
  const statusInfo = useWorkingDirectoryStatus();

  // Combine all states into a single computed value
  const combined = useComputed(() => {
    const repo = repoInfo();
    const branch = branchInfo();
    const status = statusInfo();

    const loading = repo.loading || branch.loading || status.loading;
    const error = repo.error ?? branch.error ?? status.error;

    if (loading) {
      return {
        loading: true,
        error: null,
        data: null,
      };
    }

    if (error || !repo.data || !branch.data || !status.data) {
      return {
        loading: false,
        error: error ?? new Error('Failed to load repository state'),
        data: null,
      };
    }

    return {
      loading: false,
      error: null,
      data: {
        root: repo.data.root,
        isRepository: repo.data.isRepository,
        branch: branch.data.name,
        isDetached: branch.data.isDetached,
        isDirty: !status.data.clean,
        staged: status.data.staged,
        unstaged: status.data.unstaged,
        untracked: status.data.untracked,
      },
    };
  });

  // Convenience methods
  const isClean = useComputed(() => {
    const data = combined().data;
    return data ? data.staged === 0 && data.unstaged === 0 : false;
  });

  const hasChanges = useComputed(() => !isClean());

  return {
    ...combined(),
    isClean,
    hasChanges,
  };
}

// ============================================================================
// Pattern 2: Feature Flag Hook
// ============================================================================

/**
 * Custom hook for feature flag management
 */
export function useFeatureFlags(initialFlags: Record<string, boolean> = {}) {
  const [flags, setFlags] = useState(initialFlags);
  const emit = useEmit();

  const isEnabled = useCallback(() => (flagName: string) => {
    const currentFlags = flags();
    return currentFlags[flagName] ?? false;
  }, [flags]);

  const enable = (flagName: string) => {
    setFlags((current) => {
      const newFlags = { ...current, [flagName]: true };
      emit('feature:enabled', { flag: flagName });
      return newFlags;
    });
  };

  const disable = (flagName: string) => {
    setFlags((current) => {
      const newFlags = { ...current, [flagName]: false };
      emit('feature:disabled', { flag: flagName });
      return newFlags;
    });
  };

  const toggle = (flagName: string) => {
    setFlags((current) => {
      const newValue = !current[flagName];
      emit(newValue ? 'feature:enabled' : 'feature:disabled', { flag: flagName });
      return { ...current, [flagName]: newValue };
    });
  };

  const setMultiple = (updates: Record<string, boolean>) => {
    batch(() => {
      setFlags((current) => ({ ...current, ...updates }));
    });
    emit('feature:batch-update', { updates });
  };

  return {
    flags,
    isEnabled: isEnabled(),
    enable,
    disable,
    toggle,
    setMultiple,
  };
}

// ============================================================================
// Pattern 3: Form State Hook
// ============================================================================

/**
 * Custom hook for form state management
 */
export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  options: {
    validate?: (values: T) => Record<string, string>;
    onSubmit?: (values: T) => Promise<void>;
  } = {},
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = useComputed(() => {
    const current = values();
    return Object.keys(initialValues).some(
      (key) => current[key] !== initialValues[key],
    );
  });

  const isValid = useComputed(() => {
    const currentErrors = errors();
    return Object.keys(currentErrors).length === 0;
  });

  const setValue = (name: keyof T, value: T[keyof T]) => {
    setValues((current) => ({ ...current, [name]: value }));

    // Validate on change
    if (options.validate) {
      const newValues = { ...values(), [name]: value };
      const validationErrors = options.validate(newValues);
      setErrors(validationErrors);
    }
  };

  const setFieldTouched = (name: keyof T) => {
    setTouched((current) => ({ ...current, [name]: true }));
  };

  const reset = () => {
    setValues(() => initialValues);
    setErrors({});
    setTouched({});
  };

  const submit = async () => {
    // Mark all fields as touched
    const allTouched = Object.keys(values()).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {},
    );
    setTouched(allTouched);

    // Validate
    if (options.validate) {
      const validationErrors = options.validate(values());
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        return false;
      }
    }

    // Submit
    if (options.onSubmit) {
      setIsSubmitting(() => true);
      try {
        await options.onSubmit(values());
        return true;
      } catch (error) {
        console.error('Form submission error:', error);
        return false;
      } finally {
        setIsSubmitting(() => false);
      }
    }

    return true;
  };

  return {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
    setValue,
    setFieldTouched,
    reset,
    submit,
  };
}

// ============================================================================
// Pattern 4: Pagination Hook
// ============================================================================

/**
 * Custom hook for paginated data
 */
export function usePagination<T>(
  fetcher: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>,
  options: { pageSize?: number; initialPage?: number } = {},
) {
  const { pageSize = 10, initialPage = 1 } = options;

  const [state, setState] = useState({
    page: initialPage,
    pageSize,
    items: [] as T[],
    total: 0,
    loading: false,
    error: null as Error | null,
  });

  const totalPages = useComputed(() => {
    const s = state();
    return Math.ceil(s.total / s.pageSize);
  });

  const hasNextPage = useComputed(() => {
    const s = state();
    return s.page < totalPages();
  });

  const hasPrevPage = useComputed(() => {
    return state().page > 1;
  });

  const loadPage = async (page: number) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const result = await fetcher(page, state().pageSize);
      setState((s) => ({
        ...s,
        page,
        items: result.items,
        total: result.total,
        loading: false,
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    }
  };

  const nextPage = () => {
    if (hasNextPage()) {
      loadPage(state().page + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage()) {
      loadPage(state().page - 1);
    }
  };

  const goToPage = (page: number) => {
    const maxPage = totalPages();
    const targetPage = Math.max(1, Math.min(page, maxPage));
    loadPage(targetPage);
  };

  // Initial load
  useEffect(() => {
    loadPage(initialPage);
    return undefined;
  }, []);

  const s = state();

  return {
    items: s.items,
    page: s.page,
    pageSize: s.pageSize,
    total: s.total,
    totalPages,
    loading: s.loading,
    error: s.error,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    reload: () => loadPage(s.page),
  };
}

// ============================================================================
// Pattern 5: Undo/Redo Hook
// ============================================================================

/**
 * Custom hook for undo/redo functionality
 */
export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
  const [state, setState] = useState({
    past: [] as T[],
    present: initialState,
    future: [] as T[],
  });

  const canUndo = useComputed(() => state().past.length > 0);
  const canRedo = useComputed(() => state().future.length > 0);

  const set = (newValue: T | ((prev: T) => T)) => {
    setState((current) => {
      const nextValue =
        typeof newValue === 'function'
          ? (newValue as (prev: T) => T)(current.present)
          : newValue;

      // Don't add to history if value hasn't changed
      if (Object.is(nextValue, current.present)) {
        return current;
      }

      const newPast = [...current.past, current.present].slice(-maxHistory);

      return {
        past: newPast,
        present: nextValue,
        future: [], // Clear future on new action
      };
    });
  };

  const undo = () => {
    setState((current) => {
      if (current.past.length === 0) return current;

      const newPast = current.past.slice(0, -1);
      const newPresent = current.past[current.past.length - 1];
      const newFuture = [current.present, ...current.future];

      return {
        past: newPast,
        present: newPresent!,
        future: newFuture,
      };
    });
  };

  const redo = () => {
    setState((current) => {
      if (current.future.length === 0) return current;

      const newFuture = current.future.slice(1);
      const newPresent = current.future[0];
      const newPast = [...current.past, current.present];

      return {
        past: newPast,
        present: newPresent!,
        future: newFuture,
      };
    });
  };

  const reset = (value: T = initialState) => {
    setState({
      past: [],
      present: value,
      future: [],
    });
  };

  const s = state();

  return {
    value: s.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    history: s.past,
    future: s.future,
  };
}

// ============================================================================
// Pattern 6: Git Workflow Hook
// ============================================================================

/**
 * Custom hook for common Git workflows
 */
export function useGitWorkflow() {
  const { commit } = useGitCommit();
  const { create: createBranch, delete: deleteBranch } = useGitBranch();
  const { save: stashSave, pop: stashPop } = useGitStash();
  const emit = useEmit();
  const { execute } = useErrorBoundary({
    onError: (error) => emit('workflow:error', { error: error.message }),
  });

  /**
   * Start a new feature branch
   */
  const startFeature = async (name: string) => {
    return execute(async () => {
      // Stash any uncommitted changes
      await stashSave({ message: `Auto-stash before starting ${name}` });

      // Create and checkout the feature branch
      await createBranch({ name: `feature/${name}` });

      emit('workflow:feature-started', { name });
      return true;
    });
  };

  /**
   * Finish a feature with commit
   */
  const finishFeature = async (message: string) => {
    return execute(async () => {
      const result = await commit({ message });

      if (result) {
        emit('workflow:feature-finished', { sha: result.sha });
      }

      return result;
    });
  };

  /**
   * Quick commit with conventional commit format
   */
  const quickCommit = async (
    type: 'feat' | 'fix' | 'chore' | 'docs' | 'refactor' | 'test',
    description: string,
    scope?: string,
  ) => {
    const message = scope
      ? `${type}(${scope}): ${description}`
      : `${type}: ${description}`;

    return commit({ message });
  };

  /**
   * Safe branch delete (only if merged)
   */
  const safeDeleteBranch = async (branchName: string) => {
    return execute(async () => {
      await deleteBranch({ names: [branchName], force: false });
      emit('workflow:branch-deleted', { branch: branchName });
      return true;
    });
  };

  return {
    startFeature,
    finishFeature,
    quickCommit,
    safeDeleteBranch,
  };
}

// ============================================================================
// Pattern 7: Connection State Hook
// ============================================================================

/**
 * Custom hook for connection state management
 */
export function useConnection(
  connect: () => Promise<void>,
  disconnect: () => Promise<void>,
  options: {
    reconnectDelay?: number;
    maxRetries?: number;
    healthCheck?: () => Promise<boolean>;
    healthCheckInterval?: number;
  } = {},
) {
  const {
    reconnectDelay = 1000,
    maxRetries = 5,
    healthCheck,
    healthCheckInterval = 30000,
  } = options;

  const [state, setState] = useState<{
    status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
    retryCount: number;
    lastError: Error | null;
  }>({
    status: 'disconnected',
    retryCount: 0,
    lastError: null,
  });

  const { execute } = useCircuitBreaker(connect, {
    threshold: maxRetries,
    timeout: reconnectDelay * maxRetries,
  });

  const doConnect = async () => {
    setState((s) => ({ ...s, status: 'connecting', lastError: null }));

    try {
      await execute();
      setState({ status: 'connected', retryCount: 0, lastError: null });
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState((s) => ({
        status: s.retryCount < maxRetries ? 'reconnecting' : 'failed',
        retryCount: s.retryCount + 1,
        lastError: err,
      }));
      return false;
    }
  };

  const doDisconnect = async () => {
    try {
      await disconnect();
    } finally {
      setState({ status: 'disconnected', retryCount: 0, lastError: null });
    }
  };

  // Health check interval
  if (healthCheck) {
    useInterval(
      async () => {
        if (state().status !== 'connected') return;

        const healthy = await healthCheck();
        if (!healthy) {
          setState((s) => ({ ...s, status: 'reconnecting' }));
          await doConnect();
        }
      },
      healthCheckInterval,
      { enabled: state().status === 'connected' },
    );
  }

  const s = state();

  return {
    status: s.status,
    retryCount: s.retryCount,
    lastError: s.lastError,
    isConnected: s.status === 'connected',
    connect: doConnect,
    disconnect: doDisconnect,
    reconnect: async () => {
      await doDisconnect();
      return doConnect();
    },
  };
}

// ============================================================================
// Pattern 8: Observable Store Hook
// ============================================================================

/**
 * Create a simple observable store
 */
export function createStore<T extends Record<string, unknown>>(initialState: T) {
  const [state, setState] = useState(initialState);
  const subscribers = new Set<(state: T) => void>();

  const subscribe = (callback: (state: T) => void) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  const update = (updater: Partial<T> | ((prev: T) => Partial<T>)) => {
    setState((current) => {
      const updates = typeof updater === 'function' ? updater(current) : updater;
      const newState = { ...current, ...updates };

      // Notify subscribers
      for (const subscriber of subscribers) {
        subscriber(newState);
      }

      return newState;
    });
  };

  const reset = () => {
    setState(() => initialState);
    for (const subscriber of subscribers) {
      subscriber(initialState);
    }
  };

  return {
    state,
    update,
    reset,
    subscribe,
    getSnapshot: () => state(),
  };
}

/**
 * Hook to use a store
 */
export function useStore<T extends Record<string, unknown>>(
  store: ReturnType<typeof createStore<T>>,
) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return store.subscribe(() => {
      forceUpdate((n) => n + 1);
    });
  }, [store]);

  return {
    state: store.state,
    update: store.update,
    reset: store.reset,
  };
}
