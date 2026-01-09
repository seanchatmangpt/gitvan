/**
 * @fileoverview GitVan Template Engine - KGEN-based replacement for Nunjucks
 *
 * This module provides template rendering using the KGEN engine from vendor/unrdf,
 * replacing the nunjucks dependency with a more deterministic and performant solution.
 *
 * @module src/lib/template-engine
 * @version 1.0.0
 * @license Apache-2.0
 */

import { TemplateEngine } from '@unrdf/kgn';

/**
 * GitVan Template Engine - KGEN-based template rendering
 * Provides deterministic template processing with custom filters
 */
export class GitVanTemplateEngine {
  /**
   * Create a new template engine instance
   * @param {Object} [options={}] - Engine configuration
   * @param {boolean} [options.deterministicMode=true] - Enable deterministic rendering
   * @param {boolean} [options.enableCache=true] - Enable template caching
   */
  constructor(options = {}) {
    this.options = {
      deterministicMode: options.deterministicMode !== false,
      enableCache: options.enableCache !== false,
      ...options
    };

    // Initialize KGEN engine
    this.engine = new TemplateEngine(this.options);

    // Setup custom filters for GitVan
    this.setupFilters();
  }

  /**
   * Setup GitVan-specific filters
   */
  setupFilters() {
    // Add case conversion filters
    this.engine.addFilter?.('camelCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      return str.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
    });

    this.engine.addFilter?.('pascalCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      const camel = str.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    });

    this.engine.addFilter?.('kebabCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    });

    this.engine.addFilter?.('snakeCase', (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    });
  }

  /**
   * Add a custom filter
   * @param {string} name - Filter name
   * @param {Function} fn - Filter function
   */
  addFilter(name, fn) {
    if (this.engine.addFilter) {
      this.engine.addFilter(name, fn);
    }
    return this;
  }

  /**
   * Render a template string
   * @param {string} templateStr - Template content
   * @param {Object} [context={}] - Template context
   * @returns {Promise<string>} Rendered content
   */
  async renderString(templateStr, context = {}) {
    const result = await this.engine.renderString(templateStr, context);
    if (result.success) {
      return result.content;
    }
    throw new Error(result.error || 'Template rendering failed');
  }

  /**
   * Clear cache
   */
  clearCache() {
    if (this.engine.clearCache) {
      this.engine.clearCache();
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
