/**
 * Startup Validation
 * Validates environment and security configuration on GitVan startup
 */

import { createLogger } from '../utils/logger.mjs';
import { validateEnvironmentOnStartup } from './secrets-manager.mjs';

const logger = createLogger('startup-validation');

/**
 * Validate GitVan security configuration on startup
 * @param {object} config - GitVan configuration
 * @returns {object} Validation result
 */
export function validateSecurityOnStartup(config = {}) {
  logger.info('Running startup security validation...');

  const results = {
    environment: null,
    configuration: null,
    warnings: [],
    errors: []
  };

  try {
    // 1. Validate environment variables
    results.environment = validateEnvironmentOnStartup({
      requireGitHub: config.integrations?.github?.enabled,
      requireSlack: config.integrations?.slack?.enabled,
      requireAI: config.ai?.enabled !== false,
      failOnMissing: config.security?.strictMode === true
    });

    if (!results.environment.valid) {
      results.errors.push('Environment validation failed');
      logger.error('Missing required environment variables:', results.environment.missing);
    }

    // 2. Validate security configuration
    results.configuration = validateSecurityConfiguration(config);

    if (!results.configuration.valid) {
      results.errors.push('Security configuration validation failed');
    }

    // 3. Check for insecure settings
    const insecureSettings = checkInsecureSettings(config);
    if (insecureSettings.length > 0) {
      results.warnings.push(...insecureSettings);
    }

    // 4. Validate critical paths
    const pathValidation = validateCriticalPaths(config);
    if (!pathValidation.valid) {
      results.errors.push(...pathValidation.errors);
    }

    // Summary
    const allValid = results.errors.length === 0;

    if (allValid) {
      logger.info('✅ Startup security validation passed');
    } else {
      logger.error('❌ Startup security validation failed');
      logger.error('Errors:', results.errors);
    }

    if (results.warnings.length > 0) {
      logger.warn('⚠️  Security warnings:', results.warnings);
    }

    return {
      valid: allValid,
      environment: results.environment,
      configuration: results.configuration,
      warnings: results.warnings,
      errors: results.errors
    };
  } catch (error) {
    logger.error('Startup validation error:', error.message);

    return {
      valid: false,
      environment: results.environment,
      configuration: results.configuration,
      warnings: results.warnings,
      errors: [...results.errors, error.message]
    };
  }
}

/**
 * Validate security configuration
 * @param {object} config - GitVan configuration
 * @returns {object} Validation result
 */
function validateSecurityConfiguration(config) {
  const errors = [];

  // Check if security configuration exists
  if (!config.security) {
    errors.push('No security configuration found');
    return { valid: false, errors };
  }

  // Validate CORS settings (if web server enabled)
  if (config.server?.enabled) {
    if (!config.server.cors) {
      errors.push('CORS configuration missing for enabled server');
    }
  }

  // Validate rate limiting (if API enabled)
  if (config.api?.enabled) {
    if (!config.api.rateLimit) {
      errors.push('Rate limiting not configured for API');
    }
  }

  // Validate authentication (if public access enabled)
  if (config.api?.public) {
    if (!config.api.authentication) {
      errors.push('Authentication not configured for public API');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check for insecure settings
 * @param {object} config - GitVan configuration
 * @returns {Array<string>} Warnings
 */
function checkInsecureSettings(config) {
  const warnings = [];

  // Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    // Production-specific checks

    // Debug mode
    if (config.debug === true) {
      warnings.push('Debug mode enabled in production');
    }

    // Template noCache
    if (config.templates?.noCache === true) {
      warnings.push('Template caching disabled in production');
    }

    // Verbose logging
    if (config.logging?.level === 'debug' || config.logging?.level === 'trace') {
      warnings.push('Verbose logging enabled in production');
    }

    // HTTP instead of HTTPS
    if (config.server?.protocol === 'http') {
      warnings.push('HTTP protocol used instead of HTTPS in production');
    }

    // Autoescape disabled
    if (config.templates?.autoescape === false) {
      warnings.push('Template autoescape disabled (SSTI risk)');
    }
  }

  // Development-specific checks
  if (process.env.NODE_ENV === 'development') {
    // Strict mode
    if (config.security?.strictMode === true) {
      warnings.push('Strict mode enabled in development (may cause issues)');
    }
  }

  return warnings;
}

/**
 * Validate critical paths
 * @param {object} config - GitVan configuration
 * @returns {object} Validation result
 */
function validateCriticalPaths(config) {
  const errors = [];

  // Check for directory traversal in configured paths
  const pathsToCheck = [
    config.templates?.dirs,
    config.jobs?.dirs,
    config.packs?.dirs,
    config.hooks?.dirs,
    config.workflows?.dirs,
    config.graph?.dirs
  ].flat().filter(Boolean);

  for (const path of pathsToCheck) {
    if (typeof path === 'string' && path.includes('..')) {
      errors.push(`Directory traversal detected in path: ${path}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Run full security audit on startup
 * @param {object} config - GitVan configuration
 * @returns {object} Audit result
 */
export function runSecurityAudit(config = {}) {
  logger.info('Running full security audit...');

  const results = {
    validation: validateSecurityOnStartup(config),
    recommendations: [],
    criticalIssues: [],
    timestamp: new Date().toISOString()
  };

  // Collect critical issues
  if (results.validation.errors.length > 0) {
    results.criticalIssues.push(...results.validation.errors);
  }

  // Generate recommendations
  if (results.validation.warnings.length > 0) {
    results.recommendations.push(
      'Address security warnings to improve security posture'
    );
  }

  if (!config.security?.strictMode && process.env.NODE_ENV === 'production') {
    results.recommendations.push(
      'Enable strict mode in production for enhanced security'
    );
  }

  if (!config.templates?.autoescape) {
    results.recommendations.push(
      'Enable template autoescape to prevent XSS attacks'
    );
  }

  // Summary
  results.passed = results.criticalIssues.length === 0;
  results.score = calculateSecurityScore(config, results.validation);

  logger.info(`Security score: ${results.score}/100`);

  if (results.passed) {
    logger.info('✅ Security audit passed');
  } else {
    logger.error('❌ Security audit failed');
    logger.error('Critical issues:', results.criticalIssues);
  }

  return results;
}

/**
 * Calculate security score (0-100)
 * @param {object} config - GitVan configuration
 * @param {object} validation - Validation results
 * @returns {number} Security score
 */
function calculateSecurityScore(config, validation) {
  let score = 100;

  // Deduct points for errors
  score -= validation.errors.length * 10;

  // Deduct points for warnings
  score -= validation.warnings.length * 5;

  // Deduct points for missing features
  if (!config.security) score -= 10;
  if (!config.templates?.autoescape) score -= 10;
  if (config.templates?.noCache && process.env.NODE_ENV === 'production') score -= 5;
  if (!config.security?.strictMode && process.env.NODE_ENV === 'production') score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Initialize security on startup (to be called from main entry point)
 * @param {object} config - GitVan configuration
 * @returns {object} Initialization result
 */
export function initializeSecurity(config = {}) {
  logger.info('Initializing security...');

  try {
    const audit = runSecurityAudit(config);

    if (!audit.passed && config.security?.strictMode) {
      throw new Error('Security audit failed in strict mode');
    }

    logger.info('Security initialization complete');

    return {
      success: true,
      audit
    };
  } catch (error) {
    logger.error('Security initialization failed:', error.message);

    if (config.security?.strictMode) {
      throw error;
    }

    return {
      success: false,
      error: error.message
    };
  }
}
