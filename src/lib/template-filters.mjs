/**
 * @fileoverview GitVan Template Filters Library
 *
 * Comprehensive filter implementations for template rendering.
 * All filters are deterministic and support the GitVan template system.
 *
 * Filter Categories:
 * - Case Conversion (4 filters)
 * - String Operations (10+ filters)
 * - Array Operations (6 filters)
 * - Type Conversions (5 filters)
 * - Utility Filters (8 filters)
 * - Inflection Filters (15+ filters via inflection lib)
 *
 * @module src/lib/template-filters
 * @version 1.0.0
 * @license Apache-2.0
 */

import * as inflection from 'inflection';

/**
 * CASE CONVERSION FILTERS
 */

/**
 * Convert string to camelCase
 * @param {string} str - Input string
 * @returns {string} camelCase string
 * @example
 * camelCase('hello-world') => 'helloWorld'
 * camelCase('hello_world') => 'helloWorld'
 */
export function camelCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
}

/**
 * Convert string to PascalCase
 * @param {string} str - Input string
 * @returns {string} PascalCase string
 * @example
 * pascalCase('hello-world') => 'HelloWorld'
 * pascalCase('hello_world') => 'HelloWorld'
 */
export function pascalCase(str) {
  if (!str || typeof str !== 'string') return '';
  const camel = str.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert string to kebab-case
 * @param {string} str - Input string
 * @returns {string} kebab-case string
 * @example
 * kebabCase('HelloWorld') => 'hello-world'
 * kebabCase('hello_world') => 'hello-world'
 */
export function kebabCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case
 * @param {string} str - Input string
 * @returns {string} snake_case string
 * @example
 * snakeCase('HelloWorld') => 'hello_world'
 * snakeCase('hello-world') => 'hello_world'
 */
export function snakeCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * STRING OPERATION FILTERS
 */

/**
 * Convert string to UPPERCASE
 * @param {string} str - Input string
 * @returns {string} Uppercase string
 */
export function upper(str) {
  return String(str).toUpperCase();
}

/**
 * Convert string to lowercase
 * @param {string} str - Input string
 * @returns {string} Lowercase string
 */
export function lower(str) {
  return String(str).toLowerCase();
}

/**
 * Capitalize first letter of string
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  const s = String(str);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Create URL-safe slug from string
 * @param {string} str - Input string
 * @returns {string} URL-safe slug
 * @example
 * slug('Hello World!') => 'hello-world'
 */
export function slug(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Pad string to specified length
 * @param {string} str - Input string
 * @param {number} length - Target length
 * @param {string} char - Padding character
 * @returns {string} Padded string
 */
export function pad(str, length = 2, char = '0') {
  return String(str).padStart(length, char);
}

/**
 * Split string by delimiter
 * @param {string} str - Input string
 * @param {string} delimiter - Delimiter (default: space)
 * @returns {string[]} Array of parts
 */
export function split(str, delimiter = ' ') {
  return String(str).split(delimiter);
}

/**
 * Join array with delimiter
 * @param {Array} arr - Input array
 * @param {string} delimiter - Delimiter (default: ', ')
 * @returns {string} Joined string
 */
export function join(arr, delimiter = ', ') {
  return Array.isArray(arr) ? arr.join(delimiter) : String(arr);
}

/**
 * Get length of string, array, or object
 * @param {*} value - Input value
 * @returns {number} Length
 */
export function length(value) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length;
  return String(value).length;
}

/**
 * Format date string
 * @param {string|Date} date - Date value
 * @param {string} format - Format string (default: 'YYYY-MM-DD')
 * @returns {string} Formatted date
 */
export function date(dateValue, format = 'YYYY-MM-DD') {
  const d = new Date(dateValue === 'now' ? new Date() : dateValue);
  if (isNaN(d.getTime())) return String(dateValue);

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
}

/**
 * ARRAY OPERATION FILTERS
 */

/**
 * Sum array values or attribute
 * @param {Array} arr - Input array
 * @param {string} attribute - Object property to sum (optional)
 * @returns {number} Sum value
 */
export function sum(arr, attribute = null) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((total, item) => {
    const value = attribute ? item[attribute] : item;
    return total + (Number(value) || 0);
  }, 0);
}

/**
 * Get maximum value from array
 * @param {Array} arr - Input array
 * @param {string} attribute - Object property to check (optional)
 * @returns {number|null} Maximum value
 */
export function max(arr, attribute = null) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.reduce((maximum, item) => {
    const value = attribute ? item[attribute] : item;
    const numValue = Number(value);
    return numValue > maximum ? numValue : maximum;
  }, Number.MIN_SAFE_INTEGER);
}

