/**
 * GitVan v2 - useJob() Composable
 * Provides job lifecycle management, execution, and discovery
 */

import { useGitVan, tryUseGitVan, withGitVan } from "../core/context.mjs";
import { useGit } from "./git/index.mjs";
import { useReceipt } from "./receipt.mjs";
import { useLock } from "./lock.mjs";
import { discoverJobs, loadJobDefinition } from "../runtime/jobs.mjs";
import { JobRunner } from "../jobs/runner.mjs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  unrouteJobId,
  getJobDirectory,
  isJobInDirectory,
  unrouteAll,
  createUnrouteMapping,
} from "../utils/unrouting.mjs";

export function useJob() {
  // Get context from unctx - this must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory and environment
  const cwd = (ctx && ctx.cwd) || process.cwd();
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC", // Always override to UTC for determinism
    LANG: "C", // Always override to C locale for determinism
  };

  const base = { cwd, env };

  // Initialize dependencies
  const git = useGit();
  const receipt = useReceipt();
  const lock = useLock();
  const runner = new JobRunner({ cwd: base.cwd });

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Job Discovery ===
    async list(options = {}) {
      const { includeMetadata = true, filter = {} } = options;

      try {
        const jobsDir = join(base.cwd, "jobs");
        if (!existsSync(jobsDir)) {
          return [];
        }

        const jobInfos = discoverJobs(jobsDir);
        const jobs = [];

        for (const jobInfo of jobInfos) {
          try {
            const jobDef = await loadJobDefinition(jobInfo.file);
            if (jobDef) {
              const job = {
                id: jobInfo.id,
                name: jobDef.meta?.name || jobInfo.id,
                description: jobDef.meta?.desc || "No description",
                tags: jobDef.meta?.tags || [],
                cron: jobDef.cron,
                file: jobInfo.file,
                ...(includeMetadata ? { metadata: jobDef.meta } : {}),
              };

              // Apply filters
              if (filter.tags && filter.tags.length > 0) {
                if (!filter.tags.some((tag) => job.tags.includes(tag))) {
                  continue;
                }
              }

              if (filter.name && !job.name.includes(filter.name)) {
                continue;
              }

              jobs.push(job);
            }
          } catch (error) {
            console.warn(`Failed to load job ${jobInfo.id}:`, error.message);
          }
        }

        return jobs;
      } catch (error) {
        throw new Error(`Failed to list jobs: ${error.message}`);
      }
    },

    async get(jobId) {
      try {
        const jobs = await this.list();
        const job = jobs.find((j) => j.id === jobId || j.name === jobId);

        if (!job) {
          throw new Error(`Job not found: ${jobId}`);
        }

        // Load full job definition
        const jobDef = await loadJobDefinition(job.file);
        return {
          ...job,
          definition: jobDef,
        };
      } catch (error) {
        throw new Error(`Failed to get job ${jobId}: ${error.message}`);
      }
    },

    async exists(jobId) {
      try {
        await this.get(jobId);
        return true;
      } catch {
        return false;
      }
    },

    // === Job Execution ===
    async run(jobId, options = {}) {
      const { payload = {}, context = {} } = options;

      try {
        const jobDef = await this.get(jobId);
        if (!jobDef.definition) {
          throw new Error(`Job definition not found: ${jobId}`);
        }

        // Create execution context
        const execContext = {
          ...context,
          cwd: base.cwd,
          env: base.env,
          git: await git.info(),
        };

        // Run the job with proper context
        const result = await withGitVan(execContext, async () => {
          return await runner.runJob(jobDef.definition, {
            payload,
            context: execContext,
          });
        });

        return result;
      } catch (error) {
        throw new Error(`Failed to run job ${jobId}: ${error.message}`);
      }
    },

    async runWithLock(jobId, options = {}) {
      const { payload = {}, lockOptions = {} } = options;
      const lockName = `job-${jobId}`;

      try {
        // Acquire lock
        const acquired = await lock.acquire(lockName, lockOptions);
        if (!acquired) {
          throw new Error(`Job ${jobId} is already running`);
        }

        try {
          // Run job
          const result = await this.run(jobId, { payload });
          return result;
        } finally {
          // Always release lock
          await lock.release(lockName);
        }
      } catch (error) {
        throw new Error(
          `Failed to run job ${jobId} with lock: ${error.message}`
        );
      }
    },

    // === Job Status ===
    async status(jobId) {
      try {
        const lockName = `job-${jobId}`;
        const isRunning = await lock.isLocked(lockName);

        const receipts = await receipt.list({ jobId });
        const lastReceipt = receipts.length > 0 ? receipts[0] : null;

        return {
          id: jobId,
          isRunning,
          lastRun: lastReceipt?.timestamp || null,
          lastStatus: lastReceipt?.status || null,
          totalRuns: receipts.length,
          successRate:
            receipts.length > 0
              ? Math.round(
                  (receipts.filter((r) => r.status === "success").length /
                    receipts.length) *
                    100
                )
              : 0,
        };
      } catch (error) {
        throw new Error(
          `Failed to get job status for ${jobId}: ${error.message}`
        );
      }
    },

    async isRunning(jobId) {
      try {
        const lockName = `job-${jobId}`;
        return await lock.isLocked(lockName);
      } catch (error) {
        return false;
      }
    },

    // === Job History ===
    async history(jobId, options = {}) {
      const { limit = 50, status = null } = options;

      try {
        const receipts = await receipt.list({ jobId });

        let filtered = receipts;
        if (status) {
          filtered = receipts.filter((r) => r.status === status);
        }

        return filtered.slice(0, limit);
      } catch (error) {
        throw new Error(
          `Failed to get job history for ${jobId}: ${error.message}`
        );
      }
    },

    // === Job Management ===
    async validate(jobId) {
      try {
        const jobDef = await this.get(jobId);

        const validation = {
          id: jobId,
          valid: true,
          errors: [],
          warnings: [],
        };

        // Check job definition
        if (!jobDef.definition) {
          validation.valid = false;
          validation.errors.push("Job definition not found");
        }

        // Check for run function in definition or directly in jobDef
        const runFunction =
          jobDef.definition?.run ||
          jobDef.run ||
          jobDef.definition?.default?.run;
        if (!runFunction || typeof runFunction !== "function") {
          validation.valid = false;
          validation.errors.push("Job must have a run function");
        }

        // Check metadata
        const metadata =
          jobDef.definition?.meta || jobDef.definition?.default?.meta;
        if (!metadata) {
          validation.warnings.push("Job missing metadata");
        }

        if (!metadata?.desc && !metadata?.description) {
          validation.warnings.push("Job missing description");
        }

        // Check file exists
        if (!existsSync(jobDef.file)) {
          validation.valid = false;
          validation.errors.push("Job file not found");
        }

        return validation;
      } catch (error) {
        return {
          id: jobId,
          valid: false,
          errors: [error.message],
          warnings: [],
        };
      }
    },

    async validateAll() {
      try {
        const jobs = await this.list();
        const results = [];

        for (const job of jobs) {
          const validation = await this.validate(job.id);
          results.push(validation);
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to validate all jobs: ${error.message}`);
      }
    },

    // === Job Utilities ===
    async search(query, options = {}) {
      const { fields = ["name", "description", "tags"] } = options;

      try {
        const jobs = await this.list();
        const results = [];

        for (const job of jobs) {
          let matches = false;

          for (const field of fields) {
            if (field === "tags") {
              if (
                job.tags.some((tag) =>
                  tag.toLowerCase().includes(query.toLowerCase())
                )
              ) {
                matches = true;
                break;
              }
            } else if (
              job[field] &&
              job[field].toLowerCase().includes(query.toLowerCase())
            ) {
              matches = true;
              break;
            }
          }

          if (matches) {
            results.push(job);
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to search jobs: ${error.message}`);
      }
    },

    async getByTag(tag) {
      try {
        const jobs = await this.list();
        return jobs.filter((job) => job.tags.includes(tag));
      } catch (error) {
        throw new Error(`Failed to get jobs by tag ${tag}: ${error.message}`);
      }
    },

    async getCronJobs() {
      try {
        const jobs = await this.list();
        return jobs.filter((job) => job.cron);
      } catch (error) {
        throw new Error(`Failed to get cron jobs: ${error.message}`);
      }
    },

    // === Job Context Helpers ===
    async createContext(jobId, options = {}) {
      const { payload = {}, additionalContext = {} } = options;

      try {
        const gitInfo = await git.info();
        const jobDef = await this.get(jobId);

        return {
          job: {
            id: jobId,
            name: jobDef.name,
            description: jobDef.description,
            tags: jobDef.tags,
          },
          git: gitInfo,
          payload,
          timestamp: new Date().toISOString(),
          ...additionalContext,
        };
      } catch (error) {
        throw new Error(
          `Failed to create job context for ${jobId}: ${error.message}`
        );
      }
    },

    // === Job Fingerprinting ===
    async getFingerprint(jobId) {
      try {
        const jobDef = await this.get(jobId);
        const content = readFileSync(jobDef.file, "utf8");

        return createHash("sha256").update(content).digest("hex").slice(0, 16);
      } catch (error) {
        throw new Error(
          `Failed to get job fingerprint for ${jobId}: ${error.message}`
        );
      }
    },

    // === Job Unrouting ===
    unroute(jobId) {
      return unrouteJobId(jobId);
    },

    getDirectory(jobId) {
      return getJobDirectory(jobId);
    },

    isInDirectory(jobId, directory) {
      return isJobInDirectory(jobId, directory);
    },

    async listUnrouted(options = {}) {
      try {
        const jobs = await this.list(options);
        return jobs.map((job) => ({
          ...job,
          unroutedName: unrouteJobId(job.id),
          directory: getJobDirectory(job.id),
        }));
      } catch (error) {
        throw new Error(`Failed to list unrouted jobs: ${error.message}`);
      }
    },

    async getByUnroutedName(unroutedName, options = {}) {
      try {
        const jobs = await this.list(options);
        const job = jobs.find((j) => unrouteJobId(j.id) === unroutedName);

        if (!job) {
          throw new Error(`Job not found with unrouted name: ${unroutedName}`);
        }

        return {
          ...job,
          unroutedName: unrouteJobId(job.id),
          directory: getJobDirectory(job.id),
        };
      } catch (error) {
        throw new Error(
          `Failed to get job by unrouted name ${unroutedName}: ${error.message}`
        );
      }
    },

    async getByDirectory(directory, options = {}) {
      try {
        const jobs = await this.list(options);
        return jobs
          .filter((job) => isJobInDirectory(job.id, directory))
          .map((job) => ({
            ...job,
            unroutedName: unrouteJobId(job.id),
            directory: getJobDirectory(job.id),
          }));
      } catch (error) {
        throw new Error(
          `Failed to get jobs by directory ${directory}: ${error.message}`
        );
      }
    },

    createUnrouteMapping(jobIds) {
      return createUnrouteMapping(jobIds, "job");
    },

    unrouteAll(jobIds) {
      return unrouteAll(jobIds, "job");
    },
  };
}
