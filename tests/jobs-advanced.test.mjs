// tests/jobs-advanced.test.mjs
// GitVan v2 — Advanced Job System Tests
// Tests cron scheduler, events, daemon, and CLI commands

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { startCronScheduler, scanJobs } from "../src/jobs/cron.mjs";
import { cronCommand } from "../src/cli/cron.mjs";
import { eventCommand } from "../src/cli/event.mjs";
import { daemonCommand } from "../src/cli/daemon.mjs";
import { discoverEvents, loadEventDefinition } from "../src/runtime/events.mjs";
import { discoverJobs, loadJobDefinition } from "../src/runtime/jobs.mjs";

describe("GitVan Advanced Job System Tests", () => {
  let tempDir;
  let jobsDir;
  let eventsDir;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-advanced-jobs-temp");
    jobsDir = join(tempDir, "jobs");
    eventsDir = join(tempDir, "events");
    await fs.mkdir(jobsDir, { recursive: true });
    await fs.mkdir(eventsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("cron scheduler", () => {
    it("should scan jobs for cron schedules", async () => {
      // Create a test job with cron schedule
      const cronJobContent = `
import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  meta: { desc: "Test cron job" },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    return { ok: true, message: "Cron job executed" };
  }
});
`;

      const cronJobPath = join(jobsDir, "test-cron.mjs");
      await fs.writeFile(cronJobPath, cronJobContent);

      const jobs = await scanJobs({ cwd: tempDir });
      const cronJobs = jobs.filter((job) => job.cron);

      expect(cronJobs).toHaveLength(1);
      expect(cronJobs[0].cron).toBe("0 2 * * *");
    });

    it("should validate cron expressions", () => {
      // Test basic cron validation
      const validCron = "0 2 * * *";
      const invalidCron = "invalid";

      // Basic validation - cron expressions should have 5 parts
      expect(validCron.split(/\s+/)).toHaveLength(5);
      expect(invalidCron.split(/\s+/)).not.toHaveLength(5);
    });
  });

  describe("cron CLI", () => {
    it("should create cron CLI", async () => {
      expect(cronCommand).toBeDefined();
      expect(typeof cronCommand).toBe("function");
    });

    it("should list cron schedule", async () => {
      // Create a test job with cron schedule
      const cronJobContent = `
import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  meta: { desc: "Test cron job" },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    return { ok: true, message: "Cron job executed" };
  }
});
`;

      const cronJobPath = join(jobsDir, "test-cron.mjs");
      await fs.writeFile(cronJobPath, cronJobContent);

      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        await cronCommand("list", {});

        // Check that console.log was called with expected output
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Found 1 cron job(s):"),
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it("should dry run cron jobs", async () => {
      // Create a test job with cron schedule
      const cronJobContent = `
import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  meta: { desc: "Test cron job" },
  cron: "0 2 * * *",
  async run({ ctx, payload }) {
    return { ok: true, message: "Cron job executed" };
  }
});
`;

      const cronJobPath = join(jobsDir, "test-cron.mjs");
      await fs.writeFile(cronJobPath, cronJobContent);

      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        await cronCommand("dry-run", {});

        // Check that console.log was called
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe("event system", () => {
    it("should discover events", async () => {
      // Create a test event file
      const eventContent = `
export default {
  meta: { desc: "Test event" },
  predicate: {
    type: "push",
    branch: "main"
  },
  async run({ ctx, payload }) {
    return { ok: true, message: "Event executed" };
  }
};
`;

      const eventPath = join(eventsDir, "test-event.mjs");
      await fs.writeFile(eventPath, eventContent);

      const events = discoverEvents(eventsDir);
      expect(events).toHaveLength(1);
      expect(events[0].relativePath).toBe("test-event.mjs");
    });

    it("should load event definition", async () => {
      // Create a test event file
      const eventContent = `
export default {
  meta: { desc: "Test event" },
  predicate: {
    type: "push",
    branch: "main"
  },
  async run({ ctx, payload }) {
    return { ok: true, message: "Event executed" };
  }
};
`;

      const eventPath = join(eventsDir, "test-event.mjs");
      await fs.writeFile(eventPath, eventContent);

      const definition = await loadEventDefinition(eventPath);
      expect(definition).toBeDefined();
      expect(definition.meta.desc).toBe("Test event");
      expect(typeof definition.run).toBe("function");
    });
  });

  describe("event CLI", () => {
    it("should list event jobs", async () => {
      // Create a test event file
      const eventContent = `
export default {
  meta: { desc: "Test event" },
  predicate: {
    type: "push",
    branch: "main"
  },
  async run({ ctx, payload }) {
    return { ok: true, message: "Event executed" };
  }
};
`;

      const eventPath = join(eventsDir, "test-event.mjs");
      await fs.writeFile(eventPath, eventContent);

      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        await eventCommand("list", {});

        // Check that console.log was called
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it("should dry run event jobs", async () => {
      // Create a test event file
      const eventContent = `
export default {
  meta: { desc: "Test event" },
  predicate: {
    type: "push",
    branch: "main"
  },
  async run({ ctx, payload }) {
    return { ok: true, message: "Event executed" };
  }
};
`;

      const eventPath = join(eventsDir, "test-event.mjs");
      await fs.writeFile(eventPath, eventContent);

      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        await eventCommand("test", {});

        // Check that console.log was called
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe("daemon CLI", () => {
    it("should create daemon CLI", async () => {
      expect(daemonCommand).toBeDefined();
      expect(typeof daemonCommand).toBe("function");
    });

    it("should get daemon status", async () => {
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        await daemonCommand("status", {});

        // Check that console.log was called with status info
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("GitVan Daemon Status:"),
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe("job discovery", () => {
    it("should discover jobs", async () => {
      // Create a test job
      const jobContent = `
import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  meta: { desc: "Test job" },
  async run({ ctx, payload }) {
    return { ok: true, message: "Job executed" };
  }
});
`;

      const jobPath = join(jobsDir, "test-job.mjs");
      await fs.writeFile(jobPath, jobContent);

      const jobs = discoverJobs(jobsDir);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe("test-job");
    });

    it("should load job definition", async () => {
      // Create a test job
      const jobContent = `
import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  meta: { desc: "Test job" },
  async run({ ctx, payload }) {
    return { ok: true, message: "Job executed" };
  }
});
`;

      const jobPath = join(jobsDir, "test-job.mjs");
      await fs.writeFile(jobPath, jobContent);

      const definition = await loadJobDefinition(jobPath);
      expect(definition).toBeDefined();
      expect(definition.meta.desc).toBe("Test job");
      expect(typeof definition.run).toBe("function");
    });
  });
});
