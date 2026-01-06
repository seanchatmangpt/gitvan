/**
 * GitVan Secrets Management
 *
 * Secure handling of secrets with:
 * - Environment variable loading
 * - Secret validation on startup
 * - Exposure warnings
 * - Integration with secret managers (future)
 * - No secrets in logs
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createLogger } from "./logger.mjs";
import { ConfigurationError } from "../core/errors.mjs";

const logger = createLogger("secrets");

// Required secrets by provider
const REQUIRED_SECRETS = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  ollama: [], // Ollama doesn't require API keys
};

// Sensitive environment variable patterns
const SENSITIVE_PATTERNS = [
  /API_KEY/i,
  /SECRET/i,
  /PASSWORD/i,
  /TOKEN/i,
  /PRIVATE/i,
  /CREDENTIAL/i,
];

/**
 * Check if environment variable name is sensitive
 * @param {string} key - Environment variable name
 * @returns {boolean} True if sensitive
 */
function isSensitiveKey(key) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Mask secret value for logging
 * @param {string} value - Secret value
 * @returns {string} Masked value
 */
export function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 8) return "***";

  // Show first 4 and last 4 characters
  return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`;
}

/**
 * Load secrets from .env file
 * @param {string} [envPath] - Path to .env file
 * @returns {object} Loaded secrets
 */
export function loadEnvFile(envPath = ".env") {
  const path = resolve(process.cwd(), envPath);

  if (!existsSync(path)) {
    logger.debug("No .env file found", { path });
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    const secrets = {};

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Parse KEY=VALUE
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) continue;

      const [, key, value] = match;
      const cleanKey = key.trim();
      const cleanValue = value.trim().replace(/^["']|["']$/g, "");

      // Don't override existing environment variables
      if (!process.env[cleanKey]) {
        process.env[cleanKey] = cleanValue;
        secrets[cleanKey] = cleanValue;
      }
    }

    logger.info(".env file loaded", {
      path,
      count: Object.keys(secrets).length,
    });

    return secrets;
  } catch (error) {
    logger.error("Failed to load .env file", {
      path,
      error: error.message,
    });
    return {};
  }
}

/**
 * Get secret from environment
 * @param {string} key - Environment variable name
 * @param {object} [options] - Options
 * @param {boolean} [options.required=false] - Throw if missing
 * @param {string} [options.default] - Default value if missing
 * @returns {string | undefined} Secret value
 * @throws {ConfigurationError} If required and missing
 */
export function getSecret(key, options = {}) {
  const { required = false, default: defaultValue } = options;

  const value = process.env[key];

  if (!value) {
    if (required) {
      throw new ConfigurationError(
        `Required secret '${key}' is not set. Please set the ${key} environment variable.`,
        key
      );
    }

    if (defaultValue !== undefined) {
      logger.debug("Using default value for secret", { key });
      return defaultValue;
    }

    logger.debug("Secret not set", { key });
    return undefined;
  }

  logger.debug("Secret loaded", {
    key,
    masked: maskSecret(value),
  });

  return value;
}

/**
 * Validate required secrets for provider
 * @param {string} provider - Provider name (anthropic, openai, ollama)
 * @throws {ConfigurationError} If required secrets are missing
 */
export function validateProviderSecrets(provider) {
  const required = REQUIRED_SECRETS[provider.toLowerCase()] || [];

  logger.info("Validating provider secrets", {
    provider,
    required: required.length,
  });

  const missing = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required secrets for provider '${provider}': ${missing.join(", ")}. ` +
        `Please set these environment variables.`,
      "secrets"
    );
  }

  logger.info("Provider secrets validated", { provider });
}

/**
 * Check for exposed secrets in environment
 * Warns if sensitive variables are set in non-production environments
 */
export function checkExposedSecrets() {
  const isProduction = process.env.NODE_ENV === "production";
  const exposed = [];

  for (const [key, value] of Object.entries(process.env)) {
    if (isSensitiveKey(key) && value) {
      exposed.push({
        key,
        masked: maskSecret(value),
        length: value.length,
      });
    }
  }

  if (exposed.length > 0) {
    if (!isProduction) {
      logger.warn("Sensitive environment variables detected", {
        count: exposed.length,
        variables: exposed.map((e) => ({
          key: e.key,
          masked: e.masked,
        })),
      });
    } else {
      logger.info("Secrets loaded", {
        count: exposed.length,
      });
    }
  }

  return exposed;
}

/**
 * Sanitize object for logging (remove secrets)
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
export function sanitizeForLogging(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = typeof value === "string" ? maskSecret(value) : "***";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Initialize secrets management
 * Loads .env file and validates secrets
 * @param {object} config - GitVan configuration
 */
export function initializeSecrets(config = {}) {
  logger.info("Initializing secrets management");

  // Load .env file
  loadEnvFile();

  // Check for exposed secrets
  const exposed = checkExposedSecrets();

  // Validate provider secrets if configured
  if (config.ai?.provider) {
    try {
      validateProviderSecrets(config.ai.provider);
    } catch (error) {
      logger.warn("Provider secrets validation failed", {
        error: error.message,
      });
      // Don't throw - let provider creation fail with proper error
    }
  }

  logger.info("Secrets management initialized", {
    exposedCount: exposed.length,
  });
}

/**
 * Get all secrets for a specific namespace
 * @param {string} prefix - Environment variable prefix (e.g., "GITVAN_")
 * @returns {object} Secrets with prefix removed from keys
 */
export function getSecretsWithPrefix(prefix) {
  const secrets = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix)) {
      const cleanKey = key.slice(prefix.length);
      secrets[cleanKey] = value;
    }
  }

  return secrets;
}

/**
 * Validate secret format (basic validation)
 * @param {string} secret - Secret to validate
 * @param {object} [options] - Validation options
 * @param {number} [options.minLength=8] - Minimum length
 * @param {RegExp} [options.pattern] - Pattern to match
 * @returns {boolean} True if valid
 */
export function validateSecretFormat(secret, options = {}) {
  const { minLength = 8, pattern } = options;

  if (!secret || typeof secret !== "string") {
    return false;
  }

  if (secret.length < minLength) {
    logger.warn("Secret too short", { length: secret.length, minLength });
    return false;
  }

  if (pattern && !pattern.test(secret)) {
    logger.warn("Secret does not match required pattern");
    return false;
  }

  return true;
}

/**
 * Clear secret from memory (best effort)
 * @param {string} key - Environment variable name
 */
export function clearSecret(key) {
  if (process.env[key]) {
    delete process.env[key];
    logger.debug("Secret cleared from memory", { key });
  }
}
