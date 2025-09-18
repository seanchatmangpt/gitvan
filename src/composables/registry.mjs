/**
 * GitVan v2 - useRegistry() Composable
 * Provides job and event registry management, discovery, and search
 */

import { useGitVan, tryUseGitVan, withGitVan } from "../core/context.mjs";
import { useGit } from "./git/index.mjs";
import { useJob } from "./job.mjs";
import { useEvent } from "./event.mjs";
import { useSchedule } from "./schedule.mjs";
import { PackRegistry } from "../pack/registry.mjs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

export function useRegistry() {
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
  const event = useEvent();
  const schedule = useSchedule();

  // Lazy initialize pack registry
  let packRegistry = null;
  const getPackRegistry = () => {
    if (!packRegistry) {
      packRegistry = new PackRegistry({ cwd: base.cwd });
    }
    return packRegistry;
  };

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Registry Management ===
    async refresh() {
      try {
        // Refresh all registries
        const [jobs, events, schedules, packs] = await Promise.all([
          job.list(),
          event.list(),
          schedule.list(),
          this.getPacks(),
        ]);

        return {
          jobs: jobs.length,
          events: events.length,
          schedules: schedules.length,
          packs: packs.length,
          refreshedAt: new Date().toISOString(),
        };
      } catch (error) {
        throw new Error(`Failed to refresh registry: ${error.message}`);
      }
    },

    async getStats() {
      try {
        const [jobs, events, schedules, packs] = await Promise.all([
          job.list(),
          event.list(),
          schedule.list(),
          this.getPacks(),
        ]);

        return {
          jobs: {
            total: jobs.length,
            enabled: jobs.filter((j) => j.enabled !== false).length,
            cron: jobs.filter((j) => j.cron).length,
            byTag: this.groupByTag(jobs),
          },
          events: {
            total: events.length,
            byType: this.groupByType(events),
            byJob: this.groupByJob(events),
          },
          schedules: {
            total: schedules.length,
            enabled: schedules.filter((s) => s.enabled).length,
            byJob: this.groupByJob(schedules),
          },
          packs: {
            total: packs.length,
            byCategory: this.groupByCategory(packs),
            byTag: this.groupByTag(packs),
          },
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        throw new Error(`Failed to get registry stats: ${error.message}`);
      }
    },

    // === Job Registry ===
    async getJobs(options = {}) {
      const { includeMetadata = true, filter = {}, sort = "name" } = options;

      try {
        const jobs = await job.list({ includeMetadata, filter });

        // Sort jobs
        if (sort === "name") {
          jobs.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "created") {
          jobs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        return jobs;
      } catch (error) {
        throw new Error(`Failed to get jobs: ${error.message}`);
      }
    },

    async getJob(jobId) {
      try {
        return await job.get(jobId);
      } catch (error) {
        throw new Error(`Failed to get job ${jobId}: ${error.message}`);
      }
    },

    // === Event Registry ===
    async getEvents(options = {}) {
      const { includeMetadata = true, filter = {}, sort = "name" } = options;

      try {
        const events = await event.list({ includeMetadata, filter });

        // Sort events
        if (sort === "name") {
          events.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "type") {
          events.sort((a, b) => a.type.localeCompare(b.type));
        }

        return events;
      } catch (error) {
        throw new Error(`Failed to get events: ${error.message}`);
      }
    },

    async getEvent(eventId) {
      try {
        return await event.get(eventId);
      } catch (error) {
        throw new Error(`Failed to get event ${eventId}: ${error.message}`);
      }
    },

    // === Schedule Registry ===
    async getSchedules(options = {}) {
      const { includeMetadata = true, filter = {}, sort = "name" } = options;

      try {
        const schedules = await schedule.list({ includeMetadata, filter });

        // Sort schedules
        if (sort === "name") {
          schedules.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "cron") {
          schedules.sort((a, b) => a.cron.localeCompare(b.cron));
        }

        return schedules;
      } catch (error) {
        throw new Error(`Failed to get schedules: ${error.message}`);
      }
    },

    async getSchedule(scheduleId) {
      try {
        return await schedule.get(scheduleId);
      } catch (error) {
        throw new Error(
          `Failed to get schedule ${scheduleId}: ${error.message}`
        );
      }
    },

    // === Pack Registry ===
    async getPacks(options = {}) {
      const { includeMetadata = true, filter = {}, sort = "name" } = options;

      try {
        const registry = getPackRegistry();
        await registry.refreshIndex();

        const packs = await registry.list();

        // Apply filters
        let filtered = packs;
        if (filter.category) {
          filtered = filtered.filter((p) => p.category === filter.category);
        }
        if (filter.tag) {
          filtered = filtered.filter((p) => p.tags.includes(filter.tag));
        }
        if (filter.enabled !== undefined) {
          filtered = filtered.filter((p) => p.enabled === filter.enabled);
        }

        // Ensure filtered is an array
        if (!Array.isArray(filtered)) {
          filtered = [];
        }

        // Sort packs
        if (sort === "name") {
          filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "category") {
          filtered.sort((a, b) => a.category.localeCompare(b.category));
        }

        return filtered;
      } catch (error) {
        throw new Error(`Failed to get packs: ${error.message}`);
      }
    },

    async getPack(packId) {
      try {
        const registry = getPackRegistry();
        return await registry.get(packId);
      } catch (error) {
        throw new Error(`Failed to get pack ${packId}: ${error.message}`);
      }
    },

    // === Registry Search ===
    async search(query, options = {}) {
      const {
        types = ["jobs", "events", "schedules", "packs"],
        fields = ["name", "description", "tags"],
        limit = 100,
      } = options;

      try {
        const results = {
          jobs: [],
          events: [],
          schedules: [],
          packs: [],
          total: 0,
        };

        // Search jobs
        if (types.includes("jobs")) {
          results.jobs = await job.search(query, { fields });
        }

        // Search events
        if (types.includes("events")) {
          results.events = await event.search(query, { fields });
        }

        // Search schedules
        if (types.includes("schedules")) {
          results.schedules = await schedule.search(query, { fields });
        }

        // Search packs
        if (types.includes("packs")) {
          const packs = await this.getPacks();
          results.packs = packs.filter((pack) => {
            for (const field of fields) {
              if (
                pack[field] &&
                pack[field].toLowerCase().includes(query.toLowerCase())
              ) {
                return true;
              }
            }
            return false;
          });
        }

        // Calculate total
        results.total =
          results.jobs.length +
          results.events.length +
          results.schedules.length +
          results.packs.length;

        // Apply limit
        if (limit && results.total > limit) {
          const allResults = [
            ...results.jobs.map((r) => ({ ...r, type: "job" })),
            ...results.events.map((r) => ({ ...r, type: "event" })),
            ...results.schedules.map((r) => ({ ...r, type: "schedule" })),
            ...results.packs.map((r) => ({ ...r, type: "pack" })),
          ];

          return allResults.slice(0, limit);
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to search registry: ${error.message}`);
      }
    },

    // === Registry Filtering ===
    async filter(options = {}) {
      const {
        type = null,
        tags = [],
        category = null,
        enabled = null,
        limit = 100,
      } = options;

      try {
        const results = {
          jobs: [],
          events: [],
          schedules: [],
          packs: [],
        };

        // Filter jobs
        if (!type || type === "jobs") {
          results.jobs = await job.list({
            filter: { tags, enabled },
            limit,
          });
        }

        // Filter events
        if (!type || type === "events") {
          results.events = await event.list({
            filter: { tags, enabled },
            limit,
          });
        }

        // Filter schedules
        if (!type || type === "schedules") {
          results.schedules = await schedule.list({
            filter: { tags, enabled },
            limit,
          });
        }

        // Filter packs
        if (!type || type === "packs") {
          results.packs = await this.getPacks({
            filter: { tags, category, enabled },
            limit,
          });
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to filter registry: ${error.message}`);
      }
    },

    // === Registry Validation ===
    async validate(options = {}) {
      const {
        types = ["jobs", "events", "schedules", "packs"],
        includeWarnings = true,
      } = options;

      try {
        const results = {
          jobs: [],
          events: [],
          schedules: [],
          packs: [],
          summary: {
            total: 0,
            valid: 0,
            invalid: 0,
            warnings: 0,
          },
        };

        // Validate jobs
        if (types.includes("jobs")) {
          results.jobs = await job.validateAll();
        }

        // Validate events
        if (types.includes("events")) {
          results.events = await event.validateAll();
        }

        // Validate schedules
        if (types.includes("schedules")) {
          results.schedules = await schedule.validateAll();
        }

        // Validate packs
        if (types.includes("packs")) {
          const packs = await this.getPacks();
          results.packs = packs.map((pack) => ({
            id: pack.id,
            valid: true,
            errors: [],
            warnings: [],
          }));
        }

        // Calculate summary
        const allValidations = [
          ...results.jobs,
          ...results.events,
          ...results.schedules,
          ...results.packs,
        ];

        results.summary.total = allValidations.length;
        results.summary.valid = allValidations.filter((v) => v.valid).length;
        results.summary.invalid = allValidations.filter((v) => !v.valid).length;
        results.summary.warnings = allValidations.reduce(
          (sum, v) => sum + v.warnings.length,
          0
        );

        return results;
      } catch (error) {
        throw new Error(`Failed to validate registry: ${error.message}`);
      }
    },

    // === Registry Utilities ===
    groupByTag(items) {
      const groups = {};
      items.forEach((item) => {
        if (item.tags) {
          item.tags.forEach((tag) => {
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(item);
          });
        }
      });
      return groups;
    },

    groupByType(items) {
      const groups = {};
      items.forEach((item) => {
        if (item.type) {
          if (!groups[item.type]) groups[item.type] = [];
          groups[item.type].push(item);
        }
      });
      return groups;
    },

    groupByJob(items) {
      const groups = {};
      items.forEach((item) => {
        if (item.jobId) {
          if (!groups[item.jobId]) groups[item.jobId] = [];
          groups[item.jobId].push(item);
        }
      });
      return groups;
    },

    groupByCategory(items) {
      const groups = {};
      items.forEach((item) => {
        if (item.category) {
          if (!groups[item.category]) groups[item.category] = [];
          groups[item.category].push(item);
        }
      });
      return groups;
    },

    // === Registry Context Helpers ===
    async createContext(options = {}) {
      const { additionalContext = {} } = options;

      try {
        const gitInfo = await git.info();
        const stats = await this.getStats();

        return {
          registry: {
            stats,
            worktree: gitInfo.worktree,
            branch: gitInfo.branch,
          },
          git: gitInfo,
          timestamp: new Date().toISOString(),
          ...additionalContext,
        };
      } catch (error) {
        throw new Error(`Failed to create registry context: ${error.message}`);
      }
    },

    // === Registry Fingerprinting ===
    async getFingerprint() {
      try {
        const stats = await this.getStats();
        const gitInfo = await git.info();

        const data = {
          stats,
          worktree: gitInfo.worktree,
          branch: gitInfo.branch,
          timestamp: new Date().toISOString(),
        };

        return createHash("sha256")
          .update(JSON.stringify(data))
          .digest("hex")
          .slice(0, 16);
      } catch (error) {
        throw new Error(`Failed to get registry fingerprint: ${error.message}`);
      }
    },

    // === Registry Export ===
    async export(options = {}) {
      const {
        format = "json",
        types = ["jobs", "events", "schedules", "packs"],
        includeMetadata = true,
      } = options;

      try {
        const data = {};

        if (types.includes("jobs")) {
          data.jobs = await this.getJobs({ includeMetadata });
        }

        if (types.includes("events")) {
          data.events = await this.getEvents({ includeMetadata });
        }

        if (types.includes("schedules")) {
          data.schedules = await this.getSchedules({ includeMetadata });
        }

        if (types.includes("packs")) {
          data.packs = await this.getPacks({ includeMetadata });
        }

        data.exportedAt = new Date().toISOString();
        data.worktree = (await git.info()).worktree;

        if (format === "json") {
          return JSON.stringify(data, null, 2);
        } else if (format === "csv") {
          // Convert to CSV format (simplified)
          const csv = Object.entries(data)
            .filter(([key]) => key !== "exportedAt" && key !== "worktree")
            .map(([type, items]) => {
              if (Array.isArray(items) && items.length > 0) {
                const headers = Object.keys(items[0]);
                return [
                  `# ${type}`,
                  headers.join(","),
                  ...items.map((item) =>
                    headers.map((h) => item[h] || "").join(",")
                  ),
                ].join("\n");
              }
              return `# ${type}\nNo items`;
            })
            .join("\n\n");
          return csv;
        } else {
          throw new Error(`Unsupported export format: ${format}`);
        }
      } catch (error) {
        throw new Error(`Failed to export registry: ${error.message}`);
      }
    },
  };
}
