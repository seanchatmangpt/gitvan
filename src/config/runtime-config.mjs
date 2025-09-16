// src/config/runtime-config.mjs
// GitVan v2 — Runtime configuration normalization
// Ensures runtime config is serializable and provides fallback values

import defu from "defu";

/**
 * Normalize runtime configuration for serialization and fallback values
 * @param {Object} config - Configuration object
 * @returns {Object} Normalized runtime configuration
 */
export function normalizeRuntimeConfig(config) {
  const base = {
    app: {},
    gitvan: {
      notesRef: config.receipts?.ref || "refs/notes/gitvan/results",
    },
  };
  const runtimeConfig = defu(config.runtimeConfig || {}, base);

  // Ensure all nested objects exist before processing
  if (!runtimeConfig.app) runtimeConfig.app = {};
  if (!runtimeConfig.gitvan) runtimeConfig.gitvan = {};

  _provideFallbackValues(runtimeConfig);
  _checkSerializable(runtimeConfig);
  return runtimeConfig;
}

/**
 * Provide fallback values for undefined/null values
 * @param {Object} obj - Object to process
 */
function _provideFallbackValues(obj) {
  for (const k in obj) {
    const v = obj[k];
    if (v === undefined || v === null) {
      obj[k] = "";
    } else if (typeof v === "object" && v !== null) {
      _provideFallbackValues(v);
    }
  }
}

/**
 * Check if runtime config values are serializable
 * @param {Object} obj - Object to check
 * @param {string[]} path - Current path for error reporting
 */
function _checkSerializable(obj, path = []) {
  if (_isPrimitive(obj)) return;
  for (const k in obj) {
    const v = obj[k];
    if (v == null || _isPrimitive(v)) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => _checkSerializable(item, [...path, `${k}[${i}]`]));
    } else if (_isPOJO(v)) {
      _checkSerializable(v, [...path, k]);
    } else {
      // warn once per path; keep simple
      console.warn(
        `Runtime config \`${[...path, k].join(".")}\` may not serialize. Use only strings, numbers, booleans, arrays, and plain objects.`,
      );
    }
  }
}

/**
 * Check if value is primitive
 * @param {any} v - Value to check
 * @returns {boolean} True if primitive
 */
function _isPrimitive(v) {
  return (
    typeof v === "string" || typeof v === "number" || typeof v === "boolean"
  );
}

/**
 * Check if value is plain object
 * @param {any} v - Value to check
 * @returns {boolean} True if plain object
 */
function _isPOJO(v) {
  return (
    typeof v === "object" &&
    v &&
    (v.constructor === Object || !v.constructor?.name)
  );
}
