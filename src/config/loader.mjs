// src/config/loader.mjs
// GitVan v2 — Configuration loader with c12 integration
// Nitro-style sugar and template string resolution

import { loadConfig, watchConfig } from "c12";
import { klona } from "klona/full";
import defu from "defu";
import { GitVanDefaults } from "./defaults.mjs";
import { normalizeRuntimeConfig } from "./runtime-config.mjs";

// Nitro-style sugar: defineGitVanConfig(() => ({ ... }))
globalThis.defineGitVanConfig = globalThis.defineGitVanConfig || ((c) => c);

/**
 * Load GitVan configuration with overrides and options
 * @param {Object} overrides - Configuration overrides
 * @param {Object} opts - Loader options
 * @param {boolean} opts.watch - Enable config watching
 * @returns {Promise<Object>} Loaded configuration
 */
export async function loadOptions(overrides = {}, opts = {}) {
  const loaded = await _loadUserConfig(overrides, opts);
  const options = klona(loaded.config);

  // Normalize runtime config from top-level keys
  options.runtimeConfig = normalizeRuntimeConfig(options);

  // Resolve derived paths
  _materializeTemplateStrings(options);

  return options;
}

/**
 * Load user configuration using c12
 * @param {Object} overrides - Configuration overrides
 * @param {Object} opts - Loader options
 * @returns {Promise<Object>} Loaded configuration
 */
async function _loadUserConfig(overrides = {}, opts = {}) {
  const name = "gitvan";
  const cwd = overrides.rootDir || process.cwd();

  const defaults = klona(GitVanDefaults);

  const cfg = await (opts.watch ? watchConfig : loadConfig)({
    name,
    cwd,
    defaults,
    jitiOptions: { interopDefault: true },
    extend: { extendKey: ["extends"] },
    async overrides() {
      // Merge simple, keep minimal resolvers
      // Handle arrays by replacing instead of merging
      const merged = defu(overrides, {});

      // Fix array merging for specific keys
      if (overrides.templates?.dirs) {
        merged.templates = merged.templates || {};
        merged.templates.dirs = overrides.templates.dirs;
      }

      return merged;
    },
  });

  return cfg;
}

/**
 * Simple {{ rootDir }} templating like Nitro uses for defaults
 * @param {Object} options - Configuration options
 */
function _materializeTemplateStrings(options) {
  const map = {
    "{{ rootDir }}/.out": `${options.rootDir}/.out`,
    "{{ rootDir }}/dist": `${options.rootDir}/dist`,
  };
  const out = options.output || {};
  out.dir = _subst(out.dir, map, options.rootDir);
  out.distDir = _subst(out.distDir, map, options.rootDir);
  options.output = out;
}

/**
 * Substitute template strings with actual values
 * @param {string} val - Value to substitute
 * @param {Object} map - Substitution map
 * @param {string} root - Root directory
 * @returns {string} Substituted value
 */
function _subst(val, map, root) {
  if (typeof val !== "string") return val;
  return val
    .replace("{{ rootDir }}/.out", map["{{ rootDir }}/.out"])
    .replace("{{ rootDir }}/dist", map["{{ rootDir }}/dist"])
    .replace("{{ rootDir }}", root);
}
