/**
 * Composable wrapper for JobRegistry
 * Provides context-aware job registry access
 * 
 * @deprecated in v5.0.0 - will use git-native RDF storage + @unrdf
 * @see docs/HOOKS_MIGRATION_STRATEGY.md
 */

import { jobRegistry } from '../core/job-registry.mjs'

/**
 * Access the job registry with composable pattern
 * @returns {JobRegistry} The shared job registry instance
 */
export function useJobRegistry() {
  return jobRegistry
}

/**
 * Register a job with the registry
 * @param {Object} job - Job definition with meta, hooks, run
 */
export async function registerJob(job) {
  jobRegistry.register(job)
}

/**
 * Get all jobs that run on a specific hook
 * @param {string} hookName - Name of the hook
 * @returns {Array} Jobs that run on this hook
 */
export async function getJobsForHook(hookName) {
  return jobRegistry.getJobsForHook(hookName)
}

/**
 * Get all registered jobs
 * @returns {Array} All job definitions
 */
export async function getAllJobs() {
  return jobRegistry.getAllJobs()
}
