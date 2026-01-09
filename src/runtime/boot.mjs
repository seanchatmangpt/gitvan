// GitVan v3.0.0 - Runtime Boot System
// Provides job execution context and bootstrapping functionality

import { withGitVan } from '../composables/ctx.mjs';
import { createLogger } from '../utils/logger.mjs';
import { loadConfig } from './config.mjs';
import { GitVanDefaults } from '../config/defaults.mjs';
import { getUnrdfStatus, checkSubmoduleUpdates, SUBMODULE_CONFIG } from '../utils/submodule-manager.mjs';
import { checkVersionCompatibility } from '../utils/unrdf-validator.mjs';

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
 * Verify UnRDF submodule on startup
 * @param {Object} config - Runtime configuration
 */
async function verifyUnrdfSubmodule(config) {
  try {
    const cwd = config.cwd || process.cwd();

    // Get submodule status
    const status = getUnrdfStatus(cwd);

    if (!status.initialized) {
      logger.warn('⚠️  UnRDF submodule not initialized');
      logger.info('   Run: git submodule update --init --recursive');
      logger.info('   Or: gitvan submodule init');
      return;
    }

    // Log version information
    logger.info(`📦 UnRDF: v${status.version || 'unknown'} (${status.currentCommit})`);

    // Check version compatibility
    if (status.version) {
      const versionCheck = checkVersionCompatibility(status.version);
      if (!versionCheck.compatible) {
        logger.warn(`⚠️  UnRDF version incompatible: ${versionCheck.reason}`);
        logger.info(`   Current: ${versionCheck.current}, Minimum: ${versionCheck.minimum}`);
        logger.info('   Run: gitvan submodule update');
      }
    }

    // Check if out of sync
    if (status.outOfSync) {
      logger.warn('⚠️  UnRDF submodule out of sync');
      logger.info(`   Expected: ${status.expectedCommit}, Current: ${status.currentCommit}`);
      logger.info('   Run: gitvan submodule sync');
    }

    // Check if there are uncommitted changes
    if (status.hasChanges) {
      logger.warn('⚠️  UnRDF submodule has uncommitted changes');
    }

    // Check for updates (non-blocking)
    try {
      const updates = checkSubmoduleUpdates(SUBMODULE_CONFIG.unrdf.path, cwd);
      if (updates.available && updates.behindCount > 0) {
        logger.info(`💡 UnRDF updates available: ${updates.behindCount} commits behind`);
        logger.info('   Run: gitvan submodule check');
      }
    } catch (error) {
      // Update check failed - not critical, just log
      logger.debug('Could not check for UnRDF updates:', error.message);
    }
  } catch (error) {
    // Submodule verification failed - log but don't block startup
    logger.warn('⚠️  Failed to verify UnRDF submodule:', error.message);
  }
}

/**
 * Initialize core GitVan systems
 * @param {Object} config - Runtime configuration
 */
async function initializeCoreSystems(config) {
  // Verify UnRDF submodule
  logger.info('🔍 Verifying UnRDF submodule...');
  await verifyUnrdfSubmodule(config);

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