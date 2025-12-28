/**
 * @fileoverview GitVan v4 - @unrdf/hooks Core Module Index
 *
 * This module exports all core hooks functionality including types,
 * context management, and state primitives.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// Export all types
export * from './types.js';

// Export context management
export {
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
} from './context.js';

// Export state management
export {
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
} from './state.js';

// Re-export types for convenience
export type {
  Reducer,
  ReducerAction,
} from './state.js';
