/**
 * @fileoverview GitVan Template Engine - KGN-based replacement for Nunjucks
 *
 * This module provides template rendering using the KGN engine from vendor/unrdf,
 * replacing the nunjucks dependency with a more deterministic and performant solution.
 *
 * Complete filter ecosystem with 40+ filters including:
 * - Determinism guards (now, random)
 * - Case conversion (camelCase, pascalCase, kebabCase, snakeCase)
 * - String operations (upper, lower, capitalize, slug, etc)
 * - Array operations (sum, max, min, etc)
 * - Type conversions (int, float, string, bool, json)
 * - Inflection filters (pluralize, singularize, humanize, etc)
 *
 * @module src/lib/template-engine
 * @version 2.0.0
 * @license Apache-2.0
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'pathe';
import * as inflection from 'inflection';
import { TemplateEngine } from '@unrdf/kgn';

/**
 * Custom error classes for template operations
 */
export class TemplateRenderError extends Error {
  constructor(message, templatePath, lineNumber) {
    super(message);
    this.name = 'TemplateRenderError';
    this.templatePath = templatePath;
    this.lineNumber = lineNumber;
  }
}

export class TemplateNotFoundError extends Error {
  constructor(templatePath, searchPaths) {
    super(`Template not found: ${templatePath}\nSearched paths: ${searchPaths.join(', ')}`);
    this.name = 'TemplateNotFoundError';
    this.templatePath = templatePath;
    this.searchPaths = searchPaths;
  }
}

export class TemplateSyntaxError extends Error {
  constructor(message, templatePath) {
    super(`Syntax error in ${templatePath}: ${message}`);
    this.name = 'TemplateSyntaxError';
    this.templatePath = templatePath;
  }
}

/**
 * Multi-level caching for templates
 */
class TemplateSourceCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
  }

  get(path) {
    const cached = this.cache.get(path);
    if (cached) {
      this.hits++;
      cached.accessTime = Date.now();
      return cached.source;
    }
    this.misses++;
    return null;
  }

  set(path, source) {
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.accessTime - b.accessTime)[0];
      this.cache.delete(oldest[0]);
    }

    this.cache.set(path, {
      source,
      accessTime: Date.now(),
      createdAt: Date.now()
    });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      maxSize: this.maxSize
    };
  }
}

/**
 * GitVan Template Engine - KGN-based template rendering
 * Provides deterministic template processing with 40+ custom filters
 */
export class GitVanTemplateEngine {
  /**
   * Create a new template engine instance
   * @param {Object} [options={}] - Engine configuration
   * @param {boolean} [options.deterministicMode=true] - Enable deterministic rendering
   * @param {boolean} [options.enableCache=true] - Enable template caching
   * @param {string[]} [options.paths=[]] - Template search paths
   * @param {boolean} [options.autoescape=false] - Enable HTML auto-escaping
   * @param {boolean} [options.throwOnUndefined=true] - Throw on undefined variables
   */
  constructor(options = {}) {
    this.options = {
      deterministicMode: options.deterministicMode !== false,
      enableCache: options.enableCache !== false,
      paths: options.paths || [],
      autoescape: options.autoescape || false,
      throwOnUndefined: options.throwOnUndefined !== false,
      ...options
    };

    // Initialize KGN engine
    this.engine = new TemplateEngine(this.options);

    // Filter registry for metadata
    this.filterRegistry = new Map();

    // Template caching
    this.sourceCache = new TemplateSourceCache(
      this.options.cacheConfig?.templateSourceCache?.maxSize || 100
    );

    // Setup all filter categories
    this.setupFilters();
  }

  /**
   * Setup all filter categories
   */
  setupFilters() {
    // Safety & Determinism
    this.setupDeterminismFilters();

    // Case conversions
    this.setupCaseFilters();

    // Built-in utilities
    this.setupBuiltInFilters();

    // Inflection
    this.setupInflectionFilters();

    // GitVan-specific
    this.setupGitVanFilters();
  }

