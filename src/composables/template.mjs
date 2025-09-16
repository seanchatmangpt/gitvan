// src/composables/template.mjs
// GitVan v2 — useTemplate() with inflection filters and config discovery

import { promises as fs } from "node:fs";
import { join, dirname, resolve as presolve, isAbsolute } from "pathe";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { loadOptions } from "../config/loader.mjs";
import { getCachedEnvironment } from "../utils/nunjucks-config.mjs";

/**
 * Bind context and resolve template configuration
 * Integrates with new config system for robust template path resolution
 */
async function bindContext(opts = {}) {
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  const root = (ctx && ctx.cwd) || process.cwd();

  // Load configuration using new config system
  const config = await loadOptions({ rootDir: root });

  // Resolve template paths
  let templatePaths = [];
  if (Array.isArray(opts.paths) && opts.paths.length) {
    templatePaths = opts.paths;
  } else {
    // Use config templates directories
    templatePaths = config.templates.dirs.map((dir) => presolve(root, dir));
  }

  // Configuration options with precedence: opts > config > defaults
  const autoescape =
    typeof opts.autoescape === "boolean"
      ? opts.autoescape
      : config.templates.autoescape;

  const noCache =
    typeof opts.noCache === "boolean" ? opts.noCache : config.templates.noCache;

  const nowISO =
    typeof ctx?.now === "function"
      ? ctx.now()
      : typeof config.now === "function"
        ? config.now()
        : process.env.GITVAN_NOW || null;

  return { root, paths: templatePaths, autoescape, noCache, nowISO, ctx };
}

/**
 * Ensure directory exists for file output
 */
async function ensureDir(filePath) {
  await fs.mkdir(dirname(filePath), { recursive: true });
}

/**
 * GitVan Template Engine
 *
 * Provides template rendering with inflection filters, config discovery,
 * and deterministic environment for reproducible builds.
 *
 * @param {Object} opts - Template options
 * @param {string[]} opts.paths - Custom template paths (overrides config discovery)
 * @param {boolean} opts.autoescape - Enable HTML auto-escaping
 * @param {boolean} opts.noCache - Disable template caching
 * @returns {Object} Template engine instance
 */
export async function useTemplate(opts = {}) {
  const binding = await bindContext(opts);
  const env = getCachedEnvironment({
    paths: binding.paths,
    autoescape: binding.autoescape,
    noCache: binding.noCache,
  });

  /**
   * Prepare base data for template rendering
   * Includes context data and deterministic timestamps
   */
  function baseData(extra) {
    const common = {};
    if (binding.nowISO) common.nowISO = binding.nowISO;
    if (binding.ctx) common.git = binding.ctx;
    return { ...common, ...(extra || {}) };
  }

  return {
    /**
     * Render template from file
     * @param {string} templateName - Template file name
     * @param {Object} data - Template data
     * @returns {string} Rendered content
     */
    render(templateName, data = {}) {
      return env.render(String(templateName), baseData(data));
    },

    /**
     * Render template from string
     * @param {string} templateStr - Template string
     * @param {Object} data - Template data
     * @returns {string} Rendered content
     */
    renderString(templateStr, data = {}) {
      return env.renderString(String(templateStr), baseData(data));
    },

    /**
     * Render template to file
     * @param {string} templateName - Template file name
     * @param {string} outPath - Output file path
     * @param {Object} data - Template data
     * @returns {Object} { path: string, bytes: number }
     */
    async renderToFile(templateName, outPath, data = {}) {
      const abs = isAbsolute(outPath) ? outPath : join(binding.root, outPath);
      await ensureDir(abs);
      const text = env.render(String(templateName), baseData(data));
      const buf = Buffer.from(text, "utf8");
      await fs.writeFile(abs, buf);
      return { path: outPath, bytes: buf.length };
    },

    /**
     * Get the underlying Nunjucks environment
     * @returns {nunjucks.Environment}
     */
    get env() {
      return env;
    },

    /**
     * Get template paths being used
     * @returns {string[]}
     */
    get paths() {
      return binding.paths;
    },

    /**
     * Get root directory
     * @returns {string}
     */
    get root() {
      return binding.root;
    },
  };
}

/**
 * Synchronous version for backward compatibility
 * Note: This version cannot use config discovery and relies on context only
 */
export function useTemplateSync(opts = {}) {
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  const root = (ctx && ctx.cwd) || process.cwd();

  // Use default template configuration for sync version
  const templatePaths =
    Array.isArray(opts.paths) && opts.paths.length ? opts.paths : ["templates"];

  const paths = templatePaths.map((p) => presolve(root, p));

  const autoescape =
    typeof opts.autoescape === "boolean" ? opts.autoescape : false;

  const noCache = typeof opts.noCache === "boolean" ? opts.noCache : true;

  const nowISO =
    typeof ctx?.now === "function" ? ctx.now() : process.env.GITVAN_NOW || null;

  const binding = { root, paths, autoescape, noCache, nowISO, ctx };
  const env = getCachedEnvironment({
    paths: binding.paths,
    autoescape: binding.autoescape,
    noCache: binding.noCache,
  });

  function baseData(extra) {
    const common = {};
    if (binding.nowISO) common.nowISO = binding.nowISO;
    if (binding.ctx) common.git = binding.ctx;
    return { ...common, ...(extra || {}) };
  }

  return {
    render(templateName, data = {}) {
      return env.render(String(templateName), baseData(data));
    },
    renderString(templateStr, data = {}) {
      return env.renderString(String(templateStr), baseData(data));
    },
    async renderToFile(templateName, outPath, data = {}) {
      const abs = isAbsolute(outPath) ? outPath : join(binding.root, outPath);
      await ensureDir(abs);
      const text = env.render(String(templateName), baseData(data));
      const buf = Buffer.from(text, "utf8");
      await fs.writeFile(abs, buf);
      return { path: outPath, bytes: buf.length };
    },
    get env() {
      return env;
    },
    get paths() {
      return binding.paths;
    },
    get root() {
      return binding.root;
    },
  };
}
