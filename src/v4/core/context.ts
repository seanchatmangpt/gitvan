/**
 * GitVan v4 Hook Context & Dependency Injection
 *
 * Provides scoped context and dependency injection following @unrdf/hooks patterns.
 *
 * @packageDocumentation
 * @module @gitvan/v4/core/context
 */

import type {
  HookContext,
  HookDependency,
  Disposer,
  HookSubscription,
  CleanupRegistry,
} from '../types/index.js';
import { signal, type WritableSignal } from './signals.js';
import { consola } from 'consola';

// Simple logger for debug output
const logger = {
  log: (...args: any[]) => {
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(`[INFO] ${args.join(' ')}\n`);
    } else {
      consola.log(...args);
    }
  }
};

// =============================================================================
// Token Registry
// =============================================================================

const tokenRegistry = new Map<string, symbol>();

/**
 * Create or retrieve a dependency injection token
 *
 * @example
 * ```ts
 * const LoggerToken = token<Logger>('logger');
 * const logger = inject(LoggerToken);
 * ```
 */
export function token<T>(name: string): symbol & { __type?: T } {
  if (!tokenRegistry.has(name)) {
    tokenRegistry.set(name, Symbol.for(`gitvan:${name}`));
  }
  return tokenRegistry.get(name)! as symbol & { __type?: T };
}

// =============================================================================
// Context Stack
// =============================================================================

let contextStack: HookContext[] = [];
let contextIdCounter = 0;

/**
 * Get the current hook context
 */
export function getCurrentContext(): HookContext | undefined {
  return contextStack[contextStack.length - 1];
}

/**
 * Create a new hook context
 */
export function createContext(
  parent?: HookContext,
  meta: Record<string, unknown> = {}
): HookContext {
  const context: HookContext = {
    id: `ctx-${++contextIdCounter}`,
    parent,
    providers: new Map(),
    subscriptions: new Set(),
    cleanups: new Set(),
    meta,
  };

  // Inherit providers from parent
  if (parent) {
    for (const [key, value] of parent.providers) {
      context.providers.set(key, value);
    }
  }

  return context;
}

/**
 * Run a function within a specific context
 *
 * @example
 * ```ts
 * const ctx = createContext();
 * provide(ctx, LoggerToken, new Logger());
 *
 * runInContext(ctx, () => {
 *   const logger = inject(LoggerToken);
 *   logger.info('Hello!');
 * });
 * ```
 */
export function runInContext<T>(context: HookContext, fn: () => T): T {
  contextStack.push(context);
  try {
    return fn();
  } finally {
    contextStack.pop();
  }
}

/**
 * Run an async function within a specific context
 */
export async function runInContextAsync<T>(
  context: HookContext,
  fn: () => Promise<T>
): Promise<T> {
  contextStack.push(context);
  try {
    return await fn();
  } finally {
    contextStack.pop();
  }
}

// =============================================================================
// Dependency Injection
// =============================================================================

/**
 * Provide a value in the current context
 *
 * @example
 * ```ts
 * const ctx = createContext();
 * provide(ctx, DatabaseToken, new Database());
 * ```
 */
export function provide<T>(
  context: HookContext | undefined,
  tokenSymbol: symbol & { __type?: T },
  value: T
): void {
  const ctx = context ?? getCurrentContext();
  if (!ctx) {
    throw new Error('No context available. Use createContext() or runInContext()');
  }
  ctx.providers.set(tokenSymbol, value);
}

/**
 * Inject a dependency from the current context
 *
 * @example
 * ```ts
 * const logger = inject(LoggerToken);
 * logger.info('Hello!');
 * ```
 */
