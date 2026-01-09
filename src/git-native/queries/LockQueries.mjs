// src/git-native/queries/LockQueries.mjs
// SPARQL query library for lock operations in GitVan Phase 1 Week 2
// Provides semantic deadlock detection, lock analytics, and resource contention analysis

import { useGraph } from "../../composables/graph.mjs";
import { createLogger } from "../../utils/logger.mjs";

const logger = createLogger("git-native:LockQueries");

/**
 * SPARQL Query Library for Lock Operations
 *
 * Provides advanced lock analysis capabilities using SPARQL queries over RDF lock data.
 * All queries operate on the lock ontology (https://gitvan.dev/lock#).
 *
 * @module git-native/queries/LockQueries
 */
export const LockQueries = {
  /**
   * Detect circular lock dependencies (deadlock detection)
   *
   * Uses SPARQL ASK query with property paths to detect cycles in lock:blockedBy relationships.
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance with RDF store
   * @returns {Promise<boolean>} True if deadlock detected, false otherwise
   *
   * @example
   * const hasDeadlock = await LockQueries.detectDeadlock(ks);
   * if (hasDeadlock) {
   *   console.log("Deadlock detected in lock graph!");
   * }
   */
  async detectDeadlock(knowledgeSubstrate) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      ASK WHERE {
        ?lock1 lock:blockedBy ?lock2 .
        ?lock2 lock:blockedBy+ ?lock1 .
      }
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const result = await graph.ask(sparql);
      logger.debug(`Deadlock detection: ${result}`);
      return result;
    } catch (error) {
      logger.error(`Deadlock detection failed: ${error.message}`);
      throw new Error(`Failed to detect deadlock: ${error.message}`);
    }
  },

  /**
   * Get all locks involved in deadlock cycles
   *
   * Returns locks that participate in circular blocking dependencies.
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @returns {Promise<Array<Object>>} Array of deadlocked lock objects
   *
   * @example
   * const deadlocked = await LockQueries.getDeadlockedLocks(ks);
   * deadlocked.forEach(lock => {
   *   console.log(`Lock ${lock.lockId} is deadlocked, blocked by ${lock.blocker}`);
   * });
   */
  async getDeadlockedLocks(knowledgeSubstrate) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT ?lockId ?owner ?resourceId ?blocker WHERE {
        ?lock lock:lockId ?lockId ;
              lock:owner ?owner ;
              lock:resourceId ?resourceId ;
              lock:blockedBy ?blockerLock .

        ?blockerLock lock:lockId ?blocker ;
                     lock:blockedBy+ ?lock .
      }
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);
      logger.debug(`Found ${results.length} deadlocked locks`);
      return results.map(binding => ({
        lockId: binding.lockId?.value || binding.lockId,
        owner: binding.owner?.value || binding.owner,
        resourceId: binding.resourceId?.value || binding.resourceId,
        blocker: binding.blocker?.value || binding.blocker,
      }));
    } catch (error) {
      logger.error(`Failed to get deadlocked locks: ${error.message}`);
      return [];
    }
  },

  /**
   * Get the complete blocking chain for a specific lock
   *
   * Traverses the lock:blockedBy relationship to show the full dependency chain.
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @param {string} lockName - Lock identifier to analyze
   * @returns {Promise<Array<Object>>} Chain of locks blocking the specified lock
   *
   * @example
   * const chain = await LockQueries.getBlockingChain(ks, "lock-abc-123");
   * console.log(`Lock is blocked by ${chain.length} other locks`);
   */
  async getBlockingChain(knowledgeSubstrate, lockName) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT ?lock ?lockId ?blocker ?blockerId ?owner WHERE {
        ?lock lock:lockId "${lockName}" ;
              lock:blockedBy+ ?blockerLock .

        ?blockerLock lock:lockId ?blockerId ;
                     lock:owner ?owner .

        OPTIONAL { ?lock lock:lockId ?lockId }
        OPTIONAL { ?blockerLock lock:lockId ?blocker }
      }
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);
      logger.debug(`Found ${results.length} locks in blocking chain for ${lockName}`);
      return results.map(binding => ({
        lock: binding.lock?.value || binding.lock,
        lockId: binding.lockId?.value || binding.lockId,
        blocker: binding.blocker?.value || binding.blocker,
        blockerId: binding.blockerId?.value || binding.blockerId,
        owner: binding.owner?.value || binding.owner,
      }));
    } catch (error) {
      logger.error(`Failed to get blocking chain: ${error.message}`);
      return [];
    }
  },

  /**
   * Get resource contention statistics
   *
   * Counts how many locks are contending for each resource, ordered by contention level.
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @param {string} [resourceId] - Optional specific resource to analyze
   * @returns {Promise<Array<Object>>} Resource contention data
   *
   * @example
   * const contention = await LockQueries.getResourceContention(ks);
   * contention.forEach(res => {
   *   console.log(`Resource ${res.resource} has ${res.lockCount} locks`);
   * });
   */
  async getResourceContention(knowledgeSubstrate, resourceId = null) {
    const filter = resourceId ? `FILTER(?resource = "${resourceId}")` : '';

    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT ?resource (COUNT(?lock) AS ?lockCount) WHERE {
        ?lock lock:resourceId ?resource ;
              lock:state lock:Active .
        ${filter}
      }
      GROUP BY ?resource
      ORDER BY DESC(?lockCount)
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);
      logger.debug(`Found ${results.length} resources with contention`);
      return results.map(binding => ({
        resource: binding.resource?.value || binding.resource,
        lockCount: parseInt(binding.lockCount?.value || binding.lockCount || 0),
      }));
    } catch (error) {
      logger.error(`Failed to get resource contention: ${error.message}`);
      return [];
    }
  },

  /**
   * Get locks that have been held abnormally long
   *
   * Finds locks where duration (expiresAt - acquiredAt) exceeds threshold.
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @param {number} maxDurationMs - Maximum acceptable duration in milliseconds
   * @returns {Promise<Array<Object>>} Locks exceeding duration threshold
   *
   * @example
   * const longLocks = await LockQueries.getAbnormallyLongLocks(ks, 60000);
   * longLocks.forEach(lock => {
   *   console.log(`Lock ${lock.lockId} held for ${lock.duration}ms`);
   * });
   */
  async getAbnormallyLongLocks(knowledgeSubstrate, maxDurationMs) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?lockId ?owner ?resourceId ?acquiredAt ?expiresAt
             ((?expiresAt - ?acquiredAt) AS ?duration) WHERE {
        ?lock lock:lockId ?lockId ;
              lock:owner ?owner ;
              lock:resourceId ?resourceId ;
              lock:acquiredAt ?acquiredAt ;
              lock:expiresAt ?expiresAt ;
              lock:state lock:Active .

        BIND((?expiresAt - ?acquiredAt) AS ?duration)
        FILTER(?duration > ${maxDurationMs})
      }
      ORDER BY DESC(?duration)
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);
      logger.debug(`Found ${results.length} abnormally long locks`);
      return results.map(binding => ({
        lockId: binding.lockId?.value || binding.lockId,
        owner: binding.owner?.value || binding.owner,
        resourceId: binding.resourceId?.value || binding.resourceId,
        acquiredAt: binding.acquiredAt?.value || binding.acquiredAt,
        expiresAt: binding.expiresAt?.value || binding.expiresAt,
        duration: parseInt(binding.duration?.value || binding.duration || 0),
      }));
    } catch (error) {
      logger.error(`Failed to get abnormally long locks: ${error.message}`);
      return [];
    }
  },

  /**
   * Get statistics for a specific lock owner
   *
   * Analyzes all locks held by an owner, including counts, states, and resources.
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @param {string} owner - Owner identifier
   * @returns {Promise<Object>} Owner statistics
   *
   * @example
   * const stats = await LockQueries.getOwnerStats(ks, "process-123");
   * console.log(`Owner has ${stats.totalLocks} locks, ${stats.activeLocks} active`);
   */
  async getOwnerStats(knowledgeSubstrate, owner) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT ?lockId ?resourceId ?state ?acquiredAt WHERE {
        ?lock lock:owner "${owner}" ;
              lock:lockId ?lockId ;
              lock:resourceId ?resourceId ;
              lock:state ?state ;
              lock:acquiredAt ?acquiredAt .
      }
      ORDER BY DESC(?acquiredAt)
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);

      const locks = results.map(binding => ({
        lockId: binding.lockId?.value || binding.lockId,
        resourceId: binding.resourceId?.value || binding.resourceId,
        state: binding.state?.value || binding.state,
        acquiredAt: binding.acquiredAt?.value || binding.acquiredAt,
      }));

      const stats = {
        owner,
        totalLocks: locks.length,
        activeLocks: locks.filter(l => l.state.includes('Active')).length,
        expiredLocks: locks.filter(l => l.state.includes('Expired')).length,
        releasedLocks: locks.filter(l => l.state.includes('Released')).length,
        locks,
      };

      logger.debug(`Owner ${owner} statistics: ${stats.totalLocks} total locks`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get owner stats: ${error.message}`);
      return {
        owner,
        totalLocks: 0,
        activeLocks: 0,
        expiredLocks: 0,
        releasedLocks: 0,
        locks: [],
        error: error.message,
      };
    }
  },

  /**
   * Get duration for a specific lock
   *
   * Calculates actual hold time for a lock (expiresAt - acquiredAt).
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @param {string} lockName - Lock identifier
   * @returns {Promise<number>} Duration in milliseconds
   *
   * @example
   * const duration = await LockQueries.getLockDuration(ks, "lock-abc-123");
   * console.log(`Lock held for ${duration}ms`);
   */
  async getLockDuration(knowledgeSubstrate, lockName) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT ?duration WHERE {
        ?lock lock:lockId "${lockName}" ;
              lock:acquiredAt ?acquiredAt ;
              lock:expiresAt ?expiresAt .

        BIND((?expiresAt - ?acquiredAt) AS ?duration)
      }
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);

      if (results.length === 0) {
        logger.warn(`Lock ${lockName} not found`);
        return 0;
      }

      const duration = parseInt(results[0].duration?.value || results[0].duration || 0);
      logger.debug(`Lock ${lockName} duration: ${duration}ms`);
      return duration;
    } catch (error) {
      logger.error(`Failed to get lock duration: ${error.message}`);
      return 0;
    }
  },

  /**
   * Count active locks in the system
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @returns {Promise<number>} Number of active locks
   *
   * @example
   * const count = await LockQueries.getActiveLocksCount(ks);
   * console.log(`${count} active locks in system`);
   */
  async getActiveLocksCount(knowledgeSubstrate) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT (COUNT(?lock) AS ?count) WHERE {
        ?lock a lock:Lock ;
              lock:state lock:Active .
      }
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);

      const count = parseInt(results[0]?.count?.value || results[0]?.count || 0);
      logger.debug(`Active locks count: ${count}`);
      return count;
    } catch (error) {
      logger.error(`Failed to get active locks count: ${error.message}`);
      return 0;
    }
  },

  /**
   * Get all expired locks that should be cleaned up
   *
   * Finds locks where current time > expiresAt or state is Expired.
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @returns {Promise<Array<Object>>} Expired locks
   *
   * @example
   * const expired = await LockQueries.getExpiredLocks(ks);
   * for (const lock of expired) {
   *   await lockManager.cleanup(lock.lockId);
   * }
   */
  async getExpiredLocks(knowledgeSubstrate) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT ?lockId ?owner ?resourceId ?expiresAt WHERE {
        ?lock lock:lockId ?lockId ;
              lock:owner ?owner ;
              lock:resourceId ?resourceId ;
              lock:expiresAt ?expiresAt ;
              lock:state ?state .

        FILTER(
          ?state = lock:Expired ||
          ?expiresAt < NOW()
        )
      }
      ORDER BY ?expiresAt
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);
      logger.debug(`Found ${results.length} expired locks`);
      return results.map(binding => ({
        lockId: binding.lockId?.value || binding.lockId,
        owner: binding.owner?.value || binding.owner,
        resourceId: binding.resourceId?.value || binding.resourceId,
        expiresAt: binding.expiresAt?.value || binding.expiresAt,
      }));
    } catch (error) {
      logger.error(`Failed to get expired locks: ${error.message}`);
      return [];
    }
  },

  /**
   * Get locks by state
   *
   * Filters locks by their current state (Active, Expired, Released, Contested).
   *
   * @param {Object} knowledgeSubstrate - KnowledgeSubstrate instance
   * @param {string} state - State name (Active, Expired, Released, Contested)
   * @returns {Promise<Array<Object>>} Locks in specified state
   *
   * @example
   * const contested = await LockQueries.getLocksByState(ks, "Contested");
   * console.log(`${contested.length} locks are contested`);
   */
  async getLocksByState(knowledgeSubstrate, state) {
    const sparql = `
      PREFIX lock: <https://gitvan.dev/lock#>

      SELECT ?lockId ?owner ?resourceId ?acquiredAt ?expiresAt WHERE {
        ?lock a lock:Lock ;
              lock:lockId ?lockId ;
              lock:owner ?owner ;
              lock:resourceId ?resourceId ;
              lock:acquiredAt ?acquiredAt ;
              lock:expiresAt ?expiresAt ;
              lock:state lock:${state} .
      }
      ORDER BY DESC(?acquiredAt)
    `;

    try {
      const graph = useGraph(knowledgeSubstrate.store || knowledgeSubstrate);
      const results = await graph.select(sparql);
      logger.debug(`Found ${results.length} locks in state ${state}`);
      return results.map(binding => ({
        lockId: binding.lockId?.value || binding.lockId,
        owner: binding.owner?.value || binding.owner,
        resourceId: binding.resourceId?.value || binding.resourceId,
        acquiredAt: binding.acquiredAt?.value || binding.acquiredAt,
        expiresAt: binding.expiresAt?.value || binding.expiresAt,
        state,
      }));
    } catch (error) {
      logger.error(`Failed to get locks by state: ${error.message}`);
      return [];
    }
  },
};

export default LockQueries;
