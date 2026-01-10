/**
 * GitVan Composable Factory Pattern
 * Standard way to create new composables with lifecycle hooks and context preservation
 *
 * Usage:
 *   export const useMyComposable = createComposable({
 *     name: 'myComposable',
 *     version: '1.0.0',
 *     dependencies: ['git', 'log'],
 *     factory(context, deps) {
 *       return {
 *         async doSomething() { ... }
 *       }
 *     },
 *     onCreate(instance) { ... },
 *     onDestroy(instance) { ... }
 *   })
 */

import { withGitVan, useGitVan, tryUseGitVan } from "../core/context.mjs";

/**
 * Creates a composable with built-in lifecycle support and context preservation
 * @param {Object} definition - Composable definition
 * @param {string} definition.name - Composable name (e.g. 'useGit')
 * @param {string} definition.version - Semantic version
 * @param {string[]} definition.dependencies - Names of dependencies
 * @param {Function} definition.factory - Factory function returning instance
 * @param {Function} [definition.onCreate] - Lifecycle hook called on creation
 * @param {Function} [definition.onDestroy] - Lifecycle hook called on destruction
 * @returns {Function} Composable function
 */
export function createComposable(definition) {
  // Handle both object and (name, factory) signatures for backwards compatibility
  let config;

  if (typeof definition === 'string') {
    // Old signature: createComposable(name, factory)
    const name = definition;
    const factory = arguments[1];
    config = { name, factory, version: '1.0.0', dependencies: [] };
  } else {
    config = definition;
  }

  const {
    name,
    version = "1.0.0",
    dependencies = [],
    factory,
    onCreate = null,
    onDestroy = null,
  } = config;

  if (!name) throw new Error("Composable definition must include a name");
  if (!factory || typeof factory !== "function") {
    throw new Error("Composable definition must include a factory function");
  }

  // Store metadata for registry
  const metadata = {
    name,
    version,
    dependencies,
    createdAt: new Date().toISOString(),
  };

  // Create the composable function
  return function composable() {
    // Get context from unctx - must be called synchronously
    let ctx;
    try {
      ctx = useGitVan();
    } catch {
      ctx = tryUseGitVan?.() || null;
    }

    // Resolve working directory and environment
    const cwd = (ctx && ctx.cwd) || process.cwd();
    const env = {
      ...process.env,
      ...(ctx && ctx.env ? ctx.env : {}),
      TZ: "UTC",
      LANG: "C",
    };

    const base = { cwd, env };

    // Create instance using factory
    let instance;
    try {
      instance = factory(ctx, base, dependencies);
    } catch (error) {
      throw new Error(
        `Failed to create composable '${name}': ${error.message}`
      );
    }

    // Ensure instance is an object
    if (!instance || typeof instance !== "object") {
      throw new Error(
        `Composable '${name}' factory must return an object instance`
      );
    }

    // Add metadata to instance
    instance._metadata = metadata;
    instance._context = ctx;
    instance._base = base;

    // Call onCreate hook if provided
    if (onCreate && typeof onCreate === "function") {
      try {
        onCreate(instance);
      } catch (error) {
        throw new Error(
          `onCreate hook failed for '${name}': ${error.message}`
        );
      }
    }

    // Add destroy method if onDestroy hook provided
    if (onDestroy && typeof onDestroy === "function") {
      const originalDestroy = instance.destroy;
      instance.destroy = async function () {
        if (typeof originalDestroy === "function") {
          await originalDestroy.call(this);
        }
        await onDestroy(instance);
      };
    }

    return instance;
  };
}

/**
 * Helper to create composables following GitVan pattern
 * This is the recommended way to create composables in GitVan
 *
 * @param {string} name - Composable name (use/Feature)
 * @param {function} factory - Factory function returning {methods, state}
 * @returns {Object} Standard composable factory
 *
 * @example
 * export const useMyComposable = createComposable('useMyComposable', (context) => {
 *   return {
 *     async myMethod() { ... },
 *     state: { value: 0 }
 *   }
 * })
 */
export function defineComposable(name, factory) {
  return createComposable(name, factory);
}

/**
 * Compose multiple composable instances into a single instance
 * Merges methods from multiple composables with priority to later entries
 * @param {Object[]} composables - Array of composable instances
 * @param {Object} options - Merge options
 * @returns {Object} Merged composable instance
 */
export function composeComposables(composables, options = {}) {
  const { prefix = false, conflict = "last" } = options;

  if (!Array.isArray(composables) || composables.length === 0) {
    throw new Error("composeComposables requires a non-empty array");
  }

  const merged = {};
  const usedKeys = new Set();

  for (const comp of composables) {
    if (!comp || typeof comp !== "object") continue;

    const compName = comp._metadata?.name || "unknown";
    const keys = Object.keys(comp).filter(
      (k) => !k.startsWith("_") && k !== "destroy"
    );

    for (const key of keys) {
      // Handle key conflicts based on strategy
      if (usedKeys.has(key)) {
        if (conflict === "error") {
          throw new Error(
            `Key conflict: '${key}' exists in multiple composables`
          );
        }
        if (conflict === "first") {
          continue;
        }
        // conflict === "last" (default): overwrite
      }

      // Add method with or without prefix
      const targetKey = prefix ? `${compName}${key[0].toUpperCase()}${key.slice(1)}` : key;
      merged[targetKey] = comp[key];
      usedKeys.add(key);
    }
  }

  // Merge metadata
  merged._metadata = {
    type: "composed",
    composables: composables.map((c) => c._metadata?.name || "unknown"),
    createdAt: new Date().toISOString(),
  };

  return merged;
}

/**
 * Wrap a composable method to preserve context across async boundaries
 * @param {Object} instance - Composable instance
 * @param {string} methodName - Method name to wrap
 * @returns {void} - Wraps in place
 */
export function withContextPreservation(instance, methodName) {
  if (!instance || !methodName) return;

  const original = instance[methodName];
  if (typeof original !== "function") return;

  instance[methodName] = async function (...args) {
    const ctx = instance._context || null;
    if (ctx) {
      return withGitVan(ctx, async () => original.apply(this, args));
    }
    return original.apply(this, args);
  };
}

/**
 * Register metadata on a composable instance
 * @param {Object} instance - Composable instance
 * @param {Object} metadata - Metadata to register
 */
export function setComposableMetadata(instance, metadata) {
  if (!instance || !metadata) return;
  instance._metadata = {
    ...instance._metadata,
    ...metadata,
  };
}

/**
 * Get composable metadata
 * @param {Object} instance - Composable instance
 * @returns {Object|null} Metadata or null
 */
export function getComposableMetadata(instance) {
  if (!instance) return null;
  return instance._metadata || null;
}