export function inject<T>(
  tokenSymbol: symbol & { __type?: T },
  defaultValue?: T
): T {
  const ctx = getCurrentContext();

  if (ctx && ctx.providers.has(tokenSymbol)) {
    return ctx.providers.get(tokenSymbol) as T;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(
    `Dependency not found: ${String(tokenSymbol)}. ` +
    'Make sure to provide it using provide() before injecting.'
  );
}

/**
 * Try to inject a dependency, returning undefined if not found
 */
export function tryInject<T>(
  tokenSymbol: symbol & { __type?: T }
): T | undefined {
  const ctx = getCurrentContext();
  if (ctx && ctx.providers.has(tokenSymbol)) {
    return ctx.providers.get(tokenSymbol) as T;
  }
  return undefined;
}

/**
 * Check if a dependency is provided
 */
export function hasProvider(tokenSymbol: symbol): boolean {
  const ctx = getCurrentContext();
  return ctx?.providers.has(tokenSymbol) ?? false;
}

// =============================================================================
// Scoped Providers
// =============================================================================

/**
 * Provider definition for automatic instantiation
 */
export interface ProviderDefinition<T> {
  token: symbol & { __type?: T };
  factory: () => T | Promise<T>;
  scope?: 'singleton' | 'transient' | 'request';
  deps?: symbol[];
}

const singletonCache = new Map<symbol, unknown>();
const requestScopedFactories = new Map<symbol, () => unknown>();

/**
 * Define a provider with automatic lifecycle management
 */
export function defineProvider<T>(
  definition: ProviderDefinition<T>
): ProviderDefinition<T> {
  const { token: tok, factory, scope = 'singleton' } = definition;

  if (scope === 'transient') {
    requestScopedFactories.set(tok, factory);
  }

  return definition;
}

/**
 * Register providers in a context
 */
export async function registerProviders(
  context: HookContext,
  providers: ProviderDefinition<unknown>[]
): Promise<void> {
  for (const provider of providers) {
    const { token: tok, factory, scope = 'singleton' } = provider;

    if (scope === 'singleton') {
      if (!singletonCache.has(tok)) {
        singletonCache.set(tok, await factory());
      }
      context.providers.set(tok, singletonCache.get(tok));
    } else if (scope === 'request') {
      // Created fresh for each context
      context.providers.set(tok, await factory());
    } else if (scope === 'transient') {
      // Factory stored for lazy creation
      requestScopedFactories.set(tok, factory);
    }
  }
}

/**
 * Create a scoped context with registered providers
 */
export async function createScopedContext(
  providers: ProviderDefinition<unknown>[],
  parent?: HookContext
): Promise<HookContext> {
  const context = createContext(parent);
  await registerProviders(context, providers);
  return context;
}

// =============================================================================
// Cleanup Registry
// =============================================================================

/**
 * Create a cleanup registry for managing disposers
 */
export function createCleanupRegistry(): CleanupRegistry {
  const cleanups = new Set<Disposer>();

  return {
    register(cleanup: Disposer): void {
      cleanups.add(cleanup);
    },

    async runAll(): Promise<void> {
      const promises: Promise<void>[] = [];
      for (const cleanup of cleanups) {
        const result = cleanup();
        if (result instanceof Promise) {
          promises.push(result);
        }
      }
      await Promise.all(promises);
      cleanups.clear();
    },

    clear(): void {
      cleanups.clear();
    },

    get size(): number {
      return cleanups.size;
    },
  };
}

/**
 * Register a cleanup function in the current context
 */
export function onCleanup(cleanup: Disposer): void {
  const ctx = getCurrentContext();
  if (ctx) {
    ctx.cleanups.add(cleanup);
  }
}

/**
 * Run all cleanups in a context
 */
export async function cleanupContext(context: HookContext): Promise<void> {
  const promises: Promise<void>[] = [];

  // Run cleanups in reverse order
  const cleanups = Array.from(context.cleanups).reverse();
  for (const cleanup of cleanups) {
    const result = cleanup();
    if (result instanceof Promise) {
      promises.push(result);
    }
  }

  // Unsubscribe all subscriptions
  for (const sub of context.subscriptions) {
    if (sub.isActive) {
      sub.unsubscribe();
    }
  }

  await Promise.all(promises);
  context.cleanups.clear();
  context.subscriptions.clear();
}

// =============================================================================
// Context-Aware Signals
// =============================================================================

/**
 * Create a signal that is scoped to the current context
 */
export function contextSignal<T>(
  initialValue: T,
  name?: string
): WritableSignal<T> {
  const sig = signal(initialValue, name);
  const ctx = getCurrentContext();

  if (ctx) {
    // Register cleanup to reset signal when context is disposed
    ctx.cleanups.add(() => {
      sig.reset();
    });
  }

  return sig;
}

// =============================================================================
// Context Debugging
// =============================================================================

/**
 * Get context debug information
 */
export function getContextDebugInfo(
  context?: HookContext
): Record<string, unknown> {
  const ctx = context ?? getCurrentContext();
  if (!ctx) {
    return { error: 'No context available' };
  }

  return {
    id: ctx.id,
    parentId: ctx.parent?.id,
    providersCount: ctx.providers.size,
    providers: Array.from(ctx.providers.keys()).map((k) => String(k)),
    subscriptionsCount: ctx.subscriptions.size,
    cleanupsCount: ctx.cleanups.size,
    meta: ctx.meta,
  };
}

/**
 * Print context hierarchy
 */
export function printContextHierarchy(context?: HookContext): void {
  const ctx = context ?? getCurrentContext();
  if (!ctx) {
    logger.log('No context available');
    return;
  }

  const hierarchy: string[] = [];
  let current: HookContext | undefined = ctx;

  while (current) {
    hierarchy.unshift(
      `[${current.id}] providers: ${current.providers.size}, cleanups: ${current.cleanups.size}`
    );
    current = current.parent;
  }

  logger.log('Context Hierarchy:');
  hierarchy.forEach((line, i) => {
    logger.log(`${'  '.repeat(i)}${line}`);
  });
}

// =============================================================================
// Standard Tokens
// =============================================================================

/**
 * Standard dependency injection tokens
 */
export const Tokens = {
  /** Configuration token */
  Config: token<Record<string, unknown>>('config'),
  /** Logger token */
  Logger: token<Console>('logger'),
  /** Request token */
  Request: token<Request>('request'),
  /** Response token */
  Response: token<Response>('response'),
  /** Git client token */
  Git: token<unknown>('git'),
  /** Template engine token */
  Template: token<unknown>('template'),
  /** Job runner token */
  JobRunner: token<unknown>('job-runner'),
  /** Event emitter token */
  Events: token<unknown>('events'),
  /** Cache token */
  Cache: token<Map<string, unknown>>('cache'),
  /** Metrics token */
  Metrics: token<unknown>('metrics'),
} as const;
