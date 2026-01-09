/**
 * GitVan v2 Job Definition Helper
 * Provides a helper function for defining jobs with metadata
 */

/**
 * Valid event predicates for job triggers
 */
const VALID_EVENT_PREDICATES = [
  "commit",
  "push",
  "merge",
  "tagCreate",
  "tagDelete",
  "branchCreate",
  "branchDelete",
  "pullRequest",
];

/**
 * Define a job with metadata and run function
 * @param {object} definition - Job definition object
 * @param {object} definition.meta - Job metadata
 * @param {function} definition.run - Job run function
 * @param {string} definition.cron - Optional cron schedule
 * @param {object} definition.inputs - Optional input schema
 * @param {object} definition.on - Optional event predicates
 * @returns {object} Job definition object
 */
export function defineJob(definition) {
  const { meta = {}, run, cron, inputs, on, ...otherProps } = definition;

  // Validate run function
  if (typeof run !== "function") {
    throw new Error("Job definition validation failed: run function is required");
  }

  // Validate event predicates if provided
  if (on && typeof on === "object") {
    for (const predicate of Object.keys(on)) {
      if (!VALID_EVENT_PREDICATES.includes(predicate)) {
        throw new Error(
          `Job definition validation failed: invalid event predicate '${predicate}'. Valid predicates: ${VALID_EVENT_PREDICATES.join(", ")}`
        );
      }
    }
  }

  return {
    meta: {
      desc: "GitVan job",
      tags: [],
      ...meta,
    },
    run,
    cron,
    inputs,
    on,
    ...otherProps,
  };
}

/**
 * Create job definition from file path and definition object
 * @param {object} definition - Job definition object
 * @param {string} filePath - File path for the job
 * @returns {object} Complete job definition with inferred properties
 */
export function createJobDefinition(definition, filePath) {
  // Extract job ID from file path
  // e.g., "jobs/db/migrate.mjs" -> "db:migrate"
  // e.g., "jobs/cleanup.cron.mjs" -> "cleanup"
  const pathParts = filePath.split("/");
  const fileName = pathParts[pathParts.length - 1];
  const fileNameWithoutExt = fileName.replace(/\.(mjs|js)$/, "");

  // Check for special suffixes
  const isCron = fileNameWithoutExt.includes(".cron");
  const isEvent = fileNameWithoutExt.includes(".evt");

  // Remove suffixes
  const baseName = fileNameWithoutExt
    .replace(/\.cron$/, "")
    .replace(/\.evt$/, "");

  // Build job ID from path components
  const jobPathComponents = [];
  for (let i = 0; i < pathParts.length - 1; i++) {
    if (pathParts[i] !== "jobs" && pathParts[i] !== ".") {
      jobPathComponents.push(pathParts[i]);
    }
  }
  jobPathComponents.push(baseName);

  const jobId = jobPathComponents.join(":");

  // Infer mode
  let mode = "on-demand";
  if (isCron || definition.cron) {
    mode = "cron";
  } else if (isEvent || definition.on) {
    mode = "event";
  }

  // Build complete definition
  return defineJob({
    id: jobId,
    mode,
    filename: fileName,
    kind: "atomic",
    ...definition,
  });
}

/**
 * Define a cron job
 * @param {string} cron - Cron expression
 * @param {object} definition - Job definition
 * @returns {object} Job definition with cron schedule
 */
export function defineCronJob(cron, definition) {
  return defineJob({
    ...definition,
    cron,
  });
}

/**
 * Define an event job
 * @param {object} predicate - Event predicate
 * @param {object} definition - Job definition
 * @returns {object} Job definition with event predicate
 */
export function defineEventJob(predicate, definition) {
  return defineJob({
    ...definition,
    event: predicate,
  });
}
