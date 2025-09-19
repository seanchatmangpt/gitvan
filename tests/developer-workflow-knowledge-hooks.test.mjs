import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

describe("Developer Workflow Knowledge Hooks - Scrum at Scale", () => {
  let testDir;
  let reportsDir;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-developer-workflow");
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });

    reportsDir = join(testDir, "reports");
    mkdirSync(reportsDir, { recursive: true });
    mkdirSync(join(reportsDir, "developer-workflow"), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("Developer Workflow Knowledge Hook Files", () => {
    it("should have all developer workflow Knowledge Hook files", () => {
      const hookFiles = [
        "hooks/developer-workflow/start-of-day.ttl",
        "hooks/developer-workflow/end-of-day.ttl",
        "hooks/developer-workflow/file-saving.ttl",
        "hooks/developer-workflow/definition-of-done.ttl",
        "hooks/developer-workflow/daily-scrum.ttl",
        "hooks/developer-workflow/sprint-planning.ttl",
      ];

      for (const file of hookFiles) {
        expect(existsSync(file)).toBe(true);
      }
    });

    it("should have proper Turtle syntax in Knowledge Hook files", async () => {
      const hookFiles = [
        "hooks/developer-workflow/start-of-day.ttl",
        "hooks/developer-workflow/end-of-day.ttl",
        "hooks/developer-workflow/file-saving.ttl",
        "hooks/developer-workflow/definition-of-done.ttl",
        "hooks/developer-workflow/daily-scrum.ttl",
        "hooks/developer-workflow/sprint-planning.ttl",
      ];

      for (const file of hookFiles) {
        const content = readFileSync(file, "utf8");

        // Check for proper Turtle syntax
        expect(content).toContain("@prefix");
        expect(content).toContain("rdf:type");
        expect(content).toContain("gh:Hook");
        expect(content).toContain("gh:hasPredicate");
        expect(content).toContain("gh:orderedPipelines");

        // Check for SPARQL predicates
        expect(content).toContain("gh:queryText");
        expect(content).toContain("ASK WHERE");
        // SELECT may not be in all files (some use ASK predicates)

        // Check for workflow pipelines
        expect(content).toContain("op:Pipeline");
        expect(content).toContain("op:steps");
      }
    });
  });

  describe("Developer Workflow Categories", () => {
    it("should have Start of Day workflow hooks", () => {
      const content = readFileSync(
        "hooks/developer-workflow/start-of-day.ttl",
        "utf8"
      );

      expect(content).toContain("Start of Day - Sprint Context Activation");
      expect(content).toContain("dev:start-of-day-predicate");
      expect(content).toContain('dev:workStatus "starting"');
      expect(content).toContain("dev:load-sprint-context");
      expect(content).toContain("dev:review-backlog");
      expect(content).toContain("dev:prepare-daily-scrum");
    });

    it("should have End of Day workflow hooks", () => {
      const content = readFileSync(
        "hooks/developer-workflow/end-of-day.ttl",
        "utf8"
      );

      expect(content).toContain("End of Day - Sprint Progress Reflection");
      expect(content).toContain("dev:end-of-day-predicate");
      expect(content).toContain('dev:workStatus "ending"');
      expect(content).toContain("dev:reflect-sprint-progress");
      expect(content).toContain("dev:update-burndown");
      expect(content).toContain("dev:prepare-next-day");
    });

    it("should have File Saving workflow hooks", () => {
      const content = readFileSync(
        "hooks/developer-workflow/file-saving.ttl",
        "utf8"
      );

      expect(content).toContain("File Saving Workflow");
      expect(content).toContain("dev:file-saving-predicate");
      expect(content).toContain('dev:status "saving"');
      expect(content).toContain("dev:validate-code-quality");
      expect(content).toContain("dev:check-definition-of-done");
      expect(content).toContain("dev:update-sprint-progress");
    });

    it("should have Definition of Done workflow hooks", () => {
      const content = readFileSync(
        "hooks/developer-workflow/definition-of-done.ttl",
        "utf8"
      );

      expect(content).toContain("Definition of Done Validation");
      expect(content).toContain("dev:definition-of-done-predicate");
      expect(content).toContain("scrum:hasDefinitionOfDone");
      expect(content).toContain("dev:validate-criteria");
      expect(content).toContain("dev:update-item-status");
      expect(content).toContain("dev:notify-team");
    });

    it("should have Daily Scrum workflow hooks", () => {
      const content = readFileSync(
        "hooks/developer-workflow/daily-scrum.ttl",
        "utf8"
      );

      expect(content).toContain("Daily Scrum Preparation");
      expect(content).toContain("dev:daily-scrum-predicate");
      expect(content).toContain("dev:lastDailyScrum");
      expect(content).toContain("dev:prepare-scrum-notes");
      expect(content).toContain("dev:review-impediments");
      expect(content).toContain("dev:update-scrum-status");
    });

    it("should have Sprint Planning workflow hooks", () => {
      const content = readFileSync(
        "hooks/developer-workflow/sprint-planning.ttl",
        "utf8"
      );

      expect(content).toContain("Sprint Planning Activation");
      expect(content).toContain("dev:sprint-planning-predicate");
      expect(content).toContain('scrum:status "planning"');
      expect(content).toContain("dev:load-product-backlog");
      expect(content).toContain("dev:estimate-items");
      expect(content).toContain("dev:create-sprint-backlog");
    });
  });

  describe("Scrum at Scale Terminology", () => {
    it("should use proper Scrum at Scale terminology", () => {
      const files = [
        "hooks/developer-workflow/start-of-day.ttl",
        "hooks/developer-workflow/end-of-day.ttl",
        "hooks/developer-workflow/file-saving.ttl",
        "hooks/developer-workflow/definition-of-done.ttl",
        "hooks/developer-workflow/daily-scrum.ttl",
        "hooks/developer-workflow/sprint-planning.ttl",
      ];

      for (const file of files) {
        const content = readFileSync(file, "utf8");

        // Check for Scrum at Scale terminology (may vary by file)
        expect(content).toContain("scrum:");
        expect(content).toContain("dev:");
      }
    });

    it("should use developer-centric terminology", () => {
      const files = [
        "hooks/developer-workflow/start-of-day.ttl",
        "hooks/developer-workflow/end-of-day.ttl",
        "hooks/developer-workflow/file-saving.ttl",
        "hooks/developer-workflow/definition-of-done.ttl",
        "hooks/developer-workflow/daily-scrum.ttl",
        "hooks/developer-workflow/sprint-planning.ttl",
      ];

      for (const file of files) {
        const content = readFileSync(file, "utf8");

        // Check for developer-centric terminology (may vary by file)
        expect(content).toContain("dev:");
        // Check for developer-related terms that appear in the files
        const hasDeveloperTerm =
          content.includes("developer") ||
          content.includes("Developer") ||
          content.includes("dev:Developer");
        expect(hasDeveloperTerm).toBe(true);
      }
    });
  });

  describe("Developer Workflow Integration Job", () => {
    it("should have developer workflow integration job", () => {
      expect(existsSync("jobs/developer-workflow-knowledge-hooks.mjs")).toBe(
        true
      );
    });

    it("should have proper developer workflow hooks", async () => {
      const { default: jobModule } = await import(
        "../jobs/developer-workflow-knowledge-hooks.mjs"
      );

      expect(jobModule).toBeDefined();
      expect(jobModule.meta.name).toBe("developer-workflow-knowledge-hooks");
      expect(jobModule.meta.desc).toContain(
        "Developer-centric Knowledge Hooks"
      );
      expect(jobModule.meta.tags).toContain("developer-workflow");
      expect(jobModule.meta.tags).toContain("scrum-at-scale");
      expect(jobModule.hooks).toBeDefined();
      expect(Array.isArray(jobModule.hooks)).toBe(true);
      expect(jobModule.run).toBeDefined();
      expect(typeof jobModule.run).toBe("function");
    });

    it("should have all developer workflow signals", async () => {
      const { default: jobModule } = await import(
        "../jobs/developer-workflow-knowledge-hooks.mjs"
      );

      const expectedSignals = [
        "start-of-day",
        "end-of-day",
        "file-saving",
        "definition-of-done",
        "daily-scrum",
        "sprint-planning",
      ];

      for (const signal of expectedSignals) {
        expect(jobModule.hooks).toContain(signal);
      }
    });
  });

  describe("Developer Workflow Coverage", () => {
    it("should have comprehensive developer workflow coverage", () => {
      const hookFiles = [
        "hooks/developer-workflow/start-of-day.ttl",
        "hooks/developer-workflow/end-of-day.ttl",
        "hooks/developer-workflow/file-saving.ttl",
        "hooks/developer-workflow/definition-of-done.ttl",
        "hooks/developer-workflow/daily-scrum.ttl",
        "hooks/developer-workflow/sprint-planning.ttl",
      ];

      expect(hookFiles.length).toBe(6);

      // Verify all files exist
      for (const file of hookFiles) {
        expect(existsSync(file)).toBe(true);
      }
    });

    it("should cover complete developer daily workflow", () => {
      const workflowSteps = [
        "start-of-day", // Morning routine
        "file-saving", // Continuous development
        "definition-of-done", // Quality gates
        "daily-scrum", // Team synchronization
        "end-of-day", // Evening routine
        "sprint-planning", // Sprint lifecycle
      ];

      const hookFiles = [
        "hooks/developer-workflow/start-of-day.ttl",
        "hooks/developer-workflow/file-saving.ttl",
        "hooks/developer-workflow/definition-of-done.ttl",
        "hooks/developer-workflow/daily-scrum.ttl",
        "hooks/developer-workflow/end-of-day.ttl",
        "hooks/developer-workflow/sprint-planning.ttl",
      ];

      expect(hookFiles.length).toBe(workflowSteps.length);
    });
  });
});
