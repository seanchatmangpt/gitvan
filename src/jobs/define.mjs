/**
 * GitVan v2 Job Definition Helper
 * Provides a helper function for defining jobs with metadata
 */

/**
 * Define a job with metadata and run function
 * @param {object} definition - Job definition object
 * @param {object} definition.meta - Job metadata
 * @param {function} definition.run - Job run function
 * @param {string} definition.cron - Optional cron schedule
 * @param {object} definition.inputs - Optional input schema
 * @returns {object} Job definition object
 */
export function defineJob(definition) {
  const { meta = {}, run, cron, inputs, ...otherProps } = definition;

  if (typeof run !== "function") {
    throw new Error("Job definition must include a run function");
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
    ...otherProps,
  };
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
