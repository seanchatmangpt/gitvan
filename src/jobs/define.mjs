// src/jobs/define.mjs
// GitVan v2 — Job Definition System
// Validates and freezes job definitions with comprehensive type checking

import { klona } from "klona/full";
import { relative, basename, extname, join } from "pathe";

/**
 * Job definition schema validation
 */
const JOB_SCHEMA = {
  id: { type: "string", required: false },
  kind: {
    type: "string",
    enum: ["atomic", "batch", "daemon"],
    required: false,
  },
  cron: { type: "string", required: false },
  meta: { type: "object", required: false },
  on: { type: "object", required: false },
  run: { type: "function", required: true },
};

/**
 * Event predicate schema validation
 */
const EVENT_PREDICATE_SCHEMA = {
  any: { type: "array", required: false },
  all: { type: "array", required: false },
  tagCreate: { type: "string", required: false },
  semverTag: { type: "boolean", required: false },
  mergeTo: { type: "string", required: false },
  pushTo: { type: "string", required: false },
  pathChanged: { type: "array", required: false },
  pathAdded: { type: "array", required: false },
  pathModified: { type: "array", required: false },
  message: { type: "string", required: false },
  authorEmail: { type: "string", required: false },
  signed: { type: "boolean", required: false },
};

/**
 * Validate a value against a schema
 */
function validateSchema(value, schema, path = "") {
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const val = value[key];
    const currentPath = path ? `${path}.${key}` : key;

    if (rules.required && (val === undefined || val === null)) {
      errors.push(`${currentPath} is required`);
      continue;
    }

    if (val !== undefined && val !== null) {
      if (rules.type && rules.type !== "array" && typeof val !== rules.type) {
        errors.push(`${currentPath} must be ${rules.type}, got ${typeof val}`);
      }

      if (rules.enum && !rules.enum.includes(val)) {
        errors.push(
          `${currentPath} must be one of ${rules.enum.join(", ")}, got ${val}`,
        );
      }

      if (rules.type === "array" && !Array.isArray(val)) {
        errors.push(`${currentPath} must be an array`);
      }

      if (
        rules.type === "object" &&
        (typeof val !== "object" || Array.isArray(val))
      ) {
        errors.push(`${currentPath} must be an object`);
      }

      if (rules.type === "function" && typeof val !== "function") {
        errors.push(`${currentPath} must be a function`);
      }
    }
  }

  return errors;
}

/**
 * Validate event predicates recursively
 */
function validateEventPredicate(predicate, path = "on") {
  const errors = [];

  if (typeof predicate !== "object" || predicate === null) {
    errors.push(`${path} must be an object`);
    return errors;
  }

  // Check for unknown keys
  const allowedKeys = Object.keys(EVENT_PREDICATE_SCHEMA);
  const predicateKeys = Object.keys(predicate);
  const unknownKeys = predicateKeys.filter((key) => !allowedKeys.includes(key));

  if (unknownKeys.length > 0) {
    errors.push(`${path} contains unknown keys: ${unknownKeys.join(", ")}`);
  }

  // Validate top-level predicates
  const topLevelErrors = validateSchema(
    predicate,
    EVENT_PREDICATE_SCHEMA,
    path,
  );
  errors.push(...topLevelErrors);

  // Validate nested any/all arrays
  if (predicate.any && Array.isArray(predicate.any)) {
    predicate.any.forEach((item, index) => {
      const nestedErrors = validateEventPredicate(
        item,
        `${path}.any[${index}]`,
      );
      errors.push(...nestedErrors);
    });
  }

  if (predicate.all && Array.isArray(predicate.all)) {
    predicate.all.forEach((item, index) => {
      const nestedErrors = validateEventPredicate(
        item,
        `${path}.all[${index}]`,
      );
      errors.push(...nestedErrors);
    });
  }

  return errors;
}

/**
 * Infer job mode from filename
 */
function inferModeFromFilename(filename) {
  if (filename.endsWith(".cron.mjs")) return "cron";
  if (filename.endsWith(".evt.mjs")) return "event";
  return "on-demand";
}

/**
 * Infer job ID from file path
 */