/**
 * Get minimum value from array
 * @param {Array} arr - Input array
 * @param {string} attribute - Object property to check (optional)
 * @returns {number|null} Minimum value
 */
export function min(arr, attribute = null) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.reduce((minimum, item) => {
    const value = attribute ? item[attribute] : item;
    const numValue = Number(value);
    return numValue < minimum ? numValue : minimum;
  }, Number.MAX_SAFE_INTEGER);
}

/**
 * TYPE CONVERSION FILTERS
 */

/**
 * Convert value to integer
 * @param {*} value - Input value
 * @returns {number} Integer value
 */
export function int(value) {
  return parseInt(String(value), 10) || 0;
}

/**
 * Convert value to float
 * @param {*} value - Input value
 * @returns {number} Float value
 */
export function float(value) {
  return parseFloat(String(value)) || 0;
}

/**
 * Convert value to string
 * @param {*} value - Input value
 * @returns {string} String value
 */
export function string(value) {
  return String(value);
}

/**
 * Convert value to boolean
 * @param {*} value - Input value
 * @returns {boolean} Boolean value
 */
export function bool(value) {
  return Boolean(value);
}

/**
 * Serialize value to JSON
 * @param {*} value - Input value
 * @param {number} space - Indentation (default: 0)
 * @returns {string} JSON string
 */
export function json(value, space = 0) {
  return JSON.stringify(value, null, space);
}

/**
 * UTILITY FILTERS
 */

/**
 * Provide default value if original is null/undefined
 * @param {*} value - Input value
 * @param {*} defaultValue - Default value
 * @returns {*} Value or default
 */
export function defaults(value, defaultValue) {
  return value != null ? value : defaultValue;
}

/**
 * Round number to specified precision
 * @param {number} value - Input number
 * @param {number} precision - Decimal places (default: 0)
 * @returns {number} Rounded number
 */
export function round(value, precision = 0) {
  return Number(Number(value).toFixed(precision));
}

/**
 * Get absolute value
 * @param {number} value - Input number
 * @returns {number} Absolute value
 */
export function abs(value) {
  return Math.abs(Number(value));
}

/**
 * DETERMINISM GUARD FILTERS
 */

/**
 * Guard filter: now() is not allowed
 * Throws error to enforce determinism
 * @throws {Error} Always throws
 */
export function now() {
  throw new Error("Templates must not call now(); inject a value from context");
}

/**
 * Guard filter: random() is not allowed
 * Throws error to enforce determinism
 * @throws {Error} Always throws
 */
export function random() {
  throw new Error("Templates must not use random(); inject values from context");
}

/**
 * INFLECTION FILTERS
 * (Delegate to inflection library)
 */

/**
 * Pluralize word
 * @param {string} word - Input word
 * @param {string} plural - Irregular plural form (optional)
 * @returns {string} Pluralized word
 */
export function pluralize(word, plural) {
  return inflection.pluralize(String(word), plural);
}

/**
 * Singularize word
 * @param {string} word - Input word
 * @param {string} singular - Irregular singular form (optional)
 * @returns {string} Singularized word
 */
export function singularize(word, singular) {
  return inflection.singularize(String(word), singular);
}

/**
 * Inflect word based on count
 * @param {string} word - Input word
 * @param {number} count - Count value
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form
 * @returns {string} Inflected word
 */
export function inflect(word, count, singular, plural) {
  return inflection.inflect(String(word), Number(count), singular, plural);
}

/**
 * Camelize word (similar to pascalCase)
 * @param {string} word - Input word
 * @param {boolean} lowFirst - Start with lowercase (default: false)
 * @returns {string} Camelized word
 */
export function camelize(word, lowFirst = false) {
  return inflection.camelize(String(word), !!lowFirst);
}

/**
 * Underscore word
 * @param {string} word - Input word
 * @param {boolean} allUpper - Uppercase (default: false)
 * @returns {string} Underscored word
 */
export function underscore(word, allUpper = false) {
  return inflection.underscore(String(word), !!allUpper);
}

/**
 * Humanize word
 * @param {string} word - Input word
 * @param {boolean} lowFirst - Start with lowercase (default: false)
 * @returns {string} Humanized word
 */
export function humanize(word, lowFirst = false) {
  return inflection.humanize(String(word), !!lowFirst);
}

/**
 * Dasherize word
 * @param {string} word - Input word
 * @returns {string} Dasherized word
 */
