/**
 * Nunjucks Template Sanitization
 * Prevents Server-Side Template Injection (SSTI) attacks
 */

import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('template-sanitizer');

/**
 * Dangerous Nunjucks patterns that could lead to SSTI
 */
const DANGEROUS_PATTERNS = [
  // Direct process access
  /process\./,
  /global\./,
  /require\(/,
  /import\(/,

  // Constructor access (prototype pollution)
  /constructor\[/,
  /constructor\./,
  /__proto__/,
  /prototype\[/,
  /prototype\./,

  // eval and Function constructor
  /eval\(/,
  /Function\(/,

  // File system access
  /fs\./,
  /readFile/,
  /writeFile/,
  /unlink/,
  /rmdir/,

  // Child process execution
  /exec\(/,
  /spawn\(/,
  /execSync\(/,
  /spawnSync\(/,

  // Module loading
  /module\./,
  /exports\./,

  // Dangerous globals
  /console\.(log|error|warn)\(/,  // Allow, but log
];

/**
 * Allowlist of safe filters
 */
const SAFE_FILTERS = new Set([
  'abs',
  'batch',
  'capitalize',
  'center',
  'default',
  'dictsort',
  'dump',
  'escape',
  'first',
  'float',
  'forceescape',
  'groupby',
  'indent',
  'int',
  'join',
  'last',
  'length',
  'list',
  'lower',
  'nl2br',
  'random',
  'rejectattr',
  'replace',
  'reverse',
  'round',
  'safe',
  'select',
  'selectattr',
  'slice',
  'sort',
  'string',
  'striptags',
  'sum',
  'title',
  'trim',
  'truncate',
  'upper',
  'urlencode',
  'urlize',
  'wordcount',
  'wordwrap',
  // Date filters (custom)
  'date',
  'dateformat',
  'timestamp',
]);

/**
 * Sanitize template context data
 * @param {object} context - Template context data
 * @param {object} options - Sanitization options
 * @returns {object} Sanitized context
 */
export function sanitizeTemplateContext(context, options = {}) {
  if (!context || typeof context !== 'object') {
    return {};
  }

  const sanitized = {};
  const maxDepth = options.maxDepth || 10;

  function sanitizeValue(value, depth = 0) {
    if (depth > maxDepth) {
      logger.warn('Max depth exceeded in template context');
      return '[MAX DEPTH]';
    }

    // Null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Primitive types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // Arrays
    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item, depth + 1));
    }

    // Objects
    if (typeof value === 'object') {
      const sanitizedObj = {};

      for (const [key, val] of Object.entries(value)) {
        // Skip dangerous properties
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          logger.warn(`Skipping dangerous property: ${key}`);
          continue;
        }

        // Skip functions
        if (typeof val === 'function') {
          logger.warn(`Skipping function property: ${key}`);
          continue;
        }

        sanitizedObj[key] = sanitizeValue(val, depth + 1);
      }

      return sanitizedObj;
    }

    // Functions are not allowed
    if (typeof value === 'function') {
      logger.warn('Function detected in template context');
      return '[FUNCTION]';
    }

    return value;
  }

  return sanitizeValue(context);
}

/**
 * Validate template string for dangerous patterns
 * @param {string} templateString - Template string to validate
 * @param {object} options - Validation options
 * @returns {object} Validation result
 */
export function validateTemplateString(templateString, options = {}) {
  if (typeof templateString !== 'string') {
    return {
      valid: false,
      errors: ['Template must be a string']
    };
  }

  const errors = [];
  const warnings = [];

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(templateString)) {
      errors.push(`Dangerous pattern detected: ${pattern}`);
    }
  }

  // Check template size
  const maxSize = options.maxSize || 100000; // 100KB
  if (templateString.length > maxSize) {
    errors.push(`Template too large: ${templateString.length} > ${maxSize}`);
  }

  // Check for excessive nesting
  const maxNesting = options.maxNesting || 20;
  const nestingDepth = (templateString.match(/\{%/g) || []).length;
  if (nestingDepth > maxNesting) {
    warnings.push(`High nesting depth: ${nestingDepth}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info: {
      size: templateString.length,
      nestingDepth
    }
  };
}

/**
 * Create safe Nunjucks environment configuration
 * @param {object} options - Configuration options
 * @returns {object} Nunjucks configuration
 */
export function createSafeNunjucksConfig(options = {}) {
  return {
    // Always autoescape by default
    autoescape: options.autoescape !== undefined ? options.autoescape : true,

    // Prevent caching in development
    noCache: process.env.NODE_ENV === 'development',

    // Trim blocks
    trimBlocks: true,
    lstripBlocks: true,

    // Throw on undefined
    throwOnUndefined: options.throwOnUndefined !== undefined ? options.throwOnUndefined : false,

    // Custom tags (empty to prevent custom tag injection)
    tags: {
      blockStart: '{%',
      blockEnd: '%}',
      variableStart: '{{',
      variableEnd: '}}',
      commentStart: '{#',
      commentEnd: '#}'
    }
  };
}

/**
 * Safe filter wrapper
 * @param {object} env - Nunjucks environment
 * @param {string} name - Filter name
 * @param {function} filterFn - Filter function
 * @param {object} options - Options
 */
export function addSafeFilter(env, name, filterFn, options = {}) {
  if (!SAFE_FILTERS.has(name) && !options.allowCustom) {
    logger.warn(`Filter '${name}' not in safe filters list`);
  }

  // Wrap filter to catch errors
  const safeFilterFn = function(...args) {
    try {
      return filterFn.apply(this, args);
    } catch (error) {
      logger.error(`Filter '${name}' error:`, error.message);
      return options.fallbackValue || '';
    }
  };

  env.addFilter(name, safeFilterFn);
}

/**
 * Sanitize template file path
 * @param {string} templatePath - Template file path
 * @param {string} basePath - Base template directory
 * @returns {string} Sanitized path
 */
export function sanitizeTemplatePath(templatePath, basePath) {
  if (typeof templatePath !== 'string') {
    throw new TypeError('Template path must be a string');
  }

  // Remove null bytes
  const cleaned = templatePath.replace(/\0/g, '');

  // Check for directory traversal
  if (cleaned.includes('..')) {
    throw new Error('Directory traversal not allowed in template path');
  }

  // Check for absolute paths
  if (cleaned.startsWith('/') || /^[a-zA-Z]:/.test(cleaned)) {
    throw new Error('Absolute paths not allowed in template path');
  }

  // Ensure it ends with .njk or .html
  if (!/\.(njk|html|txt|md)$/.test(cleaned)) {
    throw new Error('Invalid template file extension');
  }

  return cleaned;
}

/**
 * Create a secure template rendering function
 * @param {object} env - Nunjucks environment
 * @param {object} options - Options
 * @returns {function} Secure render function
 */
export function createSecureRenderFunction(env, options = {}) {
  return async function secureRender(templatePath, context) {
    try {
      // Sanitize template path
      const safePath = sanitizeTemplatePath(templatePath, options.basePath || '');

      // Sanitize context
      const safeContext = sanitizeTemplateContext(context, {
        maxDepth: options.maxDepth || 10
      });

      // Render template
      return env.render(safePath, safeContext);
    } catch (error) {
      logger.error('Template rendering failed:', error.message);
      throw error;
    }
  };
}

/**
 * Audit template for security issues
 * @param {string} templateString - Template string to audit
 * @returns {object} Audit result
 */
export function auditTemplate(templateString) {
  const validation = validateTemplateString(templateString);
  const issues = [];

  // Check for dangerous patterns
  if (!validation.valid) {
    issues.push(...validation.errors.map(e => ({
      severity: 'critical',
      message: e
    })));
  }

  // Check for warnings
  if (validation.warnings && validation.warnings.length > 0) {
    issues.push(...validation.warnings.map(w => ({
      severity: 'warning',
      message: w
    })));
  }

  // Check for unescaped output
  const unescapedMatches = templateString.match(/\{\{\s*\w+\s*\|\s*safe\s*\}\}/g);
  if (unescapedMatches) {
    issues.push({
      severity: 'medium',
      message: `Found ${unescapedMatches.length} uses of |safe filter (potential XSS)`
    });
  }

  // Check for raw blocks
  const rawBlocks = templateString.match(/\{%\s*raw\s*%\}/g);
  if (rawBlocks) {
    issues.push({
      severity: 'low',
      message: `Found ${rawBlocks.length} raw blocks`
    });
  }

  return {
    safe: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
    info: validation.info
  };
}
