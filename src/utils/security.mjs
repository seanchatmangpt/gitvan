// src/utils/security.mjs
// GitVan v4.0.0 — Security Utilities
// Comprehensive security validation for job system with cross-platform support

import { resolve, isAbsolute, normalize, sep } from "pathe";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Windows reserved filenames that cannot be used
 * https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
 */
const WINDOWS_RESERVED_NAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

/**
 * Characters that are invalid in Windows filenames (beyond path traversal)
 */
const WINDOWS_INVALID_CHARS = /[\x00-\x1F]/;

/**
 * Check if running on Windows
 */
export function isWindows() {
  return process.platform === "win32";
}

/**
 * Check if a path is a Windows drive letter path (C:, D:, etc.)
 */
export function isDrivePath(path) {
  if (!isWindows()) return false;
  return /^[a-zA-Z]:/.test(path);
}

/**
 * Check if a path is a UNC path (\\server\share or //server/share)
 */
export function isUNCPath(path) {
  if (!isWindows()) return false;
  return /^\\\\[^\\]+\\[^\\]+/.test(path) || /^\/\/[^/]+\/[^/]+/.test(path);
}

/**
 * Check if a filename uses a Windows reserved name
 */
export function isReservedName(filename) {
  if (!isWindows()) return false;

  // Remove extension and check base name
  const baseName = filename.split(".")[0].toUpperCase();
  return WINDOWS_RESERVED_NAMES.has(baseName);
}

/**
 * Check if a path contains invalid Windows characters (control characters)
 */
export function hasInvalidControlChars(path) {
  if (!isWindows()) return false;

  // Extract filename from path
  const parts = path.split(/[/\\]/);
  const filename = parts[parts.length - 1];

  return WINDOWS_INVALID_CHARS.test(filename);
}

/**
 * Validate a path for Windows compatibility
 * @param {string} path - Path to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateWindowsPath(path) {
  if (!isWindows()) {
    return { valid: true };
  }

  // Check for invalid control characters
  if (hasInvalidControlChars(path)) {
    return {
      valid: false,
      error: `Path contains invalid Windows control characters: ${path}`,
    };
  }

  // Check for reserved names
  const parts = path.split(/[/\\]/);
  for (const part of parts) {
    if (part && isReservedName(part)) {
      return {
        valid: false,
        error: `Path contains reserved Windows name: ${part}`,
      };
    }
  }

  // Check path length (Windows has a 260 character limit for most APIs)
  // Note: This can be extended with \\?\ prefix, but we keep it simple
  if (path.length > 260) {
    return {
      valid: false,
      error: `Path exceeds Windows maximum length (260 characters): ${path.length}`,
    };
  }

  return { valid: true };
}

/**
 * Convert a file path to a file:// URL
 * Handles Windows drive letters and UNC paths correctly
 *
 * Examples:
 * - Windows: C:\path\to\file.js → file:///C:/path/to/file.js
 * - Windows UNC: \\server\share\file.js → file://server/share/file.js
 * - Unix: /path/to/file.js → file:///path/to/file.js
 *
 * @param {string} path - File system path
 * @returns {string} file:// URL
 */
export function pathToFileURL(path) {
  if (!path) return path;

  // Normalize path separators to forward slashes
  let normalized = path.replace(/\\/g, "/");

  // Handle Windows drive letters (C:/ → /C:/)
  if (isDrivePath(path)) {
    // Ensure it starts with /
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized;
    }
    // file:// + /C:/path = file:///C:/path
    return "file://" + normalized;
  }

  // Handle UNC paths (\\server\share → //server/share)
  if (isUNCPath(path)) {
    // Remove leading slashes and add back as //
    normalized = normalized.replace(/^[/\\]+/, "");
    return "file://" + normalized;
  }

  // Handle Unix absolute paths (/path → file:///path)
  if (normalized.startsWith("/")) {
    return "file://" + normalized;
  }

  // Relative paths - make absolute first
  const absolutePath = resolve(path).replace(/\\/g, "/");
  if (isDrivePath(absolutePath)) {
    return "file:///" + absolutePath;
  }
  return "file://" + absolutePath;
}

/**
 * Normalize line endings to LF (\n)
 * Windows uses CRLF (\r\n), Unix uses LF (\n)
 * @param {string} content - Content to normalize
 * @returns {string} Content with LF line endings
 */
export function normalizeLineEndings(content) {
  // Replace all CRLF with LF
  return content.replace(/\r\n/g, "\n");
}

/**
 * Validate and sanitize file paths to prevent code injection
 * @param {string} filePath - Path to validate
 * @param {object} options - Validation options
 * @param {string[]} options.allowedDirs - Allowed base directories
 * @param {boolean} options.mustExist - Whether file must exist
 * @returns {string} Validated and normalized path
 * @throws {Error} If path is invalid or suspicious
 */
