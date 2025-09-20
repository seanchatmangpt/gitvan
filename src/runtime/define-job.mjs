// GitVan v3.0.0 - Job Definition System
// Provides job definition and registration functionality

import { createLogger } from "../utils/logger.mjs";
import { z } from "zod";

// Job definition schema
const JobDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  environment: z.object({
    node: z.string().optional(),
    npm: z.string().optional(),
    git: z.string().optional(),
  }).optional(),
  hooks: z.array(z.object({
    event: z.string(),
    handler: z.function(),
  })).optional(),
  run: z.function(),
  validate: z.function().optional(),
  cleanup: z.function().optional(),
});

// Global job registry
const jobRegistry = new Map();
const logger = createLogger("define-job");

/**
 * Define a job with validation and registration
 * @param {Object} definition - Job definition object
 * @returns {Object} Validated job definition
 */
export function defineJob(definition) {
  try {
    // Validate the job definition
    const validatedDefinition = JobDefinitionSchema.parse(definition);
    
    // Register the job
    jobRegistry.set(validatedDefinition.name, validatedDefinition);
    
    logger.info(`✅ Job '${validatedDefinition.name}' defined and registered`);
    
    return validatedDefinition;
  } catch (error) {
    logger.error(`❌ Failed to define job: ${error.message}`);
    throw new Error(`Invalid job definition: ${error.message}`);
  }
}

/**
 * Get a job by name
 * @param {string} name - Job name
 * @returns {Object|null} Job definition or null if not found
 */
export function getJob(name) {
  return jobRegistry.get(name) || null;
}

/**
 * List all registered jobs
 * @returns {Array} Array of job definitions
 */
export function listJobs() {
  return Array.from(jobRegistry.values());
}

/**
 * Check if a job exists
 * @param {string} name - Job name
 * @returns {boolean} True if job exists
 */
export function hasJob(name) {
  return jobRegistry.has(name);
}

/**
 * Remove a job from registry
 * @param {string} name - Job name
 * @returns {boolean} True if job was removed
 */
export function removeJob(name) {
  return jobRegistry.delete(name);
}

/**
 * Clear all jobs from registry
 */
export function clearJobs() {
  jobRegistry.clear();
}

/**
 * Get job registry statistics
 * @returns {Object} Registry statistics
 */
export function getJobStats() {
  return {
    totalJobs: jobRegistry.size,
    jobNames: Array.from(jobRegistry.keys()),
  };
}

// Export the registry for advanced usage
export { jobRegistry };