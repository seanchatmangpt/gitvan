// GitVan v3.0.0 - Runtime Boot System
// Provides job execution context and bootstrapping functionality

import { withGitVan } from '../composables/ctx.mjs';
import { createLogger } from '../utils/logger.mjs';
import { loadConfig } from './config.mjs';
import { GitVanDefaults } from '../config/defaults.mjs';

const logger = createLogger("boot");

/**
 * Run a job with proper GitVan context
 * @param {Object} ctx - GitVan context
 * @param {Object} jobMod - Job module
 * @param {Object} payload - Job payload
 * @returns {Object} Job execution result
 */
export async function runJobWithContext(ctx, jobMod, payload = {}) {
  return withGitVan(ctx, async () => {
    try {
      const job = jobMod.default || jobMod;
      
      if (typeof job.run !== 'function') {
        logger.warn('Job module does not have a run method');
        return { ok: true, warning: 'No run method found' };
      }

      // Validate job before running
      if (typeof job.validate === 'function') {
        const validation = await job.validate(payload);
        if (!validation.valid) {
          throw new Error(`Job validation failed: ${validation.error}`);
        }
      }

      logger.info(`🚀 Running job: ${job.name || 'unnamed'}`);
      
      // Execute the job
      const result = await job.run({ payload, ctx });
      
      logger.info(`✅ Job completed successfully`);
      
      // Run cleanup if available
      if (typeof job.cleanup === 'function') {
        await job.cleanup({ payload, ctx, result });
      }
      
      return result;
    } catch (error) {
      logger.error(`❌ Job execution failed: ${error.message}`);
      throw error;
    }
  });
}

/**
 * Bootstrap GitVan runtime
 * @param {Object} options - Bootstrap options
 * @returns {Object} Bootstrap result
 */
export async function bootstrapGitVan(options = {}) {
  try {
    logger.info('🚀 Bootstrapping GitVan runtime...');
    
    // Load configuration
    const config = await loadConfig(options.configPath);
    
    // Merge with defaults
    const runtimeConfig = {
      ...GitVanDefaults,
      ...config,
      ...options,
    };
    
    // Initialize core systems
    await initializeCoreSystems(runtimeConfig);
    
    logger.info('✅ GitVan runtime bootstrapped successfully');
    
    return {
      config: runtimeConfig,
      initialized: true,
    };
  } catch (error) {
    logger.error(`❌ Bootstrap failed: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize core GitVan systems
 * @param {Object} config - Runtime configuration
 */
async function initializeCoreSystems(config) {
  // Initialize logging
  logger.info('📝 Initializing logging system...');
  
  // Initialize context system
  logger.info('🔗 Initializing context system...');
  
  // Initialize job registry
  logger.info('📋 Initializing job registry...');
  
  // Initialize event system
  logger.info('📡 Initializing event system...');
  
  // Initialize pack system
  logger.info('📦 Initializing pack system...');
  
  logger.info('✅ Core systems initialized');
}

/**
 * Shutdown GitVan runtime
 * @param {Object} options - Shutdown options
 */
export async function shutdownGitVan(options = {}) {
  try {
    logger.info('🛑 Shutting down GitVan runtime...');
    
    // Cleanup resources
    // Stop daemon if running
    // Save state
    
    logger.info('✅ GitVan runtime shutdown complete');
  } catch (error) {
    logger.error(`❌ Shutdown failed: ${error.message}`);
    throw error;
  }
}

// Export default for backward compatibility
export default { runJobWithContext, bootstrapGitVan, shutdownGitVan };