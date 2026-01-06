/**
 * Tests for Job Command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { jobCommand } from "../../../src/cli/commands/job.mjs";
import { withGitVan } from "../../../src/core/context.mjs";
import { useJob } from "../../../src/composables/job.mjs";

describe("Job Command", () => {
  let context;

  beforeEach(() => {
    context = {
      cwd: process.cwd(),
      env: {
        TZ: "UTC",
        LANG: "C",
      },
    };
  });

  describe("jobCommand", () => {
    it("should be defined", () => {
      expect(jobCommand).toBeDefined();
      expect(jobCommand.meta).toBeDefined();
      expect(jobCommand.meta.name).toBe("job");
    });

    it("should have all required subcommands", () => {
      expect(jobCommand.subCommands).toBeDefined();
      expect(jobCommand.subCommands.list).toBeDefined();
      expect(jobCommand.subCommands.run).toBeDefined();
      expect(jobCommand.subCommands.validate).toBeDefined();
      expect(jobCommand.subCommands.status).toBeDefined();
      expect(jobCommand.subCommands.history).toBeDefined();
      expect(jobCommand.subCommands.chain).toBeDefined();
      expect(jobCommand.subCommands.search).toBeDefined();
    });

    it("should have proper metadata", () => {
      expect(jobCommand.meta.description).toBe("Manage GitVan Jobs");
      expect(jobCommand.meta.usage).toContain("gitvan job");
      expect(jobCommand.meta.examples).toBeDefined();
      expect(jobCommand.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("list subcommand", () => {
    it("should be properly defined", () => {
      const listCmd = jobCommand.subCommands.list;
      expect(listCmd).toBeDefined();
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have proper arguments", () => {
      const listCmd = jobCommand.subCommands.list;
      expect(listCmd.args).toBeDefined();
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args.format).toBeDefined();
    });
  });

  describe("run subcommand", () => {
    it("should be properly defined", () => {
      const runCmd = jobCommand.subCommands.run;
      expect(runCmd).toBeDefined();
      expect(runCmd.meta.name).toBe("run");
      expect(runCmd.meta.description).toContain("Execute");
    });

    it("should have required jobId argument", () => {
      const runCmd = jobCommand.subCommands.run;
      expect(runCmd.args).toBeDefined();
      expect(runCmd.args.jobId).toBeDefined();
      expect(runCmd.args.jobId.required).toBe(true);
    });

    it("should have with-lock flag", () => {
      const runCmd = jobCommand.subCommands.run;
      expect(runCmd.args["with-lock"]).toBeDefined();
      expect(runCmd.args["with-lock"].type).toBe("boolean");
    });
  });

  describe("validate subcommand", () => {
    it("should be properly defined", () => {
      const validateCmd = jobCommand.subCommands.validate;
      expect(validateCmd).toBeDefined();
      expect(validateCmd.meta.name).toBe("validate");
    });

    it("should have all flag", () => {
      const validateCmd = jobCommand.subCommands.validate;
      expect(validateCmd.args.all).toBeDefined();
      expect(validateCmd.args.all.type).toBe("boolean");
    });
  });

  describe("status subcommand", () => {
    it("should be properly defined", () => {
      const statusCmd = jobCommand.subCommands.status;
      expect(statusCmd).toBeDefined();
      expect(statusCmd.meta.name).toBe("status");
    });

    it("should require jobId", () => {
      const statusCmd = jobCommand.subCommands.status;
      expect(statusCmd.args.jobId).toBeDefined();
      expect(statusCmd.args.jobId.required).toBe(true);
    });
  });

  describe("history subcommand", () => {
    it("should be properly defined", () => {
      const historyCmd = jobCommand.subCommands.history;
      expect(historyCmd).toBeDefined();
      expect(historyCmd.meta.name).toBe("history");
    });

    it("should have limit and status filters", () => {
      const historyCmd = jobCommand.subCommands.history;
      expect(historyCmd.args.limit).toBeDefined();
      expect(historyCmd.args.status).toBeDefined();
    });
  });

  describe("chain subcommand", () => {
    it("should be properly defined", () => {
      const chainCmd = jobCommand.subCommands.chain;
      expect(chainCmd).toBeDefined();
      expect(chainCmd.meta.name).toBe("chain");
      expect(chainCmd.meta.description).toContain("Chain");
    });

    it("should have jobs argument", () => {
      const chainCmd = jobCommand.subCommands.chain;
      expect(chainCmd.args.jobs).toBeDefined();
      expect(chainCmd.args.jobs.required).toBe(true);
    });
  });

  describe("search subcommand", () => {
    it("should be properly defined", () => {
      const searchCmd = jobCommand.subCommands.search;
      expect(searchCmd).toBeDefined();
      expect(searchCmd.meta.name).toBe("search");
    });

    it("should require query argument", () => {
      const searchCmd = jobCommand.subCommands.search;
      expect(searchCmd.args.query).toBeDefined();
      expect(searchCmd.args.query.required).toBe(true);
    });
  });
});

describe("Job Command Integration", () => {
  let context;

  beforeEach(() => {
    context = {
      cwd: process.cwd(),
      env: {
        TZ: "UTC",
        LANG: "C",
      },
    };
  });

  it("should list jobs using useJob composable", async () => {
    await withGitVan(context, async () => {
      const job = useJob();
      const jobs = await job.list();

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  it("should validate job structure", async () => {
    await withGitVan(context, async () => {
      const job = useJob();

      // Try to get a job that might exist
      const jobs = await job.list();

      if (jobs.length > 0) {
        const validation = await job.validate(jobs[0].id);
        expect(validation).toBeDefined();
        expect(validation.id).toBeDefined();
        expect(validation.valid).toBeDefined();
        expect(validation.errors).toBeDefined();
        expect(Array.isArray(validation.errors)).toBe(true);
      }
    });
  });
});
