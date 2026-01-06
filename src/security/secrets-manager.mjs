/**
 * Secure Secrets Management
 * Centralized, validated secrets handling for GitVan
 */

import { z } from 'zod';
import { createLogger } from '../utils/logger.mjs';
import { sanitizeEnvVar } from './input-sanitizer.mjs';

const logger = createLogger('secrets-manager');

// Schema for secrets configuration
const SecretsSchema = z.object({
  // GitHub integration
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REPOSITORY: z.string().optional(),

  // Slack integration
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_DEFAULT_CHANNEL: z.string().optional(),

  // AI providers
  AI_PROVIDER: z.enum(['anthropic', 'ollama', 'mock']).optional().default('ollama'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),

  // GitVan configuration
  GITVAN_HOME: z.string().optional(),
  GITVAN_REPO: z.string().optional(),

  // Environment settings
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  TZ: z.string().optional().default('UTC'),
  LANG: z.string().optional().default('C'),
});

/**
 * Secrets Manager - centralized secrets handling
 */
export class SecretsManager {
  constructor() {
    this.secrets = new Map();
    this.validated = false;
    this.requiredSecrets = new Set();
  }

  /**
   * Load and validate secrets from environment
   * @param {object} options - Loading options
   * @returns {object} Validation result
   */
  loadFromEnvironment(options = {}) {
    try {
      // Sanitize all environment variables
      const sanitized = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeEnvVar(value);
        }
      }

      // Validate against schema
      const validated = SecretsSchema.parse(sanitized);

      // Store validated secrets
      for (const [key, value] of Object.entries(validated)) {
        if (value !== undefined && value !== null) {
          this.secrets.set(key, value);
        }
      }

      this.validated = true;

      logger.info('Secrets loaded and validated successfully');

      return {
        success: true,
        secretsLoaded: this.secrets.size,
        errors: []
      };
    } catch (error) {
      logger.error('Secrets validation failed:', error.message);

      return {
        success: false,
        secretsLoaded: 0,
        errors: error.errors || [error.message]
      };
    }
  }

  /**
   * Get a secret value
   * @param {string} key - Secret key
   * @param {object} options - Options
   * @returns {string|undefined} Secret value
   */
  get(key, options = {}) {
    if (!this.validated && !options.skipValidation) {
      throw new Error('Secrets not loaded. Call loadFromEnvironment() first.');
    }

    const value = this.secrets.get(key);

    // Check if required but missing
    if (!value && this.requiredSecrets.has(key)) {
      throw new Error(`Required secret missing: ${key}`);
    }

    return value;
  }

  /**
   * Set a secret value (for testing)
   * @param {string} key - Secret key
   * @param {string} value - Secret value
   */
  set(key, value) {
    const sanitized = sanitizeEnvVar(value);
    this.secrets.set(key, sanitized);
  }

  /**
   * Check if a secret exists
   * @param {string} key - Secret key
   * @returns {boolean} True if secret exists
   */
  has(key) {
    return this.secrets.has(key) && this.secrets.get(key) !== undefined;
  }

  /**
   * Mark a secret as required
   * @param {string} key - Secret key
   */
  require(key) {
    this.requiredSecrets.add(key);
  }

  /**
   * Validate required secrets are present
   * @returns {object} Validation result
   */
  validateRequired() {
    const missing = [];

    for (const key of this.requiredSecrets) {
      if (!this.has(key)) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      logger.error('Missing required secrets:', missing.join(', '));
      return {
        valid: false,
        missing
      };
    }

    return {
      valid: true,
      missing: []
    };
  }

  /**
   * Get secrets for a specific integration
   * @param {string} integration - Integration name
   * @returns {object} Integration secrets
   */
  getIntegrationSecrets(integration) {
    const integrationSecrets = {
      github: {
        token: this.get('GITHUB_TOKEN'),
        repository: this.get('GITHUB_REPOSITORY')
      },
      slack: {
        webhookUrl: this.get('SLACK_WEBHOOK_URL'),
        botToken: this.get('SLACK_BOT_TOKEN'),
        defaultChannel: this.get('SLACK_DEFAULT_CHANNEL')
      },
      ai: {
        provider: this.get('AI_PROVIDER'),
        anthropicApiKey: this.get('ANTHROPIC_API_KEY'),
        ollamaBaseUrl: this.get('OLLAMA_BASE_URL')
      }
    };

    return integrationSecrets[integration] || {};
  }

  /**
   * Clear all secrets (for testing)
   */
  clear() {
    this.secrets.clear();
    this.requiredSecrets.clear();
    this.validated = false;
  }

  /**
   * Get a safe summary (no secret values)
   * @returns {object} Summary
   */
  getSummary() {
    return {
      validated: this.validated,
      secretsCount: this.secrets.size,
      secretKeys: Array.from(this.secrets.keys()),
      requiredSecrets: Array.from(this.requiredSecrets),
      missingRequired: Array.from(this.requiredSecrets).filter(key => !this.has(key))
    };
  }
}

// Singleton instance
let secretsManager = null;

/**
 * Get the global secrets manager instance
 * @returns {SecretsManager} Secrets manager
 */
export function getSecretsManager() {
  if (!secretsManager) {
    secretsManager = new SecretsManager();
    secretsManager.loadFromEnvironment();
  }
  return secretsManager;
}

/**
 * Reset the secrets manager (for testing)
 */
export function resetSecretsManager() {
  if (secretsManager) {
    secretsManager.clear();
  }
  secretsManager = null;
}

/**
 * Validate environment on startup
 * @param {object} options - Validation options
 * @returns {object} Validation result
 */
export function validateEnvironmentOnStartup(options = {}) {
  const manager = getSecretsManager();

  // Mark required secrets based on configuration
  if (options.requireGitHub) {
    manager.require('GITHUB_TOKEN');
    manager.require('GITHUB_REPOSITORY');
  }

  if (options.requireSlack) {
    if (!manager.has('SLACK_WEBHOOK_URL') && !manager.has('SLACK_BOT_TOKEN')) {
      logger.warn('Slack integration requires either SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN');
    }
  }

  if (options.requireAI) {
    const provider = manager.get('AI_PROVIDER') || 'ollama';
    if (provider === 'anthropic') {
      manager.require('ANTHROPIC_API_KEY');
    } else if (provider === 'ollama') {
      // OLLAMA_BASE_URL is optional, defaults to localhost
    }
  }

  // Validate required secrets
  const validation = manager.validateRequired();

  if (!validation.valid) {
    logger.error('Environment validation failed!');
    logger.error('Missing required secrets:', validation.missing.join(', '));

    if (options.failOnMissing) {
      throw new Error(`Missing required environment variables: ${validation.missing.join(', ')}`);
    }
  } else {
    logger.info('Environment validation successful');
  }

  return {
    valid: validation.valid,
    missing: validation.missing,
    summary: manager.getSummary()
  };
}