  /**
   * Add determinism guard filters
   */
  setupDeterminismFilters() {
    this.addFilter('now', () => {
      throw new Error("Templates must not call now(); inject a value from context");
    }, { category: 'safety', isAsync: false });

    this.addFilter('random', () => {
      throw new Error("Templates must not use random(); inject values from context");
    }, { category: 'safety', isAsync: false });
  }

  /**
   * Add case conversion filters
   */
  setupCaseFilters() {
    this.addFilter('camelCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      return str.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
    }, { category: 'caseConversion' });

    this.addFilter('pascalCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      const camel = str.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    }, { category: 'caseConversion' });

    this.addFilter('kebabCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    }, { category: 'caseConversion' });

    this.addFilter('snakeCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    }, { category: 'caseConversion' });
  }

  /**
   * Add built-in utility filters
   */
  setupBuiltInFilters() {
    // JSON serialization
    this.addFilter('json', (v, space = 0) => JSON.stringify(v, null, space), {
      category: 'utility'
    });

    this.addFilter('tojson', (v) => JSON.stringify(v), { category: 'utility' });

    // String case transformations
    this.addFilter('upper', (s) => String(s).toUpperCase(), { category: 'string' });
    this.addFilter('lower', (s) => String(s).toLowerCase(), { category: 'string' });
    this.addFilter('capitalize', (s) => {
      const str = String(s);
      return str.charAt(0).toUpperCase() + str.slice(1);
    }, { category: 'string' });

    // URL-safe slug generation
    this.addFilter('slug', (s) =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      { category: 'string' }
    );

    // String padding utility
    this.addFilter('pad', (s, n = 2, ch = '0') => String(s).padStart(n, ch), {
      category: 'string'
    });

    // String manipulation
    this.addFilter('split', (s, delimiter = ' ') => String(s).split(delimiter), {
      category: 'string'
    });

    this.addFilter('join', (arr, delimiter = ', ') =>
      Array.isArray(arr) ? arr.join(delimiter) : String(arr),
      { category: 'string' }
    );

    this.addFilter('length', (v) => {
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'object' && v !== null) return Object.keys(v).length;
      return String(v).length;
    }, { category: 'string' });

    // Date formatting
    this.addFilter('date', (date, format = 'YYYY-MM-DD') => {
      const d = new Date(date === 'now' ? new Date() : date);
      if (isNaN(d.getTime())) return String(date);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');

      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    }, { category: 'utility' });

    // Array manipulation
    this.addFilter('sum', (arr, attribute = null) => {
      if (!Array.isArray(arr)) return 0;
      return arr.reduce((sum, item) => {
        const value = attribute ? item[attribute] : item;
        return sum + (Number(value) || 0);
      }, 0);
    }, { category: 'array' });

    this.addFilter('max', (arr, attribute = null) => {
      if (!Array.isArray(arr) || arr.length === 0) return null;
      return arr.reduce((max, item) => {
        const value = attribute ? item[attribute] : item;
        const numValue = Number(value);
        return numValue > max ? numValue : max;
      }, Number.MIN_SAFE_INTEGER);
    }, { category: 'array' });

    this.addFilter('min', (arr, attribute = null) => {
      if (!Array.isArray(arr) || arr.length === 0) return null;
      return arr.reduce((min, item) => {
        const value = attribute ? item[attribute] : item;
        const numValue = Number(value);
        return numValue < min ? numValue : min;
      }, Number.MAX_SAFE_INTEGER);
    }, { category: 'array' });

    // Type conversion
    this.addFilter('int', (v) => parseInt(String(v), 10) || 0, { category: 'type' });
    this.addFilter('float', (v) => parseFloat(String(v)) || 0, { category: 'type' });
    this.addFilter('string', (v) => String(v), { category: 'type' });
    this.addFilter('bool', (v) => Boolean(v), { category: 'type' });

    // Utility filters
    this.addFilter('default', (v, defaultValue) => v != null ? v : defaultValue, {
      category: 'utility'
    });

    this.addFilter('round', (v, precision = 0) =>
      Number(Number(v).toFixed(precision)),
      { category: 'utility' }
    );

    this.addFilter('abs', (v) => Math.abs(Number(v)), { category: 'utility' });
  }

  /**
   * Add inflection/grammar filters
   */
  setupInflectionFilters() {
    // Pluralization and singularization
    this.addFilter('pluralize', (s, plural) =>
      inflection.pluralize(String(s), plural),
      { category: 'inflection' }
    );

    this.addFilter('singularize', (s, singular) =>
      inflection.singularize(String(s), singular),
      { category: 'inflection' }
    );

    // Count-based inflection
    this.addFilter('inflect', (s, count, singular, plural) =>
      inflection.inflect(String(s), Number(count), singular, plural),
      { category: 'inflection' }
    );

    // Case transformations
    this.addFilter('camelize', (s, lowFirst = false) =>
      inflection.camelize(String(s), !!lowFirst),
      { category: 'inflection' }
    );

    this.addFilter('underscore', (s, allUpper = false) =>
      inflection.underscore(String(s), !!allUpper),
      { category: 'inflection' }
    );

    this.addFilter('humanize', (s, lowFirst = false) =>
      inflection.humanize(String(s), !!lowFirst),
      { category: 'inflection' }
    );

    // String formatting
    this.addFilter('dasherize', (s) => inflection.dasherize(String(s)), {
      category: 'inflection'
    });

    this.addFilter('titleize', (s) => inflection.titleize(String(s)), {
      category: 'inflection'
    });

    // Module and class transformations
    this.addFilter('demodulize', (s) => inflection.demodulize(String(s)), {
      category: 'inflection'
    });

    this.addFilter('tableize', (s) => inflection.tableize(String(s)), {
      category: 'inflection'
    });

    this.addFilter('classify', (s) => inflection.classify(String(s)), {
      category: 'inflection'
    });

    // Database-related transformations
    this.addFilter('foreign_key', (s, dropIdUBar = false) =>
      inflection.foreign_key(String(s), !!dropIdUBar),
      { category: 'inflection' }
    );

    // Ordinal number formatting
    this.addFilter('ordinalize', (s) => inflection.ordinalize(String(s)), {
      category: 'inflection'
    });

    // Transform with array of operations
    this.addFilter('transform', (s, arr = []) =>
      inflection.transform(String(s), Array.isArray(arr) ? arr : [arr]),
      { category: 'inflection' }
    );
  }

  /**
   * Add GitVan-specific filters
   */
  setupGitVanFilters() {
    // Git context filters
    this.addFilter('gitBranch', (context) =>
      context?.git?.branch || 'main',
      { category: 'gitvan' }
    );

    this.addFilter('gitTag', (version) => `v${version}`, { category: 'gitvan' });

    // Workflow context
    this.addFilter('workflowId', (context) =>
      context?.workflow?.id || 'unknown',
      { category: 'gitvan' }
    );

    // Pack system filters
    this.addFilter('packVersion', (pack) =>
      `${pack?.name || 'unknown'}@${pack?.version || '0.0.0'}`,
      { category: 'gitvan' }
    );
  }

  /**
   * Add a custom filter
   * @param {string} name - Filter name
   * @param {Function} fn - Filter function
   * @param {Object} [options={}] - Filter options
   * @returns {GitVanTemplateEngine} Returns this for chaining
   */
  addFilter(name, fn, options = {}) {
    if (!this.engine.addFilter) {
      throw new Error('KGN engine does not support addFilter');
    }

    this.engine.addFilter(name, fn);
    this.filterRegistry.set(name, { fn, options });

    return this;
  }

  /**
   * List all registered filters
   * @param {string} [category=null] - Filter by category
   * @returns {Array<[string, Object]>} Filter entries
   */
  listFilters(category = null) {
    const filters = Array.from(this.filterRegistry.entries());
    if (category) {
      return filters.filter(([, { options }]) => options.category === category);
    }
    return filters;
  }

  /**
   * Resolve template path from search paths
   * @param {string} templateName - Template file name
   * @param {string[]} searchPaths - Paths to search
   * @returns {Promise<string>} Resolved absolute path
   */
  async resolvePath(templateName, searchPaths) {
    if (!searchPaths || searchPaths.length === 0) {
      throw new TemplateNotFoundError(templateName, searchPaths);
    }

    for (const searchPath of searchPaths) {
      const fullPath = join(searchPath, templateName);
      try {
        await fs.stat(fullPath);
        return fullPath;
      } catch {
        // Continue to next path
      }
    }

    throw new TemplateNotFoundError(templateName, searchPaths);
  }

  /**
   * Render a template string
   * @param {string} templateStr - Template content
   * @param {Object} [context={}] - Template context
   * @returns {Promise<string>} Rendered content
   */
  async renderString(templateStr, context = {}) {
    try {
      const result = await this.engine.renderString(templateStr, context);
      if (result.success) {
        return result.content;
      }
      throw new TemplateRenderError(result.error || 'Template rendering failed', 'inline', 0);
    } catch (error) {
      if (error instanceof TemplateRenderError) {
        throw error;
      }
      throw new TemplateRenderError(error.message, 'inline', 0);
    }
  }

  /**
   * Render a template file
   * @param {string} templateName - Template file name
   * @param {Object} [context={}] - Template context
   * @returns {Promise<string>} Rendered content
   */
  async renderFile(templateName, context = {}) {
    try {
      const fullPath = await this.resolvePath(templateName, this.options.paths);

      // Check cache
      let source = null;
      if (this.options.enableCache) {
        source = this.sourceCache.get(fullPath);
      }

      // Load from file if not cached
      if (!source) {
        source = await fs.readFile(fullPath, 'utf8');
        if (this.options.enableCache) {
          this.sourceCache.set(fullPath, source);
        }
      }

      return await this.renderString(source, context);
    } catch (error) {
      if (error instanceof TemplateNotFoundError || error instanceof TemplateRenderError) {
        throw error;
      }
      throw new TemplateRenderError(error.message, templateName, 0);
    }
  }

  /**
   * Render multiple templates
   * @param {Array<{name: string, context: Object}>} templates - Template specifications
   * @returns {Promise<Array<string>>} Rendered contents
   */
  async renderMultiple(templates) {
    return Promise.all(
      templates.map(({ name, context }) => this.renderFile(name, context))
    );
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      sourceCache: this.sourceCache.getStats(),
      filterCount: this.filterRegistry.size
    };
  }

  /**
   * Clear cache
   * @param {string} [type='all'] - Cache type to clear (all, source, filter)
   */
  clearCache(type = 'all') {
    if (type === 'all' || type === 'source') {
      this.sourceCache.clear();
    }
  }
}

/**
 * Global template engine instance
 */
let globalEngine = null;

/**
 * Get or create the global template engine
 * @param {Object} [options={}] - Engine options
 * @returns {GitVanTemplateEngine} Template engine instance
 */
export function getTemplateEngine(options = {}) {
  if (!globalEngine) {
    globalEngine = new GitVanTemplateEngine(options);
  }
  return globalEngine;
}

/**
 * Reset the global template engine
 */
export function resetTemplateEngine() {
  globalEngine = null;
}

/**
 * Render a template string directly
 * @param {string} templateStr - Template content
 * @param {Object} [context={}] - Template context
 * @returns {Promise<string>} Rendered content
 */
export async function renderTemplate(templateStr, context = {}) {
  const engine = getTemplateEngine();
  return engine.renderString(templateStr, context);
}

export default GitVanTemplateEngine;
