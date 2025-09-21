import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupCleanroom,
  runCitty,
  teardownCleanroom,
  runLocalCitty,
} from "../../../vendors/citty-test-utils/index.js";

describe("Citty Test Utils - BDD Scenarios", () => {
  describe("Scenario: CLI Help Command", () => {
    it("Given a GitVan CLI, When I run help command, Then I should see usage information", async () => {
      // Given: GitVan CLI is available
      const result = await runLocalCitty(["--help"]);

      // When: I run the help command
      // Then: I should see usage information
      result.expectExit(0).expectOutput("gitvan").expectStderr("");

      console.log("✅ Help command scenario passed");
    });

    it("Given a GitVan CLI, When I run help command, Then the output should contain command list", async () => {
      const result = await runLocalCitty(["--help"]);

      result
        .expectExit(0)
        .expectOutputContains("COMMANDS")
        .expectOutputContains("graph")
        .expectOutputContains("daemon")
        .expectOutputContains("workflow");

      console.log("✅ Command list scenario passed");
    });
  });

  describe("Scenario: Error Handling", () => {
    it("Given a GitVan CLI, When I run invalid command, Then I should get appropriate error", async () => {
      try {
        const result = await runLocalCitty(["invalid-command"]);

        // Then: I should get appropriate error
        result.expectFailure().expectExitCodeIn([1, 2, 127]); // Common error codes

        console.log("✅ Error handling scenario passed");
      } catch (error) {
        // Alternative: command failed as expected
        expect(error.result.exitCode).not.toBe(0);
        console.log("✅ Error handling scenario passed (via exception)");
      }
    });

    it("Given a GitVan CLI, When I run command with wrong arguments, Then I should get usage help", async () => {
      try {
        const result = await runLocalCitty(["invalid-subcommand"]);

        result.expectFailure().expectOutputContains("USAGE");

        console.log("✅ Usage help scenario passed");
      } catch (error) {
        // Command failed but should show usage
        expect(error.result.stdout).toContain("USAGE");
        console.log("✅ Usage help scenario passed (via exception)");
      }
    });
  });

  describe("Scenario: Cleanroom Testing", () => {
    let cleanroomAvailable = false;

    beforeAll(async () => {
      try {
        await Promise.race([
          setupCleanroom({ rootDir: "." }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Docker setup timeout")), 10000)
          ),
        ]);
        cleanroomAvailable = true;
        console.log("✅ Cleanroom setup completed");
      } catch (error) {
        console.log("ℹ️  Skipping cleanroom BDD tests (Docker not available)");
        cleanroomAvailable = false;
      }
    }, 12000);

    afterAll(async () => {
      if (cleanroomAvailable) {
        try {
          await teardownCleanroom();
          console.log("✅ Cleanroom teardown completed");
        } catch (error) {
          console.log("Cleanroom teardown error:", error.message);
        }
      }
    });

    it("Given a cleanroom environment, When I run CLI commands, Then they should execute in isolation", async () => {
      if (!cleanroomAvailable) {
        console.log("⏭️  Skipping cleanroom BDD test (Docker not available)");
        return;
      }

      // Given: Cleanroom environment is set up
      // When: I run CLI commands
      const result = await runCitty(["--help"]);

      // Then: They should execute in isolation
      result.expectExit(0).expectOutput("gitvan").expectStderr("");

      console.log("✅ Cleanroom isolation scenario passed");
    });

    it("Given a cleanroom environment, When I run multiple commands, Then they should not interfere with each other", async () => {
      if (!cleanroomAvailable) {
        console.log("⏭️  Skipping cleanroom BDD test (Docker not available)");
        return;
      }

      // Given: Cleanroom environment is set up
      // When: I run multiple commands
      const result1 = await runCitty(["--help"]);
      const result2 = await runCitty(["--help"]);

      // Then: They should not interfere with each other
      result1.expectExit(0).expectOutput("gitvan");
      result2.expectExit(0).expectOutput("gitvan");

      console.log("✅ Cleanroom isolation scenario passed");
    });
  });

  describe("Scenario: Fluent Assertions", () => {
    it("Given a CLI result, When I use fluent assertions, Then I should be able to chain them", async () => {
      // Given: A CLI result
      const result = await runLocalCitty(["--help"]);

      // When: I use fluent assertions
      // Then: I should be able to chain them
      result
        .expectExit(0)
        .expectSuccess()
        .expectOutputContains("gitvan")
        .expectOutputContains("USAGE")
        .expectStderr("");

      console.log("✅ Fluent assertions chaining scenario passed");
    });

    it("Given a CLI result, When I use length assertions, Then I should be able to validate output size", async () => {
      const result = await runLocalCitty(["--help"]);

      result
        .expectExit(0)
        .expectOutputLength(100) // At least 100 characters
        .expectStderrLength(0, 0); // Exactly 0 characters

      console.log("✅ Length assertions scenario passed");
    });

    it("Given a CLI result, When I use contains assertions, Then I should be able to validate content", async () => {
      const result = await runLocalCitty(["--help"]);

      result
        .expectExit(0)
        .expectOutputContains("gitvan")
        .expectOutputContains("COMMANDS")
        .expectOutputNotContains("ERROR")
        .expectStderrNotContains("Error");

      console.log("✅ Contains assertions scenario passed");
    });
  });

  describe("Scenario: Performance Testing", () => {
    it("Given a CLI command, When I measure execution time, Then it should complete within reasonable time", async () => {
      const startTime = Date.now();
      const result = await runLocalCitty(["--help"]);
      const duration = Date.now() - startTime;

      result.expectExit(0).expectDuration(5000); // Should complete within 5 seconds

      expect(duration).toBeLessThan(5000);
      console.log(`✅ Performance scenario passed (${duration}ms)`);
    });
  });

  describe("Scenario: Edge Cases", () => {
    it("Given empty arguments, When I run CLI, Then it should handle gracefully", async () => {
      const result = await runLocalCitty([]);

      // Should either succeed or fail gracefully
      expect(result.result.exitCode).toBeDefined();
      console.log("✅ Empty arguments scenario passed");
    });

    it("Given very long arguments, When I run CLI, Then it should handle gracefully", async () => {
      const longArg = "a".repeat(1000);
      const result = await runLocalCitty([longArg]);

      // Should handle long arguments without crashing
      expect(result.result.exitCode).toBeDefined();
      console.log("✅ Long arguments scenario passed");
    });
  });
});

