import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  runLocalCitty,
  setupCleanroom,
  runCitty,
  teardownCleanroom,
  scenario,
  testUtils,
} from "../index.js";

describe("Citty Test Utils - Working Test Suite", () => {
  describe("Local Runner Tests", () => {
    it("should run help command successfully", async () => {
      const result = await runLocalCitty(["--help"]);

      expect(result.result.exitCode).toBe(0);
      expect(result.result.stdout).toContain("USAGE");
      expect(result.result.stdout).toContain("gitvan");
    });

    it("should run version command", async () => {
      const result = await runLocalCitty(["--version"]);

      expect(result.result.exitCode).toBe(0);
      expect(result.result.stdout).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("should handle invalid commands gracefully", async () => {
      const result = await runLocalCitty(["invalid-command"]);

      expect(result.result.exitCode).not.toBe(0);
      expect(result.result.stderr).toContain("Unknown command");
    });

    it("should support fluent assertions", async () => {
      const result = await runLocalCitty(["--help"]);

      result
        .expectSuccess()
        .expectOutput("USAGE")
        .expectOutput(/gitvan/)
        .expectNoStderr()
        .expectOutputLength(100, 5000);
    });
  });

  describe("Cleanroom Runner Tests", () => {
    beforeAll(async () => {
      await setupCleanroom({ rootDir: "/Users/sac/gitvan" });
    });

    afterAll(async () => {
      await teardownCleanroom();
    });

    it("should run commands in Docker container", async () => {
      const result = await runCitty(["--help"]);

      result.expectSuccess().expectOutput("USAGE");
    });

    it("should handle multiple commands in same container", async () => {
      const helpResult = await runCitty(["--help"]);
      helpResult.expectSuccess().expectOutput("USAGE");

      const versionResult = await runCitty(["--version"]);
      versionResult.expectSuccess().expectOutput(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("Scenario DSL Tests", () => {
    it("should execute simple scenarios", async () => {
      const testScenario = scenario("Simple Test")
        .step("Get help")
        .run(["--help"])
        .expect((result) => result.expectSuccess().expectOutput("USAGE"))

        .step("Get version")
        .run(["--version"])
        .expect((result) =>
          result.expectSuccess().expectOutput(/^\d+\.\d+\.\d+$/)
        );

      const results = await testScenario.execute(runLocalCitty);

      expect(results).toHaveLength(2);
      expect(results[0].step).toBe("Get help");
      expect(results[1].step).toBe("Get version");
    });
  });

  describe("Test Utils Tests", () => {
    it("should create and cleanup temporary files", async () => {
      const tempFile = await testUtils.createTempFile("test content", ".txt");

      expect(tempFile).toContain("citty-test-");

      const { readFileSync, existsSync } = await import("node:fs");
      expect(existsSync(tempFile)).toBe(true);

      const content = readFileSync(tempFile, "utf8");
      expect(content).toBe("test content");

      await testUtils.cleanupTempFiles([tempFile]);
      expect(existsSync(tempFile)).toBe(false);
    });

    it("should retry failed operations", async () => {
      let attempts = 0;
      const failingOperation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return "success";
      };

      const result = await testUtils.retry(failingOperation, 3, 10);

      expect(result).toBe("success");
      expect(attempts).toBe(2);
    });

    it("should wait for conditions", async () => {
      let conditionMet = false;
      setTimeout(() => {
        conditionMet = true;
      }, 50);

      const result = await testUtils.waitFor(() => conditionMet, 1000, 10);

      expect(result).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should work with both local and cleanroom runners", async () => {
      // Test local runner
      const localResult = await runLocalCitty(["--help"]);
      localResult.expectSuccess().expectOutput("USAGE");

      // Test cleanroom runner
      await setupCleanroom({ rootDir: "/Users/sac/gitvan" });
      const cleanroomResult = await runCitty(["--help"]);
      cleanroomResult.expectSuccess().expectOutput("USAGE");
      await teardownCleanroom();
    });

    it("should handle complex workflows", async () => {
      const tempFile = await testUtils.createTempFile(
        JSON.stringify({ test: true }),
        ".json"
      );

      try {
        const { readFileSync } = await import("node:fs");
        const config = JSON.parse(readFileSync(tempFile, "utf8"));
        expect(config.test).toBe(true);

        const workflowScenario = scenario("Complex Workflow")
          .step("Test with config")
          .run(["--help"])
          .expect((result) => result.expectSuccess());

        const results = await workflowScenario.execute(runLocalCitty);
        expect(results).toHaveLength(1);
      } finally {
        await testUtils.cleanupTempFiles([tempFile]);
      }
    });
  });
});
