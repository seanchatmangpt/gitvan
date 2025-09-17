/**
 * GitVan v2 - useEvent() Composable
 * Provides event system management, registration, and triggering
 */

import { useGitVan, tryUseGitVan, withGitVan } from "../core/context.mjs";
import { useGit } from "./git/index.mjs";
import { useReceipt } from "./receipt.mjs";
import { useJob } from "./job.mjs";
import { EventJobRunner } from "../jobs/events.mjs";
import { discoverEvents, loadEventDefinition } from "../runtime/events.mjs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  unrouteEventId,
  unrouteCronExpression,
  unrouteBranchName,
  unroutePathPattern,
  unrouteTagPattern,
  unrouteMessagePattern,
  unrouteAuthorPattern,
  getEventCategory,
  isEventOfType,
  unrouteAll,
  createUnrouteMapping,
} from "../utils/unrouting.mjs";

export function useEvent() {
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
  const job = useJob();
  const eventRunner = new EventJobRunner({ cwd: base.cwd });

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Event Discovery ===
    async list(options = {}) {
      const { includeMetadata = true, filter = {} } = options;

      try {
        const eventsDir = join(base.cwd, "events");
        if (!existsSync(eventsDir)) {
          return [];
        }

        const eventInfos = discoverEvents(eventsDir);
        const events = [];

        for (const eventInfo of eventInfos) {
          try {
            const eventDef = await loadEventDefinition(eventInfo.file);
            if (eventDef) {
              const event = {
                id: eventInfo.id,
                name: eventDef.name || eventInfo.id,
                description: eventDef.description || "No description",
                type: eventDef.type || "unknown",
                pattern: eventDef.pattern,
                job: eventDef.job,
                run: eventDef.run,
                file: eventInfo.file,
                ...(includeMetadata ? { metadata: eventDef } : {}),
              };

              // Apply filters
              if (filter.type && event.type !== filter.type) {
                continue;
              }

              if (filter.name && !event.name.includes(filter.name)) {
                continue;
              }

              events.push(event);
            }
          } catch (error) {
            console.warn(
              `Failed to load event ${eventInfo.id}:`,
              error.message
            );
          }
        }

        return events;
      } catch (error) {
        throw new Error(`Failed to list events: ${error.message}`);
      }
    },

    async get(eventId) {
      try {
        const events = await this.list();
        const event = events.find(
          (e) => e.id === eventId || e.name === eventId
        );

        if (!event) {
          throw new Error(`Event not found: ${eventId}`);
        }

        // Load full event definition
        const eventDef = await loadEventDefinition(event.file);
        return {
          ...event,
          definition: eventDef,
        };
      } catch (error) {
        throw new Error(`Failed to get event ${eventId}: ${error.message}`);
      }
    },

    async exists(eventId) {
      try {
        await this.get(eventId);
        return true;
      } catch {
        return false;
      }
    },

    // === Event Registration ===
    async register(eventId, definition) {
      try {
        const eventsDir = join(base.cwd, "events");
        if (!existsSync(eventsDir)) {
          mkdirSync(eventsDir, { recursive: true });
        }

        const eventFile = join(eventsDir, "custom", `${eventId}.mjs`);

        // Ensure the custom subdirectory exists
        const customDir = join(eventsDir, "custom");
        if (!existsSync(customDir)) {
          mkdirSync(customDir, { recursive: true });
        }

        // Create event definition
        const eventDef = {
          id: eventId,
          name: definition.name || eventId,
          description: definition.description || "No description",
          type: definition.type || "custom",
          pattern: definition.pattern,
          job: definition.job,
          run: definition.run,
          on: definition.on || {},
          ...definition,
        };

        // Write event file
        const content = `/**
 * GitVan Event: ${eventDef.name}
 * ${eventDef.description}
 */

export default ${JSON.stringify(eventDef, null, 2)};
`;

        writeFileSync(eventFile, content);

        return eventDef;
      } catch (error) {
        throw new Error(
          `Failed to register event ${eventId}: ${error.message}`
        );
      }
    },

    async unregister(eventId) {
      try {
        const event = await this.get(eventId);
        if (existsSync(event.file)) {
          const fs = await import("node:fs");
          fs.unlinkSync(event.file);
        }
        return true;
      } catch (error) {
        throw new Error(
          `Failed to unregister event ${eventId}: ${error.message}`
        );
      }
    },

    // === Event Triggering ===
    async trigger(eventId, context = {}) {
      try {
        const event = await this.get(eventId);
        const gitInfo = await git.info();

        // Create trigger context
        const triggerContext = {
          ...context,
          git: gitInfo,
          timestamp: new Date().toISOString(),
          eventId,
        };

        // Run event with proper context
        const result = await withGitVan(triggerContext, async () => {
          if (event.definition.job) {
            // Run associated job
            return await job.run(event.definition.job, {
              payload: triggerContext,
            });
          } else if (event.definition.run) {
            // Run inline action
            return await eventRunner.runAction(
              event.definition.run,
              triggerContext
            );
          } else {
            throw new Error(`No action defined for event ${eventId}`);
          }
        });

        // Create receipt for event trigger
        await receipt.create({
          eventId,
          status: "success",
          context: triggerContext,
          result,
        });

        return result;
      } catch (error) {
        // Create error receipt
        await receipt.create({
          eventId,
          status: "error",
          error: error.message,
        });

        throw new Error(`Failed to trigger event ${eventId}: ${error.message}`);
      }
    },

    async simulate(eventId, context = {}) {
      try {
        const event = await this.get(eventId);
        const gitInfo = await git.info();

        // Create simulation context
        const simContext = {
          ...context,
          git: gitInfo,
          timestamp: new Date().toISOString(),
          eventId,
          simulation: true,
        };

        // Simulate event execution (dry run)
        const result = await withGitVan(simContext, async () => {
          if (event.definition.job) {
            // Simulate job execution
            return {
              simulated: true,
              jobId: event.definition.job,
              context: simContext,
            };
          } else if (event.definition.run) {
            // Simulate inline action
            return {
              simulated: true,
              action: event.definition.run,
              context: simContext,
            };
          } else {
            throw new Error(`No action defined for event ${eventId}`);
          }
        });

        return result;
      } catch (error) {
        throw new Error(
          `Failed to simulate event ${eventId}: ${error.message}`
        );
      }
    },

    // === Event Status ===
    async status(eventId) {
      try {
        const receipts = await receipt.list({ eventId });
        const lastReceipt = receipts.length > 0 ? receipts[0] : null;

        return {
          id: eventId,
          lastTriggered: lastReceipt?.timestamp || null,
          lastStatus: lastReceipt?.status || null,
          totalTriggers: receipts.length,
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
          `Failed to get event status for ${eventId}: ${error.message}`
        );
      }
    },

    // === Event History ===
    async history(eventId, options = {}) {
      const { limit = 50, status = null } = options;

      try {
        const receipts = await receipt.list({ eventId });

        let filtered = receipts;
        if (status) {
          filtered = receipts.filter((r) => r.status === status);
        }

        return filtered.slice(0, limit);
      } catch (error) {
        throw new Error(
          `Failed to get event history for ${eventId}: ${error.message}`
        );
      }
    },

    // === Event Management ===
    async validate(eventId) {
      try {
        const eventDef = await this.get(eventId);

        const validation = {
          id: eventId,
          valid: true,
          errors: [],
          warnings: [],
        };

        // Check event definition
        if (!eventDef.definition) {
          validation.valid = false;
          validation.errors.push("Event definition not found");
        }

        // Check for action
        if (!eventDef.definition.job && !eventDef.definition.run) {
          validation.valid = false;
          validation.errors.push("Event must have either job or run action");
        }

        // Check job exists if referenced
        if (eventDef.definition.job) {
          const jobExists = await job.exists(eventDef.definition.job);
          if (!jobExists) {
            validation.valid = false;
            validation.errors.push(
              `Referenced job not found: ${eventDef.definition.job}`
            );
          }
        }

        // Check metadata
        if (!eventDef.definition.name) {
          validation.warnings.push("Event missing name");
        }

        if (!eventDef.definition.description) {
          validation.warnings.push("Event missing description");
        }

        // Check file exists
        if (!existsSync(eventDef.file)) {
          validation.valid = false;
          validation.errors.push("Event file not found");
        }

        return validation;
      } catch (error) {
        return {
          id: eventId,
          valid: false,
          errors: [error.message],
          warnings: [],
        };
      }
    },

    async validateAll() {
      try {
        const events = await this.list();
        const results = [];

        for (const event of events) {
          const validation = await this.validate(event.id);
          results.push(validation);
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to validate all events: ${error.message}`);
      }
    },

    // === Event Utilities ===
    async search(query, options = {}) {
      const { fields = ["name", "description", "type"] } = options;

      try {
        const events = await this.list();
        const results = [];

        for (const event of events) {
          let matches = false;

          for (const field of fields) {
            if (
              event[field] &&
              event[field].toLowerCase().includes(query.toLowerCase())
            ) {
              matches = true;
              break;
            }
          }

          if (matches) {
            results.push(event);
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to search events: ${error.message}`);
      }
    },

    async getByType(type) {
      try {
        const events = await this.list();
        return events.filter((event) => event.type === type);
      } catch (error) {
        throw new Error(
          `Failed to get events by type ${type}: ${error.message}`
        );
      }
    },

    async getByJob(jobId) {
      try {
        const events = await this.list();
        return events.filter((event) => event.job === jobId);
      } catch (error) {
        throw new Error(
          `Failed to get events by job ${jobId}: ${error.message}`
        );
      }
    },

    // === Event Context Helpers ===
    async createContext(eventId, options = {}) {
      const { additionalContext = {} } = options;

      try {
        const gitInfo = await git.info();
        const eventDef = await this.get(eventId);

        return {
          event: {
            id: eventId,
            name: eventDef.name,
            description: eventDef.description,
            type: eventDef.type,
          },
          git: gitInfo,
          timestamp: new Date().toISOString(),
          ...additionalContext,
        };
      } catch (error) {
        throw new Error(
          `Failed to create event context for ${eventId}: ${error.message}`
        );
      }
    },

    // === Event Fingerprinting ===
    async getFingerprint(eventId) {
      try {
        const eventDef = await this.get(eventId);
        const content = readFileSync(eventDef.file, "utf8");

        return createHash("sha256").update(content).digest("hex").slice(0, 16);
      } catch (error) {
        throw new Error(
          `Failed to get event fingerprint for ${eventId}: ${error.message}`
        );
      }
    },

    // === Event Patterns ===
    async matchPattern(eventId, context = {}) {
      try {
        const event = await this.get(eventId);
        if (!event.definition.pattern) {
          return true; // No pattern means always match
        }

        // Simple pattern matching (can be extended)
        const pattern = event.definition.pattern;
        const gitInfo = await git.info();

        // Check branch patterns
        if (pattern.branch) {
          if (Array.isArray(pattern.branch)) {
            if (!pattern.branch.includes(gitInfo.branch)) {
              return false;
            }
          } else if (pattern.branch !== gitInfo.branch) {
            return false;
          }
        }

        // Check tag patterns
        if (pattern.tag) {
          const tags = await git.getTags();
          if (Array.isArray(pattern.tag)) {
            if (!pattern.tag.some((tag) => tags.includes(tag))) {
              return false;
            }
          } else if (!tags.includes(pattern.tag)) {
            return false;
          }
        }

        return true;
      } catch (error) {
        return false;
      }
    },

    // === Event Unrouting ===
    unroute(eventId) {
      return unrouteEventId(eventId);
    },

    getCategory(eventId) {
      return getEventCategory(eventId);
    },

    isOfType(eventId, type) {
      return isEventOfType(eventId, type);
    },

    unrouteCron(eventId) {
      return unrouteCronExpression(eventId);
    },

    unrouteBranch(eventId) {
      return unrouteBranchName(eventId);
    },

    unroutePath(eventId) {
      return unroutePathPattern(eventId);
    },

    unrouteTag(eventId) {
      return unrouteTagPattern(eventId);
    },

    unrouteMessage(eventId) {
      return unrouteMessagePattern(eventId);
    },

    unrouteAuthor(eventId) {
      return unrouteAuthorPattern(eventId);
    },

    async listUnrouted(options = {}) {
      try {
        const events = await this.list(options);
        return events.map((event) => ({
          ...event,
          unroutedName: unrouteEventId(event.id),
          category: getEventCategory(event.id),
          cronExpression: unrouteCronExpression(event.id),
          branchName: unrouteBranchName(event.id),
          pathPattern: unroutePathPattern(event.id),
          tagPattern: unrouteTagPattern(event.id),
          messagePattern: unrouteMessagePattern(event.id),
          authorPattern: unrouteAuthorPattern(event.id),
        }));
      } catch (error) {
        throw new Error(`Failed to list unrouted events: ${error.message}`);
      }
    },

    async getByUnroutedName(unroutedName, options = {}) {
      try {
        const events = await this.list(options);
        const event = events.find((e) => unrouteEventId(e.id) === unroutedName);

        if (!event) {
          throw new Error(
            `Event not found with unrouted name: ${unroutedName}`
          );
        }

        return {
          ...event,
          unroutedName: unrouteEventId(event.id),
          category: getEventCategory(event.id),
          cronExpression: unrouteCronExpression(event.id),
          branchName: unrouteBranchName(event.id),
          pathPattern: unroutePathPattern(event.id),
          tagPattern: unrouteTagPattern(event.id),
          messagePattern: unrouteMessagePattern(event.id),
          authorPattern: unrouteAuthorPattern(event.id),
        };
      } catch (error) {
        throw new Error(
          `Failed to get event by unrouted name ${unroutedName}: ${error.message}`
        );
      }
    },

    async getByType(type, options = {}) {
      try {
        const events = await this.list(options);
        return events
          .filter((event) => isEventOfType(event.id, type))
          .map((event) => ({
            ...event,
            unroutedName: unrouteEventId(event.id),
            category: getEventCategory(event.id),
            cronExpression: unrouteCronExpression(event.id),
            branchName: unrouteBranchName(event.id),
            pathPattern: unroutePathPattern(event.id),
            tagPattern: unrouteTagPattern(event.id),
            messagePattern: unrouteMessagePattern(event.id),
            authorPattern: unrouteAuthorPattern(event.id),
          }));
      } catch (error) {
        throw new Error(
          `Failed to get events by type ${type}: ${error.message}`
        );
      }
    },

    createUnrouteMapping(eventIds) {
      return createUnrouteMapping(eventIds, "event");
    },

    unrouteAll(eventIds) {
      return unrouteAll(eventIds, "event");
    },
  };
}