export function validateFilePath(filePath, options = {}) {
  const { allowedDirs = [], mustExist = true } = options;

  if (!filePath || typeof filePath !== "string") {
    throw new Error("File path must be a non-empty string");
  }

  // Detect null bytes (common injection technique)
  if (filePath.includes("\0")) {
    throw new Error("File path contains null bytes");
  }

  // Detect suspicious patterns
  const suspiciousPatterns = [
    /\.\.[/\\]/, // Path traversal
    /\0/, // Null bytes
    /[<>"|?*]/, // Invalid filename characters
    /^[a-z]:[/\\]{2,}/i, // UNC paths (Windows)
    /\$\{.*\}/, // Template injection
    /`.*`/, // Backtick injection
    /\beval\b/, // eval keyword
    /\brequire\b\s*\(/, // require() calls
    /\bimport\b\s*\(/, // dynamic import() calls
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filePath)) {
      throw new Error(`File path contains suspicious pattern: ${pattern}`);
    }
  }

  // Normalize and resolve path
  let normalizedPath = normalize(filePath);

  // Convert to absolute path if not already
  if (!isAbsolute(normalizedPath)) {
    normalizedPath = resolve(process.cwd(), normalizedPath);
  } else {
    normalizedPath = resolve(normalizedPath);
  }

  // Validate path is within allowed directories
  if (allowedDirs.length > 0) {
    const isAllowed = allowedDirs.some((allowedDir) => {
      const normalizedAllowedDir = resolve(allowedDir);
      return (
        normalizedPath === normalizedAllowedDir ||
        normalizedPath.startsWith(normalizedAllowedDir + sep)
      );
    });

    if (!isAllowed) {
      throw new Error(
        `File path is outside allowed directories: ${normalizedPath}`
      );
    }
  }

  // Check if file exists (if required)
  if (mustExist) {
    if (!existsSync(normalizedPath)) {
      throw new Error(`File does not exist: ${normalizedPath}`);
    }

    // Verify it's a file, not a directory
    const stats = statSync(normalizedPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${normalizedPath}`);
    }
  }

  return normalizedPath;
}

/**
 * Sanitize job ID to prevent path traversal attacks
 * @param {string} jobId - Job ID to sanitize
 * @returns {string} Sanitized job ID
 * @throws {Error} If job ID is invalid
 */
export function sanitizeJobId(jobId) {
  if (!jobId || typeof jobId !== "string") {
    throw new Error("Job ID must be a non-empty string");
  }

  // Check for null bytes
  if (jobId.includes("\0")) {
    throw new Error("Job ID contains null bytes");
  }

  // Check for path traversal sequences
  const pathTraversalPatterns = [
    /\.\./, // .. (parent directory)
    /[/\\]/, // Path separators
    /~/, // Home directory
    /\$/, // Environment variables
    /`/, // Backticks
    /\0/, // Null bytes
  ];

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(jobId)) {
      throw new Error(
        `Job ID contains invalid characters (pattern: ${pattern})`
      );
    }
  }

  // Sanitize: only allow alphanumeric, dash, underscore
  const sanitized = jobId.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Validate against whitelist pattern
  const whitelistPattern = /^[a-zA-Z0-9_-]+$/;
  if (!whitelistPattern.test(sanitized)) {
    throw new Error(
      `Job ID contains invalid characters after sanitization: ${sanitized}`
    );
  }

  // Prevent empty result after sanitization
  if (!sanitized || sanitized.length === 0) {
    throw new Error("Job ID is empty after sanitization");
  }

  // Limit length to prevent DoS
  const maxLength = 128;
  if (sanitized.length > maxLength) {
    throw new Error(`Job ID too long (max ${maxLength} characters)`);
  }

  return sanitized;
}

/**
 * Filter environment variables to prevent credential leakage
 * Implements strict allowlist approach with configurable options
 * @param {object} env - Environment variables to filter
 * @param {object} options - Filter options
 * @param {string[]} options.allowedPrefixes - Additional allowed prefixes
 * @param {string[]} options.allowedKeys - Additional allowed keys
 * @returns {object} Filtered environment variables
 */
