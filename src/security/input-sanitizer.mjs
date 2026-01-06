/**
 * Input Sanitization Utilities
 * Prevents injection attacks and validates user input
 */

import { z } from 'zod';

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - User input to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string');
  }

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove or escape dangerous characters for code generation
  if (options.forCodeGeneration) {
    // Escape backticks, quotes, and template literals
    sanitized = sanitized
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${')
      .replace(/\\/g, '\\\\');
  }

  // Remove control characters except newlines and tabs if allowed
  if (!options.allowControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Limit length
  const maxLength = options.maxLength || 1000;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize identifier (variable name, function name, etc.)
 * @param {string} identifier - Identifier to sanitize
 * @returns {string} Sanitized identifier
 */
export function sanitizeIdentifier(identifier) {
  if (typeof identifier !== 'string') {
    throw new TypeError('Identifier must be a string');
  }

  // Remove all non-alphanumeric characters except underscore and hyphen
  let sanitized = identifier.replace(/[^a-zA-Z0-9_-]/g, '');

  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = 'job_' + sanitized;
  }

  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'unnamed_job';
  }

  return sanitized;
}

/**
 * Validate and sanitize job specification
 * @param {object} spec - Job specification
 * @returns {object} Sanitized specification
 */
export function sanitizeJobSpec(spec) {
  const JobSpecSchema = z.object({
    name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/).optional().default('unnamed-job'),
    desc: z.string().max(500).default('Generated job'),
    tags: z.array(z.string().max(50)).max(20).default(['generated']),
    author: z.string().max(100).default('GitVan AI'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
    on: z.union([
      z.string(),
      z.array(z.string()),
      z.record(z.unknown())
    ]).optional(),
    code: z.string().max(50000).optional(),
    implementation: z.string().max(50000).optional(),
    run: z.string().max(50000).optional()
  });

  try {
    const validated = JobSpecSchema.parse(spec);

    return {
      ...validated,
      name: sanitizeIdentifier(validated.name),
      desc: sanitizeString(validated.desc, { maxLength: 500 }),
      author: sanitizeString(validated.author, { maxLength: 100 }),
      tags: validated.tags.map(tag => sanitizeString(tag, { maxLength: 50 }))
    };
  } catch (error) {
    throw new Error(`Invalid job specification: ${error.message}`);
  }
}

/**
 * Validate file path to prevent directory traversal
 * @param {string} filePath - File path to validate
 * @param {string} basePath - Base path to restrict to
 * @returns {string} Validated absolute path
 */
export function validateFilePath(filePath, basePath) {
  if (typeof filePath !== 'string') {
    throw new TypeError('File path must be a string');
  }

  // Remove null bytes
  const cleaned = filePath.replace(/\0/g, '');

  // Check for directory traversal attempts
  if (cleaned.includes('..')) {
    throw new Error('Directory traversal not allowed');
  }

  // Additional checks for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,        // Directory traversal
    /~\//,         // Home directory expansion
    /\$\{/,        // Variable expansion
    /`/,           // Command substitution
    /\|/,          // Pipe
    /;/,           // Command separator
    /&amp;&amp;/,       // Command chain
    /\|\|/,        // Command chain
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(cleaned)) {
      throw new Error(`Suspicious pattern detected in file path: ${pattern}`);
    }
  }

  return cleaned;
}

/**
 * Sanitize environment variable value
 * @param {string} value - Environment variable value
 * @returns {string} Sanitized value
 */
export function sanitizeEnvVar(value) {
  if (typeof value !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  return value
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Detect potential secrets in strings
 * @param {string} input - Input to check for secrets
 * @returns {boolean} True if potential secrets detected
 */
export function containsSecrets(input) {
  if (typeof input !== 'string') {
    return false;
  }

  const secretPatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /access[_-]?key/i,
    /private[_-]?key/i,
    /sk-[a-zA-Z0-9]{32,}/,  // API key pattern
    /ghp_[a-zA-Z0-9]{36}/,  // GitHub token
    /xox[baprs]-[a-zA-Z0-9-]{10,}/, // Slack token
  ];

  return secretPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate SPARQL query
 * @param {string} query - SPARQL query to validate
 * @returns {string} Validated query
 */
export function validateSparqlQuery(query) {
  if (typeof query !== 'string') {
    throw new TypeError('SPARQL query must be a string');
  }

  const cleaned = query.trim();

  // Basic SPARQL query validation
  const validPrefixes = ['SELECT', 'ASK', 'CONSTRUCT', 'DESCRIBE', 'INSERT', 'DELETE'];
  const hasValidPrefix = validPrefixes.some(prefix =>
    cleaned.toUpperCase().startsWith(prefix)
  );

  if (!hasValidPrefix) {
    throw new Error('Invalid SPARQL query: must start with SELECT, ASK, CONSTRUCT, DESCRIBE, INSERT, or DELETE');
  }

  // Check for injection attempts
  const dangerousPatterns = [
    /;\s*DROP/i,
    /;\s*DELETE/i,
    /;\s*INSERT/i,
    /--/,          // SQL comment
    /\/\*/,        // Block comment start
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleaned)) {
      throw new Error('Potentially dangerous pattern detected in SPARQL query');
    }
  }

  // Limit query size
  if (cleaned.length > 10000) {
    throw new Error('SPARQL query too large (max 10000 characters)');
  }

  return cleaned;
}

/**
 * Validate cron expression
 * @param {string} cronExpr - Cron expression to validate
 * @returns {string} Validated cron expression
 */
export function validateCronExpression(cronExpr) {
  if (typeof cronExpr !== 'string') {
    throw new TypeError('Cron expression must be a string');
  }

  const parts = cronExpr.trim().split(/\s+/);

  // Basic cron validation: should have 5 or 6 parts
  if (parts.length < 5 || parts.length > 6) {
    throw new Error('Invalid cron expression: must have 5 or 6 parts');
  }

  // Check each part is valid
  const validPartPattern = /^(\*|[\d,\-\/]+|[\d,\-\/]+L?)$/;
  for (const part of parts) {
    if (!validPartPattern.test(part)) {
      throw new Error(`Invalid cron expression part: ${part}`);
    }
  }

  return cronExpr.trim();
}

/**
 * Validate Git reference (branch, tag, commit)
 * @param {string} ref - Git reference to validate
 * @returns {string} Validated reference
 */
export function validateGitRef(ref) {
  if (typeof ref !== 'string') {
    throw new TypeError('Git reference must be a string');
  }

  const cleaned = ref.trim();

  // Git ref validation rules
  const invalidPatterns = [
    /\.\./,        // No double dots
    /^-/,          // Cannot start with dash
    /@{/,          // No @{ syntax
    /[~^:?*\[\\]/, // Invalid characters
    /\/\//,        // No double slashes
    /\.$/,         // Cannot end with dot
    /\.lock$/,     // Cannot end with .lock
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(cleaned)) {
      throw new Error(`Invalid Git reference: ${cleaned}`);
    }
  }

  // Check length
  if (cleaned.length === 0 || cleaned.length > 255) {
    throw new Error('Git reference must be between 1 and 255 characters');
  }

  return cleaned;
}