export function dasherize(word) {
  return inflection.dasherize(String(word));
}

/**
 * Titleize word
 * @param {string} word - Input word
 * @returns {string} Titleized word
 */
export function titleize(word) {
  return inflection.titleize(String(word));
}

/**
 * Demodulize word
 * @param {string} word - Input word
 * @returns {string} Demodulized word
 */
export function demodulize(word) {
  return inflection.demodulize(String(word));
}

/**
 * Tableize word
 * @param {string} word - Input word
 * @returns {string} Tableized word
 */
export function tableize(word) {
  return inflection.tableize(String(word));
}

/**
 * Classify word
 * @param {string} word - Input word
 * @returns {string} Classified word
 */
export function classify(word) {
  return inflection.classify(String(word));
}

/**
 * Create foreign key from word
 * @param {string} word - Input word
 * @param {boolean} dropIdUBar - Drop underscore from _id (default: false)
 * @returns {string} Foreign key
 */
export function foreign_key(word, dropIdUBar = false) {
  return inflection.foreign_key(String(word), !!dropIdUBar);
}

/**
 * Ordinalize word
 * @param {string} word - Input word
 * @returns {string} Ordinalized word
 */
export function ordinalize(word) {
  return inflection.ordinalize(String(word));
}

/**
 * Transform word with array of operations
 * @param {string} word - Input word
 * @param {Array} operations - Array of operations
 * @returns {string} Transformed word
 */
export function transform(word, operations = []) {
  return inflection.transform(String(word), Array.isArray(operations) ? operations : [operations]);
}

/**
 * GITVAN-SPECIFIC FILTERS
 */

/**
 * Get Git branch from context
 * @param {Object} context - GitVan context
 * @returns {string} Branch name
 */
export function gitBranch(context) {
  return context?.git?.branch || 'main';
}

/**
 * Create Git tag from version
 * @param {string} version - Version string
 * @returns {string} Git tag
 */
export function gitTag(version) {
  return `v${version}`;
}

/**
 * Get workflow ID from context
 * @param {Object} context - GitVan context
 * @returns {string} Workflow ID
 */
export function workflowId(context) {
  return context?.workflow?.id || 'unknown';
}

/**
 * Format pack version
 * @param {Object} pack - Pack object
 * @returns {string} Pack version string (name@version)
 */
export function packVersion(pack) {
  return `${pack?.name || 'unknown'}@${pack?.version || '0.0.0'}`;
}

/**
 * FILTER REGISTRY
 */

/**
 * Get all available filters organized by category
 * @returns {Object} Filters by category
 */
export function getAllFilters() {
  return {
    caseConversion: {
      camelCase,
      pascalCase,
      kebabCase,
      snakeCase
    },
    string: {
      upper,
      lower,
      capitalize,
      slug,
      pad,
      split,
      join,
      length,
      date
    },
    array: {
      sum,
      max,
      min
    },
    type: {
      int,
      float,
      string,
      bool,
      json
    },
    utility: {
      default: defaults,
      round,
      abs
    },
    safety: {
      now,
      random
    },
    inflection: {
      pluralize,
      singularize,
      inflect,
      camelize,
      underscore,
      humanize,
      dasherize,
      titleize,
      demodulize,
      tableize,
      classify,
      foreign_key,
      ordinalize,
      transform
    },
    gitvan: {
      gitBranch,
      gitTag,
      workflowId,
      packVersion
    }
  };
}

/**
 * Create flat filter map for easy registration
 * @returns {Object} Flat filter map with all filters
 */
export function createFilterMap() {
  const filters = getAllFilters();
  const result = {};

  for (const category of Object.values(filters)) {
    Object.assign(result, category);
  }

  return result;
}

export default {
  // Case conversion
  camelCase,
  pascalCase,
  kebabCase,
  snakeCase,

  // String operations
  upper,
  lower,
  capitalize,
  slug,
  pad,
  split,
  join,
  length,
  date,

  // Array operations
  sum,
  max,
  min,

  // Type conversions
  int,
  float,
  string,
  bool,
  json,

  // Utilities
  default: defaults,
  round,
  abs,

  // Safety
  now,
  random,

  // Inflection
  pluralize,
  singularize,
  inflect,
  camelize,
  underscore,
  humanize,
  dasherize,
  titleize,
  demodulize,
  tableize,
  classify,
  foreign_key,
  ordinalize,
  transform,

  // GitVan-specific
  gitBranch,
  gitTag,
  workflowId,
  packVersion,

  // Utilities
  getAllFilters,
  createFilterMap
};
