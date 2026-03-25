/**
 * Composable wrapper for KnowledgeHookRegistry
 * Provides context-aware hook registry access with plan to migrate to @unrdf/hooks
 * 
 * @deprecated in v5.0.0 - will use @unrdf/hooks + RDF-backed storage
 * @see docs/HOOKS_MIGRATION_STRATEGY.md
 */

import { KnowledgeHookRegistry, createKnowledgeHookRegistry } from '../hooks/KnowledgeHookRegistry.mjs'

const registryCache = new Map()

/**
 * Get the knowledge hook registry with context awareness
 * @returns {KnowledgeHookRegistry} The shared registry instance
 */
export function useKnowledgeHookRegistry() {
  if (!registryCache.has('default')) {
    const registry = createKnowledgeHookRegistry()
    registryCache.set('default', registry)
  }
  return registryCache.get('default')
}

/**
 * Clear the registry cache (for testing)
 */
export function resetKnowledgeHookRegistry() {
  registryCache.clear()
}
