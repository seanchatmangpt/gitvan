import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  runLocalCitty,
  setupCleanroom,
  runCitty,
  teardownCleanroom,
  scenario,
  testUtils,
} from "../../index.js";

describe("Integration Tests", () => {
  describe("Local Runner Integration", () => {
    it("should run GitVan CLI commands successfully", async () => {
      const result = await runLocalCitty(["--help"]);

      expect(result.result.exitCode).toBe(0);
      expect(result.result.stdout).toContain("USAGE");
      expect(result.result.stdout).toContain("gitvan");
      expect(result.result.stderr).toBe("");
    });

    it("should handle version command", async () => {
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

    it("should handle JSON output parsing", async () => {
      const result = await runLocalCitty(["--help"], { json: true });

      // Help command doesn't output JSON, so json should be undefined
      expect(result.result.json).toBeUndefined();
    });

    it("should respect timeout settings", async () => {
      const result = await runLocalCitty(["--help"], { timeout: 5000 });

      expect(result.result.exitCode).toBe(0);
    });
  });

  describe("Cleanroom Runner Integration", () => {
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

    it("should handle invalid commands in container", async () => {
      const result = await runCitty(["invalid-command"]);

      result.expectFailure();
    });

    it("should support fluent assertions in container", async () => {
      const result = await runCitty(["--help"]);

      result
        .expectSuccess()
        .expectOutput("USAGE")
        .expectOutput(/gitvan/)
        .expectNoStderr();
    });
  });

  describe("Scenario DSL Integration", () => {
    it("should execute complex scenarios", async () => {
      const testScenario = scenario("Complex CLI Test")
        .step("Get help information")
        .run(["--help"])
        .expect((result) => result.expectSuccess().expectOutput("USAGE"))

        .step("Get version information")
        .run(["--version"])
        .expect((result) =>
          result.expectSuccess().expectOutput(/^\d+\.\d+\.\d+$/)
        )

        .step("Test init command")
        .run(["init", "--help"])
        .expect((result) => result.expectSuccess());

      const results = await testScenario.execute(runLocalCitty);

      expect(results).toHaveLength(3);
      expect(results[0].step).toBe("Get help information");
      expect(results[1].step).toBe("Get version information");
      expect(results[2].step).toBe("Test init command");
    });

    it("should handle scenario failures gracefully", async () => {
      const testScenario = scenario("Failing Scenario")
        .step("Valid command")
        .run(["--help"])
        .expect((result) => result.expectSuccess())

        .step("Invalid command")
        .run(["invalid-command"])
        .expect((result) => result.expectSuccess()); // This should fail

      await expect(testScenario.execute(runLocalCitty)).rejects.toThrow();
    });
  });

  describe("Test Utils Integration", () => {
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
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return "success";
      };

      const result = await testUtils.retry(failingOperation, 3, 10);

      expect(result).toBe("success");
      expect(attempts).toBe(3);
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

  describe("Cross-Component Integration", () => {
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

    it("should integrate scenario DSL with both runners", async () => {
      const localScenario = scenario("Local Runner Scenario")
        .step("Help command")
        .run(["--help"])
        .expect((result) => result.expectSuccess());

      const localResults = await localScenario.execute(runLocalCitty);
      expect(localResults).toHaveLength(1);

      // Test with cleanroom runner
      await setupCleanroom({ rootDir: "/Users/sac/gitvan" });

      const cleanroomScenario = scenario("Cleanroom Runner Scenario")
        .step("Help command")
        .run(["--help"])
        .expect((result) => result.expectSuccess());

      const cleanroomResults = await cleanroomScenario.execute(runCitty);
      expect(cleanroomResults).toHaveLength(1);

      await teardownCleanroom();
    });

    it("should handle complex workflows with test utils", async () => {
      // Create a temporary config file
      const configFile = await testUtils.createTempFile(
        JSON.stringify({ test: true }),
        ".json"
      );

      try {
        // Test that we can read the config
        const { readFileSync } = await import("node:fs");
        const config = JSON.parse(readFileSync(configFile, "utf8"));
        expect(config.test).toBe(true);

        // Use scenario DSL to test CLI with config
        const scenario = scenario("Config Test")
          .step("Test with config")
          .run(["--help"])
          .expect((result) => result.expectSuccess());

        const results = await scenario.execute(runLocalCitty);
        expect(results).toHaveLength(1);
      } finally {
        await testUtils.cleanupTempFiles([configFile]);
      }
    });
  });
});
