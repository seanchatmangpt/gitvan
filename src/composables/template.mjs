// src/composables/template.mjs
// GitVan v2 — useTemplate() with inflection filters and config discovery

import { promises as fs } from "node:fs";
import {
  join,
  dirname,
  resolve as presolve,
  isAbsolute,
  relative,
} from "pathe";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { loadOptions } from "../config/loader.mjs";
import { getCachedEnvironment } from "../utils/nunjucks-config.mjs";
import { parseFrontmatter } from "../utils/frontmatter.mjs";
import { injectString } from "../utils/inject.mjs";
import { runShellHooks } from "../utils/shell.mjs";
import { writeReceipt } from "../runtime/receipt.mjs";
import {
  acquireLock,
  releaseLock,
  generateLockRef,
} from "../runtime/locks.mjs";
import { FrontmatterSchema } from "../schemas/frontmatter.zod.mjs";
import { sha256Hex } from "../utils/crypto.mjs";

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
 * Helper to render any string values inside an object with Nunjucks
 * @param {Object} env - Nunjucks environment
 * @param {Object} obj - Object to render
 * @param {Object} context - Template context
 * @returns {Object} Rendered object
 */
function renderObjectValues(env, obj, context) {
  if (!obj) return obj;
  const walk = (v) => {
    if (typeof v === "string") return env.renderString(v, context);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, vv]) => [k, walk(vv)])
      );
    }
    return v;
  };
  return walk(obj);
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

    /**
     * Creates a verifiable, dry-run plan of all intended operations.
     * Supports Hygen-style front-matter with to, inject, copy, sh, when, force directives.
     * @param {string} templatePath - Path to template file
     * @param {Object} data - Template data
     * @returns {Promise<Object>} Plan object with operations and hooks
     */
    async plan(templatePath, data = {}) {
      const srcPath =
        binding.paths
          .map((p) => join(p, templatePath))
          .find((p) => fs.stat(p).catch(() => false)) ||
        presolve(binding.root, templatePath);
      const raw = await fs.readFile(srcPath, "utf8");
      const { data: rawFmData, body } = parseFrontmatter(raw);

      // Validate and merge frontmatter
      const fmData = FrontmatterSchema.parse(rawFmData);
      const mergedContext = { ...baseData(), ...fmData.data, ...data };
      const fm = renderObjectValues(env, fmData, mergedContext);

      // Evaluate 'when' predicate
      if (fm.when === false || fm.when === "false") {
        return {
          template: templatePath,
          skipped: true,
          reason: "when=false",
          operations: [],
          hooks: {},
        };
      }

      const operations = [];
      const renderedBody = env.renderString(body, mergedContext);

      // Multi-Output: 'to' array and 'perFile'
      const targets = [].concat(fm.to || []);
      for (const to of targets) {
        operations.push({
          type: "write",
          to,
          content: renderedBody,
          hash: sha256Hex(renderedBody),
          force: fm.force,
        });
      }

      for (const file of [].concat(fm.perFile || [])) {
        const perFileContext = { ...mergedContext, ...file.data };
        const perFileBody = env.renderString(body, perFileContext);
        operations.push({
          type: "write",
          to: file.to,
          content: perFileBody,
          hash: sha256Hex(perFileBody),
          force: fm.force,
        });
      }

      // Injections
      for (const inj of [].concat(fm.inject || [])) {
        const snippet = env.renderString(inj.snippet || "", mergedContext);
        operations.push({
          type: "inject",
          into: inj.into,
          snippet,
          hash: sha256Hex(snippet),
          ...inj,
        });
      }

      // Copies
      for (const c of [].concat(fm.copy || [])) {
        operations.push({
          type: "copy",
          from: presolve(binding.root, c.from),
          to: presolve(binding.root, c.to),
        });
      }

      return {
        template: templatePath,
        skipped: false,
        operations,
        hooks: { before: fm.sh?.before || [], after: fm.sh?.after || [] },
      };
    },

    /**
     * Executes a plan and writes receipts.
     * @param {Object} plan - Plan object from plan() method
     * @param {Object} options - Apply options
     * @param {boolean} options.dryRun - If true, only simulate operations
     * @returns {Promise<Object>} Receipt with operation results
     */
    async apply(plan, { dryRun = false } = {}) {
      if (plan.skipped) {
        return { status: "SKIPPED", reason: plan.reason, results: [] };
      }

      const results = [];
      const locks = new Set();
      const head = (await binding.ctx?.head?.()) || "HEAD";

      try {
        // Acquire all necessary locks first
        for (const op of plan.operations) {
          const lockPath = generateLockRef("template", op.to || op.into);
          if (!(await acquireLock(lockPath, head))) {
            throw new Error(`Failed to acquire lock for: ${op.to || op.into}`);
          }
          locks.add(lockPath);
        }

        // Run 'before' hooks
        const beforeResults = await runShellHooks(plan.hooks.before, {
          config: await loadOptions({ rootDir: binding.root }),
          context: binding,
        });
        results.push(...beforeResults.map((r) => ({ op: "sh.before", ...r })));

        // Perform file operations
        for (const op of plan.operations) {
          if (dryRun) {
            results.push({ ...op, status: "DRY_RUN" });
            continue;
          }

          const targetPath = presolve(binding.root, op.to || op.into);

          // Path Sandboxing: Ensure target is within the root directory
          if (!targetPath.startsWith(binding.root)) {
            throw new Error(`Path escape violation: ${targetPath}`);
          }

          if (op.type === "write") {
            const exists = await fs
              .stat(targetPath)
              .then(() => true)
              .catch(() => false);
            if (exists && op.force === "error") {
              throw new Error(
                `File exists and force policy is 'error': ${relative(
                  binding.root,
                  targetPath
                )}`
              );
            }
            if (exists && op.force === "skip") {
              results.push({ ...op, status: "SKIPPED", reason: "File exists" });
              continue;
            }

            await ensureDir(targetPath);
            const writeMode =
              exists && op.force === "append" ? fs.appendFile : fs.writeFile;
            await writeMode(targetPath, op.content, "utf8");
            results.push({ ...op, status: "OK" });
          } else if (op.type === "inject") {
            const currentContent = await fs
              .readFile(targetPath, "utf8")
              .catch(() => "");
            const { changed, content: newContent } = injectString(
              currentContent,
              op
            );
            if (changed) {
              await fs.writeFile(targetPath, newContent, "utf8");
            }
            results.push({ ...op, status: "OK", changed });
          } else if (op.type === "copy") {
            await ensureDir(op.to);
            await fs.copyFile(op.from, op.to);
            results.push({ ...op, status: "OK" });
          }
        }

        // Run 'after' hooks
        const afterResults = await runShellHooks(plan.hooks.after, {
          config: await loadOptions({ rootDir: binding.root }),
          context: binding,
        });
        results.push(...afterResults.map((r) => ({ op: "sh.after", ...r })));

        // Write a comprehensive receipt
        const receiptPayload = {
          kind: "template-receipt",
          id: plan.template,
          status: results.some((r) => r.status === "ERROR") ? "ERROR" : "OK",
          dryRun,
          operations: results,
        };

        if (!dryRun) {
          await writeReceipt(receiptPayload, {
            ref: "refs/notes/gitvan/results",
          });
        }

        return receiptPayload;
      } catch (error) {
        const receipt = {
          kind: "template-receipt",
          id: plan.template,
          status: "ERROR",
          error: error.message,
          dryRun,
          operations: results,
        };
        if (!dryRun) {
          await writeReceipt(receipt, { ref: "refs/notes/gitvan/results" });
        }
        throw error; // Re-throw after writing receipt
      } finally {
        // Ensure all locks are released
        for (const lock of locks) {
          await releaseLock(lock);
        }
      }
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