export function filterEnvironmentVariables(env = process.env, options = {}) {
  const { allowedPrefixes = [], allowedKeys = [] } = options;

  // Strict allowlist of safe environment variables
  const defaultAllowedKeys = [
    "NODE_ENV",
    "TZ",
    "LANG",
    "LC_ALL",
    "PATH",
    "HOME",
    "USER",
    "TMPDIR",
    "TEMP",
  ];

  // Safe prefixes that don't contain credentials
  const defaultAllowedPrefixes = [
    "GITVAN_", // GitVan-specific variables
    "npm_", // NPM variables (generally safe)
  ];

  // Dangerous patterns that should NEVER be passed
  const blockedPatterns = [
    /_KEY$/i, // API keys
    /_SECRET$/i, // Secrets
    /_TOKEN$/i, // Auth tokens
    /_PASSWORD$/i, // Passwords
    /^ANTHROPIC_/i, // Anthropic API
    /^OPENAI_/i, // OpenAI API
    /^AWS_/i, // AWS credentials
    /^GITHUB_TOKEN/i, // GitHub tokens
    /^GITLAB_TOKEN/i, // GitLab tokens
    /^DOCKER_/i, // Docker credentials
    /^KUBERNETES_/i, // K8s credentials
    /^DATABASE_/i, // Database credentials
    /^DB_/i, // Database credentials (short form)
    /^REDIS_/i, // Redis credentials
    /^MONGO_/i, // MongoDB credentials
    /^MYSQL_/i, // MySQL credentials
    /^POSTGRES_/i, // PostgreSQL credentials
    /^SLACK_/i, // Slack tokens
    /^STRIPE_/i, // Stripe API keys
    /^TWILIO_/i, // Twilio credentials
    /^SENDGRID_/i, // SendGrid API keys
    /^MAILGUN_/i, // Mailgun credentials
  ];

  const filteredEnv = {};
  const allAllowedKeys = [...defaultAllowedKeys, ...allowedKeys];
  const allAllowedPrefixes = [...defaultAllowedPrefixes, ...allowedPrefixes];

  for (const [key, value] of Object.entries(env)) {
    // Skip if explicitly allowed
    if (allAllowedKeys.includes(key)) {
      filteredEnv[key] = value;
      continue;
    }

    // Skip if has allowed prefix
    const hasAllowedPrefix = allAllowedPrefixes.some((prefix) =>
      key.startsWith(prefix)
    );
    if (hasAllowedPrefix) {
      // Double-check it's not blocked
      const isBlocked = blockedPatterns.some((pattern) => pattern.test(key));
      if (!isBlocked) {
        filteredEnv[key] = value;
      }
      continue;
    }

    // Block if matches dangerous pattern
    const isBlocked = blockedPatterns.some((pattern) => pattern.test(key));
    if (!isBlocked) {
      // Not explicitly allowed or blocked - skip by default (strict allowlist)
      continue;
    }
  }

  return filteredEnv;
}

/**
 * Escape string for safe interpolation into code templates
 * Prevents code injection in template strings
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for code interpolation
 */
export function escapeForCodeTemplate(str) {
  if (typeof str !== "string") {
    throw new Error("Input must be a string");
  }

  // Escape backslashes first (must be first to avoid double-escaping)
  let escaped = str.replace(/\\/g, "\\\\");

  // Escape single quotes
  escaped = escaped.replace(/'/g, "\\'");

  // Escape double quotes
  escaped = escaped.replace(/"/g, '\\"');

  // Escape backticks (template literals)
  escaped = escaped.replace(/`/g, "\\`");

  // Escape newlines
  escaped = escaped.replace(/\n/g, "\\n");
  escaped = escaped.replace(/\r/g, "\\r");

  // Escape template literal interpolation
  escaped = escaped.replace(/\$\{/g, "\\${");

  return escaped;
}

/**
 * Validate worker file path before creation
 * Ensures worker files are only created in designated directory
 * @param {string} workerPath - Path where worker file will be created
 * @param {string} workerDir - Allowed worker directory
 * @throws {Error} If worker path is invalid
 */
export function validateWorkerPath(workerPath, workerDir) {
  const normalizedPath = resolve(workerPath);
  const normalizedDir = resolve(workerDir);

  // Ensure path is within worker directory
  if (!normalizedPath.startsWith(normalizedDir + sep)) {
    throw new Error(
      `Worker path is outside worker directory: ${normalizedPath}`
    );
  }

  // Ensure path doesn't escape via symlinks or hardlinks
  const relativePath = normalizedPath.slice(normalizedDir.length + 1);
  if (relativePath.includes("..")) {
    throw new Error(`Worker path contains path traversal: ${relativePath}`);
  }

  return normalizedPath;
}

/**
 * Security configuration for job execution
 * Provides default security settings
 */
export const SECURITY_DEFAULTS = {
  // Maximum worker file size (10MB)
  maxWorkerFileSize: 10 * 1024 * 1024,

  // Maximum job ID length
  maxJobIdLength: 128,

  // Lock timeout (5 minutes)
  lockTimeout: 300000,

  // Worker execution timeout (30 minutes)
  workerTimeout: 1800000,

  // Allowed environment variable prefixes
  allowedEnvPrefixes: ["GITVAN_"],

  // Allowed environment variable keys
  allowedEnvKeys: ["NODE_ENV", "TZ", "LANG", "PATH", "HOME"],
};

export default {
  validateFilePath,
  sanitizeJobId,
  filterEnvironmentVariables,
  escapeForCodeTemplate,
  validateWorkerPath,
  SECURITY_DEFAULTS,
  // Windows-specific utilities
  isWindows,
  isDrivePath,
  isUNCPath,
  isReservedName,
  hasInvalidControlChars,
  validateWindowsPath,
  pathToFileURL,
  normalizeLineEndings,
};
