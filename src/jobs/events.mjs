// src/jobs/events.mjs
// GitVan v2 — Event-Driven Job System
// Git-native event predicates and triggers

import { scanJobs } from "./scan.mjs";
import { JobRunner } from "./runner.mjs";
import { loadOptions } from "../config/loader.mjs";
import { useGit } from "../composables/git.mjs";

/**
 * Event predicate evaluator
 */
export class EventEvaluator {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.runner = null;
    this.git = null;
  }

  async init() {
    this.config = await loadOptions();
    this.runner = new JobRunner({
      receiptsRef: this.config.receipts.ref,
      hooks: this.config.hooks,
    });
    this.git = useGit();
  }

  /**
   * Evaluate event predicates against git state
   */
  async evaluatePredicates(predicates, context = {}) {
    const results = {};

    for (const [key, value] of Object.entries(predicates)) {
      if (key === "any" || key === "all") {
        // Handle logical operators
        results[key] = await this.evaluateLogicalPredicate(key, value, context);
      } else {
        // Handle individual predicates
        results[key] = await this.evaluateSinglePredicate(key, value, context);
      }
    }

    return results;
  }

  /**
   * Evaluate logical predicates (any/all)
   */
  async evaluateLogicalPredicate(operator, predicates, context) {
    const results = await Promise.all(
      predicates.map((pred) => this.evaluatePredicates(pred, context))
    );

    if (operator === "any") {
      return results.some((result) => this.isPredicateTrue(result));
    } else if (operator === "all") {
      return results.every((result) => this.isPredicateTrue(result));
    }

    return false;
  }

  /**
   * Check if a predicate result is true
   */
  isPredicateTrue(result) {
    if (typeof result === "boolean") return result;
    if (typeof result === "object" && result !== null) {
      // For logical operators, check the specific key
      if (result.any !== undefined) {
        return result.any === true;
      }
      if (result.all !== undefined) {
        return result.all === true;
      }
      // For other objects, check if any property is true
      return Object.values(result).some((value) =>
        typeof value === "boolean" ? value : this.isPredicateTrue(value)
      );
    }
    return false;
  }

  /**
   * Evaluate a single predicate
   */
  async evaluateSinglePredicate(type, value, context) {
    switch (type) {
      case "tagCreate":
        return await this.evaluateTagCreate(value, context);
      case "semverTag":
        return await this.evaluateSemverTag(value, context);
      case "mergeTo":
        return await this.evaluateMergeTo(value, context);
      case "pushTo":
        return await this.evaluatePushTo(value, context);
      case "pathChanged":
        return await this.evaluatePathChanged(value, context);
      case "pathAdded":
        return await this.evaluatePathAdded(value, context);
      case "pathModified":
        return await this.evaluatePathModified(value, context);
      case "message":
        return await this.evaluateMessage(value, context);
      case "authorEmail":
        return await this.evaluateAuthorEmail(value, context);
      case "signed":
        return await this.evaluateSigned(value, context);
      default:
        return false;
    }
  }

  /**
   * Evaluate tag creation predicate
   */
  async evaluateTagCreate(pattern, context) {
    const { commit = "HEAD" } = context;

    try {
      // Get the latest tag
      const latestTag = await this.git.run([
        "describe",
        "--tags",
        "--abbrev=0",
        commit,
      ]);
      if (!latestTag) return false;

      // Check if tag matches pattern
      return this.matchesPattern(latestTag.trim(), pattern);
    } catch {
      return false;
    }
  }

  /**
   * Evaluate semver tag predicate
   */
  async evaluateSemverTag(required, context) {
    const { commit = "HEAD" } = context;

    try {
      const latestTag = await this.git.run([
        "describe",
        "--tags",
        "--abbrev=0",
        commit,
      ]);
      if (!latestTag) return false;

      // Check if tag follows semver pattern
      const semverPattern =
        /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
      const isSemver = semverPattern.test(latestTag.trim());

      return required ? isSemver : !isSemver;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate merge to branch predicate
   */
  async evaluateMergeTo(branch, context) {
    const { commit = "HEAD" } = context;

    try {
      // Check if this is a merge commit
      const isMerge = await this.git.run([
        "rev-list",
        "--merges",
        "-n",
        "1",
        commit,
      ]);
      if (!isMerge) return false;

      // Get the merge target branch
      const mergeTarget = await this.git.run([
        "log",
        "--merges",
        "-n",
        "1",
        "--pretty=%s",
        commit,
      ]);

      return (
        mergeTarget.includes(`Merge branch '${branch}'`) ||
        mergeTarget.includes(`Merge pull request`) ||
        mergeTarget.includes(`into ${branch}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Evaluate push to branch predicate
   */
  async evaluatePushTo(branch, context) {
    const { commit = "HEAD" } = context;

    try {
      // Get current branch
      const currentBranch = await this.git.getCurrentBranch();
      return currentBranch === branch;
    } catch {
      return false;
    }
  }

  /**
   * Evaluate path changed predicate
   */
  async evaluatePathChanged(patterns, context) {
    const { commit = "HEAD", previousCommit = "HEAD~1" } = context;

    try {
      const changedFiles = await this.git.run([
        "diff",
        "--name-only",
        previousCommit,
        commit,
      ]);

      const files = changedFiles.split("\n").filter(Boolean);
      return patterns.some((pattern) =>
        files.some((file) => this.matchesPattern(file, pattern))
      );
    } catch {
      return false;
    }
  }

  /**
   * Evaluate path added predicate
   */
  async evaluatePathAdded(patterns, context) {
    const { commit = "HEAD", previousCommit = "HEAD~1" } = context;

    try {
      const addedFiles = await this.git.run([
        "diff",
        "--name-only",
        "--diff-filter=A",
        previousCommit,
        commit,
      ]);

      const files = addedFiles.split("\n").filter(Boolean);
      return patterns.some((pattern) =>
        files.some((file) => this.matchesPattern(file, pattern))
      );
    } catch {
      return false;
    }
  }

  /**
   * Evaluate path modified predicate
   */
  async evaluatePathModified(patterns, context) {
    const { commit = "HEAD", previousCommit = "HEAD~1" } = context;

    try {
      const modifiedFiles = await this.git.run([
        "diff",
        "--name-only",
        "--diff-filter=M",
        previousCommit,
        commit,
      ]);

      const files = modifiedFiles.split("\n").filter(Boolean);
      return patterns.some((pattern) =>
        files.some((file) => this.matchesPattern(file, pattern))
      );
    } catch {
      return false;
    }
  }

  /**
   * Evaluate commit message predicate
   */
  async evaluateMessage(pattern, context) {
    const { commit = "HEAD" } = context;

    try {
      const message = await this.git.run([
        "log",
        "-n",
        "1",
        "--pretty=%s",
        commit,
      ]);

      return this.matchesPattern(message.trim(), pattern);
    } catch {
      return false;
    }
  }

  /**
   * Evaluate author email predicate
   */
  async evaluateAuthorEmail(pattern, context) {
    const { commit = "HEAD" } = context;

    try {
      const email = await this.git.run([
        "log",
        "-n",
        "1",
        "--pretty=%ae",
        commit,
      ]);

      return this.matchesPattern(email.trim(), pattern);
    } catch {
      return false;
    }
  }

  /**
   * Evaluate signed commit predicate
   */
  async evaluateSigned(required, context) {
    const { commit = "HEAD" } = context;

    try {
      const signature = await this.git.run([
        "show",
        "--show-signature",
        commit,
      ]);

      const isSigned = signature.includes("Good signature");
      return required ? isSigned : !isSigned;
    } catch {
      return false;
    }
  }

  /**
   * Simple pattern matching (supports * wildcards)
   */
  matchesPattern(text, pattern) {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(text);
    }
    return text === pattern;
  }
}

/**
 * Event-driven job runner
 */
export class EventJobRunner {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.runner = null;
    this.evaluator = null;
    this.eventJobs = new Map();
  }

  async init() {
    this.config = await loadOptions();
    this.runner = new JobRunner({
      receiptsRef: this.config.receipts.ref,
      hooks: this.config.hooks,
    });
    this.evaluator = new EventEvaluator();
    await this.evaluator.init();
  }

  /**
   * Load event-driven jobs
   */
  async loadEventJobs() {
    await this.init();
    const jobs = await scanJobs({ cwd: this.config.rootDir });

    this.eventJobs.clear();

    for (const job of jobs) {
      this.eventJobs.set(job.id, job);
    }

    console.log(`Loaded ${this.eventJobs.size} event-driven jobs`);
  }

  /**
   * Check events and run matching jobs
   */
  async checkAndRunEventJobs(context = {}) {
    const jobsToRun = [];

    for (const [jobId, job] of this.eventJobs) {
      try {
        const results = await this.evaluator.evaluatePredicates(
          job.on,
          context
        );

        if (this.evaluator.isPredicateTrue(results)) {
          jobsToRun.push(job);
        }
      } catch (error) {
        console.warn(
          `Failed to evaluate predicates for job ${jobId}:`,
          error.message
        );
      }
    }

    if (jobsToRun.length === 0) {
      return;
    }

    console.log(`Running ${jobsToRun.length} event-driven jobs`);

    // Run jobs in parallel
    const promises = jobsToRun.map(async (job) => {
      try {
        const result = await this.runner.runJob(job, {
          trigger: {
            kind: "event",
            fingerprint: `event-${Date.now()}`,
            data: {
              predicates: job.on,
              context,
              triggeredAt: new Date().toISOString(),
            },
          },
        });
        console.log(`✅ Event job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`❌ Event job ${job.id} failed:`, error.message);
        throw error;
      }
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("Some event jobs failed:", error.message);
    }
  }

  /**
   * Dry run: show which jobs would run for given context
   */
  async dryRun(context = {}) {
    await this.loadEventJobs();

    const jobsToRun = [];
    const jobResults = {};

    for (const [jobId, job] of this.eventJobs) {
      try {
        const results = await this.evaluator.evaluatePredicates(
          job.on,
          context
        );
        jobResults[jobId] = results;

        if (this.evaluator.isPredicateTrue(results)) {
          jobsToRun.push({
            id: job.id,
            predicates: job.on,
            description: job.meta?.desc || "No description",
          });
        }
      } catch (error) {
        jobResults[jobId] = { error: error.message };
      }
    }

    return {
      context,
      jobsToRun,
      totalJobs: jobsToRun.length,
      allResults: jobResults,
    };
  }

  /**
   * List all event jobs with their predicates
   */
  async listEventJobs() {
    await this.loadEventJobs();

    const jobs = [];

    for (const [jobId, job] of this.eventJobs) {
      jobs.push({
        id: job.id,
        predicates: job.on,
        description: job.meta?.desc || "No description",
        file: job.filePath,
      });
    }

    return jobs;
  }
}

/**
 * CLI for event operations
 */
export class EventCLI {
  constructor() {
    this.runner = null;
  }

  async init() {
    this.runner = new EventJobRunner();
    await this.runner.init();
  }

  /**
   * List event jobs
   */
  async list() {
    await this.init();
    const jobs = await this.runner.listEventJobs();

    if (jobs.length === 0) {
      console.log("No event-driven jobs found");
      return;
    }

    console.log("Event-Driven Jobs:");
    console.log("ID".padEnd(20) + "PREDICATES".padEnd(40) + "DESCRIPTION");
    console.log("-".repeat(80));

    for (const job of jobs) {
      const id = job.id.padEnd(20);
      const predicates = JSON.stringify(job.predicates).padEnd(40);
      const desc = job.description;
      console.log(`${id}${predicates}${desc}`);
    }
  }

  /**
   * Dry run event jobs
   */
  async dryRun(context = {}) {
    await this.init();
    const result = await this.runner.dryRun(context);

    console.log(`Event dry run:`);
    console.log(`Context: ${JSON.stringify(result.context, null, 2)}`);

    if (result.jobsToRun.length === 0) {
      console.log("No jobs would run for this context");
      return;
    }

    console.log(`Would run ${result.totalJobs} jobs:`);
    result.jobsToRun.forEach((job) => {
      console.log(`  - ${job.id} - ${job.description}`);
    });
  }

  /**
   * Check and run event jobs
   */
  async check(context = {}) {
    await this.init();
    await this.runner.loadEventJobs();
    await this.runner.checkAndRunEventJobs(context);
  }
}
