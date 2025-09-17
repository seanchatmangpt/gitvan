/**
 * GitVan v2 Event CLI - Event simulation and testing commands
 * Provides commands for simulating events and testing event predicates
 */

import { scanJobs } from "../jobs/scan.mjs";
import { matches } from "../router/events.mjs";
import { loadOptions } from "../config/loader.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("event-cli");

/**
 * Event CLI command handler
 * @param {string} subcommand - Subcommand (simulate, test, list)
 * @param {object} args - Command arguments
 * @returns {Promise<void>}
 */
export async function eventCommand(subcommand = "list", args = {}) {
  const config = await loadOptions();

  switch (subcommand) {
    case "simulate":
      return await simulateEvent(config, args);

    case "test":
      return await testPredicate(config, args);

    case "list":
      return await listEventJobs(config);

    case "trigger":
      return await triggerEvent(config, args);

    default:
      throw new Error(`Unknown event subcommand: ${subcommand}`);
  }
}

/**
 * Simulate an event and show which jobs would trigger
 * @param {object} config - GitVan config
 * @param {object} args - Simulation arguments
 * @returns {Promise<void>}
 */
async function simulateEvent(config, args) {
  try {
    const jobs = await scanJobs({ cwd: config.rootDir });
    const eventJobs = jobs.filter((job) => job.on);

    if (eventJobs.length === 0) {
      console.log("No event jobs found");
      return;
    }

    // Parse event metadata from args
    const meta = parseEventMeta(args);

    console.log(`Simulating event:`);
    console.log(JSON.stringify(meta, null, 2));
    console.log();

    const matchingJobs = [];

    for (const job of eventJobs) {
      if (matches(job.on, meta)) {
        matchingJobs.push(job);
      }
    }

    if (matchingJobs.length === 0) {
      console.log("No jobs would trigger for this event");
      return;
    }

    console.log(`Jobs that would trigger (${matchingJobs.length}):`);
    for (const job of matchingJobs) {
      console.log(`  - ${job.id || job.filename}`);
      console.log(`    Predicate: ${JSON.stringify(job.on, null, 2)}`);
    }
  } catch (error) {
    logger.error("Failed to simulate event:", error.message);
    throw error;
  }
}

/**
 * Test a specific predicate against event metadata
 * @param {object} config - GitVan config
 * @param {object} args - Test arguments
 * @returns {Promise<void>}
 */
async function testPredicate(config, args) {
  try {
    if (!args.predicate) {
      throw new Error("Predicate required for test command");
    }

    const predicate = JSON.parse(args.predicate);
    const meta = parseEventMeta(args);

    console.log("Testing predicate:");
    console.log(JSON.stringify(predicate, null, 2));
    console.log();
    console.log("Against event metadata:");
    console.log(JSON.stringify(meta, null, 2));
    console.log();

    const result = matches(predicate, meta);

    console.log(`Result: ${result ? "✅ MATCH" : "❌ NO MATCH"}`);
  } catch (error) {
    logger.error("Failed to test predicate:", error.message);
    throw error;
  }
}

/**
 * List all event jobs
 * @param {object} config - GitVan config
 * @returns {Promise<void>}
 */
async function listEventJobs(config) {
  try {
    const jobs = await scanJobs({ cwd: config.rootDir });
    const eventJobs = jobs.filter((job) => job.on);

    if (eventJobs.length === 0) {
      console.log("No event jobs found");
      return;
    }

    console.log(`Found ${eventJobs.length} event job(s):`);
    console.log();

    for (const job of eventJobs) {
      console.log(`🎯 ${job.id || job.filename}`);
      console.log(`   File: ${job.filePath}`);
      if (job.meta?.desc) {
        console.log(`   Desc: ${job.meta.desc}`);
      }
      console.log(`   Predicate: ${JSON.stringify(job.on, null, 2)}`);
      console.log();
    }
  } catch (error) {
    logger.error("Failed to list event jobs:", error.message);
    throw error;
  }
}

/**
 * Trigger an actual event (for testing)
 * @param {object} config - GitVan config
 * @param {object} args - Trigger arguments
 * @returns {Promise<void>}
 */
async function triggerEvent(config, args) {
  try {
    console.log("Event triggering not implemented in this version");
    console.log("Use 'simulate' command to test event predicates");
  } catch (error) {
    logger.error("Failed to trigger event:", error.message);
    throw error;
  }
}

/**
 * Parse event metadata from command arguments
 * @param {object} args - Command arguments
 * @returns {object} Event metadata
 */
function parseEventMeta(args) {
  const meta = {};

  if (args.files) {
    meta.filesChanged = args.files.split(",");
  }

  if (args.tags) {
    meta.tagsCreated = args.tags.split(",");
  }

  if (args.message) {
    meta.message = args.message;
  }

  if (args.author) {
    meta.authorEmail = args.author;
  }

  if (args.branch) {
    meta.mergedTo = args.branch;
  }

  if (args.signed !== undefined) {
    meta.signed = args.signed === "true";
  }

  return meta;
}
