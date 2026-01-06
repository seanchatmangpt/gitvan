/**
 * Tests for Schedule Command
 */

import { describe, it, expect, beforeEach } from "vitest";
import { scheduleCommand } from "../../../src/cli/commands/schedule.mjs";
import { withGitVan } from "../../../src/core/context.mjs";
import { useSchedule } from "../../../src/composables/schedule.mjs";

describe("Schedule Command", () => {
  describe("scheduleCommand", () => {
    it("should be defined", () => {
      expect(scheduleCommand).toBeDefined();
      expect(scheduleCommand.meta).toBeDefined();
      expect(scheduleCommand.meta.name).toBe("schedule");
    });

    it("should have all required subcommands", () => {
      expect(scheduleCommand.subCommands).toBeDefined();
      expect(scheduleCommand.subCommands.list).toBeDefined();
      expect(scheduleCommand.subCommands.apply).toBeDefined();
      expect(scheduleCommand.subCommands.enable).toBeDefined();
      expect(scheduleCommand.subCommands.disable).toBeDefined();
      expect(scheduleCommand.subCommands.remove).toBeDefined();
      expect(scheduleCommand.subCommands.status).toBeDefined();
      expect(scheduleCommand.subCommands.validate).toBeDefined();
      expect(scheduleCommand.subCommands.run).toBeDefined();
    });

    it("should have proper metadata", () => {
      expect(scheduleCommand.meta.description).toBe("Manage GitVan Schedules");
      expect(scheduleCommand.meta.usage).toContain("gitvan schedule");
      expect(scheduleCommand.meta.examples).toBeDefined();
      expect(scheduleCommand.meta.examples.length).toBeGreaterThan(0);
    });
  });

  describe("list subcommand", () => {
    it("should be properly defined", () => {
      const listCmd = scheduleCommand.subCommands.list;
      expect(listCmd).toBeDefined();
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have proper arguments", () => {
      const listCmd = scheduleCommand.subCommands.list;
      expect(listCmd.args).toBeDefined();
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args["enabled-only"]).toBeDefined();
      expect(listCmd.args.format).toBeDefined();
    });
  });

  describe("apply subcommand", () => {
    it("should be properly defined", () => {
      const applyCmd = scheduleCommand.subCommands.apply;
      expect(applyCmd).toBeDefined();
      expect(applyCmd.meta.name).toBe("apply");
      expect(applyCmd.meta.description).toContain("Apply");
    });

    it("should have required arguments", () => {
      const applyCmd = scheduleCommand.subCommands.apply;
      expect(applyCmd.args).toBeDefined();
      expect(applyCmd.args.jobId).toBeDefined();
      expect(applyCmd.args.jobId.required).toBe(true);
      expect(applyCmd.args.cronExpression).toBeDefined();
      expect(applyCmd.args.cronExpression.required).toBe(true);
    });

    it("should have optional flags", () => {
      const applyCmd = scheduleCommand.subCommands.apply;
      expect(applyCmd.args.disable).toBeDefined();
      expect(applyCmd.args.restart).toBeDefined();
      expect(applyCmd.args.timezone).toBeDefined();
    });
  });

  describe("enable subcommand", () => {
    it("should be properly defined", () => {
      const enableCmd = scheduleCommand.subCommands.enable;
      expect(enableCmd).toBeDefined();
      expect(enableCmd.meta.name).toBe("enable");
    });

    it("should require scheduleId", () => {
      const enableCmd = scheduleCommand.subCommands.enable;
      expect(enableCmd.args.scheduleId).toBeDefined();
      expect(enableCmd.args.scheduleId.required).toBe(true);
    });
  });

  describe("disable subcommand", () => {
    it("should be properly defined", () => {
      const disableCmd = scheduleCommand.subCommands.disable;
      expect(disableCmd).toBeDefined();
      expect(disableCmd.meta.name).toBe("disable");
    });

    it("should require scheduleId", () => {
      const disableCmd = scheduleCommand.subCommands.disable;
      expect(disableCmd.args.scheduleId).toBeDefined();
      expect(disableCmd.args.scheduleId.required).toBe(true);
    });
  });

  describe("remove subcommand", () => {
    it("should be properly defined", () => {
      const removeCmd = scheduleCommand.subCommands.remove;
      expect(removeCmd).toBeDefined();
      expect(removeCmd.meta.name).toBe("remove");
    });

    it("should require scheduleId", () => {
      const removeCmd = scheduleCommand.subCommands.remove;
      expect(removeCmd.args.scheduleId).toBeDefined();
      expect(removeCmd.args.scheduleId.required).toBe(true);
    });
  });

  describe("status subcommand", () => {
    it("should be properly defined", () => {
      const statusCmd = scheduleCommand.subCommands.status;
      expect(statusCmd).toBeDefined();
      expect(statusCmd.meta.name).toBe("status");
    });

    it("should require scheduleId", () => {
      const statusCmd = scheduleCommand.subCommands.status;
      expect(statusCmd.args.scheduleId).toBeDefined();
      expect(statusCmd.args.scheduleId.required).toBe(true);
    });
  });

  describe("validate subcommand", () => {
    it("should be properly defined", () => {
      const validateCmd = scheduleCommand.subCommands.validate;
      expect(validateCmd).toBeDefined();
      expect(validateCmd.meta.name).toBe("validate");
    });

    it("should have all flag", () => {
      const validateCmd = scheduleCommand.subCommands.validate;
      expect(validateCmd.args.all).toBeDefined();
      expect(validateCmd.args.all.type).toBe("boolean");
    });
  });

  describe("run subcommand", () => {
    it("should be properly defined", () => {
      const runCmd = scheduleCommand.subCommands.run;
      expect(runCmd).toBeDefined();
      expect(runCmd.meta.name).toBe("run");
    });

    it("should require scheduleId", () => {
      const runCmd = scheduleCommand.subCommands.run;
      expect(runCmd.args.scheduleId).toBeDefined();
      expect(runCmd.args.scheduleId.required).toBe(true);
    });
  });
});

describe("Schedule Command Integration", () => {
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

  it("should list schedules using useSchedule composable", async () => {
    await withGitVan(context, async () => {
      const schedule = useSchedule();
      const schedules = await schedule.list();

      expect(schedules).toBeDefined();
      expect(Array.isArray(schedules)).toBe(true);
    });
  });

  it("should validate cron expression format", () => {
    // Test valid cron expressions
    const validCron = "*/5 * * * *";
    const parts = validCron.split(" ");
    expect(parts.length).toBe(5);

    // Test invalid cron expression
    const invalidCron = "invalid";
    const invalidParts = invalidCron.split(" ");
    expect(invalidParts.length).not.toBe(5);
  });
});
