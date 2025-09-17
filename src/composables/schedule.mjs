/**
 * GitVan v2 - useSchedule() Composable
 * Provides cron and scheduling management for jobs
 */

import { useGitVan, tryUseGitVan, withGitVan } from "../core/context.mjs";
import { useGit } from "./git.mjs";
import { useJob } from "./job.mjs";
import { useReceipt } from "./receipt.mjs";
import { startCronScheduler } from "../jobs/cron.mjs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

export function useSchedule() {
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
  const job = useJob();
  const receipt = useReceipt();

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Schedule Management ===
    async add(scheduleId, cronExpression, jobId, options = {}) {
      try {
        const schedulesDir = join(base.cwd, "schedules");
        if (!existsSync(schedulesDir)) {
          mkdirSync(schedulesDir, { recursive: true });
        }

        const scheduleFile = join(schedulesDir, `${scheduleId}.mjs`);

        // Create schedule definition
        const scheduleDef = {
          id: scheduleId,
          name: options.name || scheduleId,
          description: options.description || "No description",
          cron: cronExpression,
          jobId,
          enabled: options.enabled !== false,
          timezone: options.timezone || "UTC",
          metadata: options.metadata || {},
        };

        // Write schedule file
        const content = `/**
 * GitVan Schedule: ${scheduleDef.name}
 * ${scheduleDef.description}
 * Cron: ${scheduleDef.cron}
 */

export default ${JSON.stringify(scheduleDef, null, 2)};
`;

        writeFileSync(scheduleFile, content);

        return scheduleDef;
      } catch (error) {
        throw new Error(
          `Failed to add schedule ${scheduleId}: ${error.message}`
        );
      }
    },

    async remove(scheduleId) {
      try {
        const schedule = await this.get(scheduleId);
        if (existsSync(schedule.file)) {
          const fs = await import("node:fs");
          fs.unlinkSync(schedule.file);
        }
        return true;
      } catch (error) {
        throw new Error(
          `Failed to remove schedule ${scheduleId}: ${error.message}`
        );
      }
    },

    async enable(scheduleId) {
      try {
        const schedule = await this.get(scheduleId);
        schedule.definition.enabled = true;

        const content = `/**
 * GitVan Schedule: ${schedule.definition.name}
 * ${schedule.definition.description}
 * Cron: ${schedule.definition.cron}
 */

export default ${JSON.stringify(schedule.definition, null, 2)};
`;

        writeFileSync(schedule.file, content);
        return true;
      } catch (error) {
        throw new Error(
          `Failed to enable schedule ${scheduleId}: ${error.message}`
        );
      }
    },

    async disable(scheduleId) {
      try {
        const schedule = await this.get(scheduleId);
        schedule.definition.enabled = false;

        const content = `/**
 * GitVan Schedule: ${schedule.definition.name}
 * ${schedule.definition.description}
 * Cron: ${schedule.definition.cron}
 */

export default ${JSON.stringify(schedule.definition, null, 2)};
`;

        writeFileSync(schedule.file, content);
        return true;
      } catch (error) {
        throw new Error(
          `Failed to disable schedule ${scheduleId}: ${error.message}`
        );
      }
    },

    // === Schedule Discovery ===
    async list(options = {}) {
      const { includeMetadata = true, filter = {} } = options;

      try {
        const schedulesDir = join(base.cwd, "schedules");
        if (!existsSync(schedulesDir)) {
          return [];
        }

        const scheduleFiles = await this.discoverSchedules(schedulesDir);
        const schedules = [];

        for (const scheduleInfo of scheduleFiles) {
          try {
            const scheduleDef = await this.loadScheduleDefinition(
              scheduleInfo.file
            );
            if (scheduleDef) {
              const schedule = {
                id: scheduleInfo.id,
                name: scheduleDef.name || scheduleInfo.id,
                description: scheduleDef.description || "No description",
                cron: scheduleDef.cron,
                jobId: scheduleDef.jobId,
                enabled: scheduleDef.enabled !== false,
                timezone: scheduleDef.timezone || "UTC",
                file: scheduleInfo.file,
                ...(includeMetadata ? { metadata: scheduleDef } : {}),
              };

              // Apply filters
              if (
                filter.enabled !== undefined &&
                schedule.enabled !== filter.enabled
              ) {
                continue;
              }

              if (filter.jobId && schedule.jobId !== filter.jobId) {
                continue;
              }

              schedules.push(schedule);
            }
          } catch (error) {
            console.warn(
              `Failed to load schedule ${scheduleInfo.id}:`,
              error.message
            );
          }
        }

        return schedules;
      } catch (error) {
        throw new Error(`Failed to list schedules: ${error.message}`);
      }
    },

    async get(scheduleId) {
      try {
        const schedules = await this.list();
        const schedule = schedules.find(
          (s) => s.id === scheduleId || s.name === scheduleId
        );

        if (!schedule) {
          throw new Error(`Schedule not found: ${scheduleId}`);
        }

        // Load full schedule definition
        const scheduleDef = await this.loadScheduleDefinition(schedule.file);
        return {
          ...schedule,
          definition: scheduleDef,
        };
      } catch (error) {
        throw new Error(
          `Failed to get schedule ${scheduleId}: ${error.message}`
        );
      }
    },

    async exists(scheduleId) {
      try {
        await this.get(scheduleId);
        return true;
      } catch {
        return false;
      }
    },

    // === Schedule Execution ===
    async run(scheduleId, options = {}) {
      try {
        const schedule = await this.get(scheduleId);

        if (!schedule.definition.enabled) {
          throw new Error(`Schedule ${scheduleId} is disabled`);
        }

        // Check if job exists
        const jobExists = await job.exists(schedule.definition.jobId);
        if (!jobExists) {
          throw new Error(
            `Referenced job not found: ${schedule.definition.jobId}`
          );
        }

        // Run the job
        const result = await job.run(schedule.definition.jobId, {
          payload: {
            scheduleId,
            cron: schedule.definition.cron,
            timezone: schedule.definition.timezone,
            ...options.payload,
          },
        });

        // Create receipt for schedule execution
        await receipt.create({
          jobId: schedule.definition.jobId,
          status: "success",
          metadata: {
            scheduleId,
            cron: schedule.definition.cron,
            timezone: schedule.definition.timezone,
          },
          result,
        });

        return result;
      } catch (error) {
        // Create error receipt
        await receipt.create({
          jobId: schedule.definition.jobId,
          status: "error",
          error: error.message,
          metadata: {
            scheduleId,
            cron: schedule.definition.cron,
            timezone: schedule.definition.timezone,
          },
        });

        throw new Error(
          `Failed to run schedule ${scheduleId}: ${error.message}`
        );
      }
    },

    async runAll(options = {}) {
      const { enabledOnly = true } = options;

      try {
        const schedules = await this.list({ filter: { enabled: enabledOnly } });
        const results = [];

        for (const schedule of schedules) {
          try {
            const result = await this.run(schedule.id);
            results.push({ scheduleId: schedule.id, success: true, result });
          } catch (error) {
            results.push({
              scheduleId: schedule.id,
              success: false,
              error: error.message,
            });
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to run all schedules: ${error.message}`);
      }
    },

    // === Schedule Status ===
    async status(scheduleId) {
      try {
        const schedule = await this.get(scheduleId);
        const receipts = await receipt.list({
          jobId: schedule.definition.jobId,
        });
        const lastReceipt = receipts.length > 0 ? receipts[0] : null;

        return {
          id: scheduleId,
          enabled: schedule.definition.enabled,
          cron: schedule.definition.cron,
          jobId: schedule.definition.jobId,
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
          `Failed to get schedule status for ${scheduleId}: ${error.message}`
        );
      }
    },

    // === Schedule History ===
    async history(scheduleId, options = {}) {
      const { limit = 50, status = null } = options;

      try {
        const schedule = await this.get(scheduleId);
        const receipts = await receipt.list({
          jobId: schedule.definition.jobId,
          limit,
          status,
        });

        return receipts;
      } catch (error) {
        throw new Error(
          `Failed to get schedule history for ${scheduleId}: ${error.message}`
        );
      }
    },

    // === Schedule Management ===
    async validate(scheduleId) {
      try {
        const schedule = await this.get(scheduleId);

        const validation = {
          id: scheduleId,
          valid: true,
          errors: [],
          warnings: [],
        };

        // Check schedule definition
        if (!schedule.definition) {
          validation.valid = false;
          validation.errors.push("Schedule definition not found");
        }

        // Check cron expression
        if (!schedule.definition.cron) {
          validation.valid = false;
          validation.errors.push("Schedule must have a cron expression");
        } else {
          // Validate cron expression (basic validation)
          const cronParts = schedule.definition.cron.split(" ");
          if (cronParts.length !== 5) {
            validation.valid = false;
            validation.errors.push("Invalid cron expression format");
          }
        }

        // Check job exists
        if (schedule.definition.jobId) {
          const jobExists = await job.exists(schedule.definition.jobId);
          if (!jobExists) {
            validation.valid = false;
            validation.errors.push(
              `Referenced job not found: ${schedule.definition.jobId}`
            );
          }
        }

        // Check metadata
        if (!schedule.definition.name) {
          validation.warnings.push("Schedule missing name");
        }

        if (!schedule.definition.description) {
          validation.warnings.push("Schedule missing description");
        }

        // Check file exists
        if (!existsSync(schedule.file)) {
          validation.valid = false;
          validation.errors.push("Schedule file not found");
        }

        return validation;
      } catch (error) {
        return {
          id: scheduleId,
          valid: false,
          errors: [error.message],
          warnings: [],
        };
      }
    },

    async validateAll() {
      try {
        const schedules = await this.list();
        const results = [];

        for (const schedule of schedules) {
          const validation = await this.validate(schedule.id);
          results.push(validation);
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to validate all schedules: ${error.message}`);
      }
    },

    // === Schedule Utilities ===
    async search(query, options = {}) {
      const { fields = ["name", "description", "jobId"] } = options;

      try {
        const schedules = await this.list();
        const results = [];

        for (const schedule of schedules) {
          let matches = false;

          for (const field of fields) {
            if (
              schedule[field] &&
              schedule[field].toLowerCase().includes(query.toLowerCase())
            ) {
              matches = true;
              break;
            }
          }

          if (matches) {
            results.push(schedule);
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to search schedules: ${error.message}`);
      }
    },

    async getByJob(jobId) {
      try {
        const schedules = await this.list();
        return schedules.filter((schedule) => schedule.jobId === jobId);
      } catch (error) {
        throw new Error(
          `Failed to get schedules by job ${jobId}: ${error.message}`
        );
      }
    },

    async getEnabled() {
      try {
        const schedules = await this.list();
        return schedules.filter((schedule) => schedule.enabled);
      } catch (error) {
        throw new Error(`Failed to get enabled schedules: ${error.message}`);
      }
    },

    // === Schedule Context Helpers ===
    async createContext(scheduleId, options = {}) {
      const { additionalContext = {} } = options;

      try {
        const gitInfo = await git.info();
        const schedule = await this.get(scheduleId);

        return {
          schedule: {
            id: scheduleId,
            name: schedule.name,
            description: schedule.description,
            cron: schedule.cron,
            jobId: schedule.jobId,
          },
          git: gitInfo,
          timestamp: new Date().toISOString(),
          ...additionalContext,
        };
      } catch (error) {
        throw new Error(
          `Failed to create schedule context for ${scheduleId}: ${error.message}`
        );
      }
    },

    // === Schedule Fingerprinting ===
    async getFingerprint(scheduleId) {
      try {
        const schedule = await this.get(scheduleId);
        const content = readFileSync(schedule.file, "utf8");

        return createHash("sha256").update(content).digest("hex").slice(0, 16);
      } catch (error) {
        throw new Error(
          `Failed to get schedule fingerprint for ${scheduleId}: ${error.message}`
        );
      }
    },

    // === Helper Methods ===
    async discoverSchedules(schedulesDir) {
      try {
        const fs = await import("node:fs");
        const files = fs.readdirSync(schedulesDir);

        return files
          .filter((file) => file.endsWith(".mjs"))
          .map((file) => ({
            id: file.replace(".mjs", ""),
            file: join(schedulesDir, file),
          }));
      } catch (error) {
        return [];
      }
    },

    async loadScheduleDefinition(scheduleFile) {
      try {
        const content = readFileSync(scheduleFile, "utf8");
        const module = await import(scheduleFile);
        return module.default || module;
      } catch (error) {
        throw new Error(`Failed to load schedule definition: ${error.message}`);
      }
    },

    // === Cron Scheduler Control ===
    async startScheduler(options = {}) {
      try {
        const config = {
          rootDir: base.cwd,
          cron: {
            enabled: true,
            interval: options.interval || 60000,
            timezone: options.timezone || "UTC",
          },
        };

        await startCronScheduler(config);
        return true;
      } catch (error) {
        throw new Error(`Failed to start cron scheduler: ${error.message}`);
      }
    },

    async stopScheduler() {
      try {
        // Note: stopCronScheduler is not implemented yet
        console.log("Cron scheduler stop not implemented yet");
        return true;
      } catch (error) {
        throw new Error(`Failed to stop cron scheduler: ${error.message}`);
      }
    },
  };
}