function inferIdFromPath(filePath, jobsDir = "jobs") {
  // Handle both absolute and relative paths
  const cwd = process.cwd();
  const jobsDirPath = join(cwd, jobsDir);

  // If filePath is relative to jobsDir, use it directly
  if (filePath.includes(jobsDir)) {
    const relativePath = filePath.split(jobsDir + "/")[1];
    if (relativePath) {
      const withoutExt = relativePath.replace(/\.(mjs|js|ts)$/, "");
      const withoutMode = withoutExt.replace(/\.(cron|evt)$/, "");
      return withoutMode.replace(/\//g, ":");
    }
  }

  // Fallback: use filename only
  const filename = basename(filePath, extname(filePath));
  const withoutMode = filename.replace(/\.(cron|evt)$/, "");
  return withoutMode;
}

/**
 * Define and validate a job
 * @param {Object} definition - Job definition object
 * @param {Object} options - Additional options
 * @returns {Object} Validated and frozen job definition
 */
export function defineJob(definition, options = {}) {
  const errors = [];

  // Validate main job schema
  const schemaErrors = validateSchema(definition, JOB_SCHEMA);
  errors.push(...schemaErrors);

  // Validate event predicates if present
  if (definition.on) {
    const eventErrors = validateEventPredicate(definition.on);
    errors.push(...eventErrors);
  }

  // Validate cron expression if present
  if (definition.cron) {
    // Basic cron validation (5 or 6 fields)
    const cronParts = definition.cron.trim().split(/\s+/);
    if (cronParts.length < 5 || cronParts.length > 6) {
      errors.push("cron must have 5 or 6 space-separated fields");
    }
  }

  // Validate meta object structure (allow additional keys for flexibility)
  if (definition.meta && typeof definition.meta !== "object") {
    errors.push("meta must be an object");
  }

  if (errors.length > 0) {
    throw new Error(`Job definition validation failed:\n${errors.join("\n")}`);
  }

  // Create validated job definition
  const jobDef = {
    id: definition.id || options.inferredId,
    kind: definition.kind || "atomic",
    cron: definition.cron,
    meta: definition.meta || {},
    on: definition.on,
    run: definition.run,
    mode: options.mode || inferModeFromFilename(options.filename || ""),
    filename: options.filename,
    filePath: options.filePath,
    version: options.version || "1.0.0",
  };

  // Freeze the definition to prevent modification
  return Object.freeze(klona(jobDef));
}

/**
 * Create a job definition with inferred properties
 * @param {Object} definition - Job definition
 * @param {string} filePath - Full file path
 * @param {string} jobsDir - Jobs directory (default: "jobs")
 * @returns {Object} Complete job definition
 */
export function createJobDefinition(definition, filePath, jobsDir = "jobs") {
  const filename = filePath.split("/").pop();
  const inferredId = inferIdFromPath(filePath, jobsDir);
  const mode = inferModeFromFilename(filename);

  return defineJob(definition, {
    inferredId,
    filename,
    filePath,
    mode,
  });
}

/**
 * Validate job execution context
 * @param {Object} ctx - Execution context
 * @returns {Object} Validated context
 */
export function validateJobContext(ctx) {
  const required = ["id", "root", "nowISO", "env", "git", "logger"];
  const missing = required.filter((key) => !(key in ctx));

  if (missing.length > 0) {
    throw new Error(
      `Job context missing required fields: ${missing.join(", ")}`,
    );
  }

  if (typeof ctx.git !== "object" || !ctx.git.head || !ctx.git.branch) {
    throw new Error(
      "Job context git object must have head and branch properties",
    );
  }

  if (typeof ctx.logger !== "object" || typeof ctx.logger.log !== "function") {
    throw new Error("Job context logger must have log method");
  }

  return ctx;
}

/**
 * Create job execution context
 * @param {Object} jobDef - Job definition
 * @param {Object} options - Context options
 * @returns {Object} Execution context
 */
export function createJobContext(jobDef, options = {}) {
  const ctx = {
    id: jobDef.id,
    root: options.root || process.cwd(),
    nowISO: options.nowISO || new Date().toISOString(),
    env: options.env || process.env,
    git: options.git || {},
    trigger: options.trigger,
    logger: options.logger || console,
    payload: options.payload || {},
  };

  return validateJobContext(ctx);
}
