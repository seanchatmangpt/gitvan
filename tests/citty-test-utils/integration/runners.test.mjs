import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupCleanroom,
  runCitty,
  teardownCleanroom,
  runLocalCitty,
} from "../../../vendors/citty-test-utils/index.js";

describe("Citty Test Utils - Integration Tests", () => {
  describe("Local vs Cleanroom Consistency", () => {
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
        console.log("ℹ️  Skipping cleanroom tests (Docker not available)");
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

    it("should provide consistent API between local and cleanroom runners", async () => {
      const localResult = await runLocalCitty(["--help"]);

      expect(localResult.result).toBeDefined();
      expect(localResult.expectExit).toBeDefined();
      expect(localResult.expectOutput).toBeDefined();
      expect(localResult.expectStderr).toBeDefined();

      if (cleanroomAvailable) {
        const cleanroomResult = await runCitty(["--help"]);

        expect(cleanroomResult.result).toBeDefined();
        expect(cleanroomResult.expectExit).toBeDefined();
        expect(cleanroomResult.expectOutput).toBeDefined();
        expect(cleanroomResult.expectStderr).toBeDefined();

        // Both should have the same API structure
        expect(Object.keys(localResult)).toEqual(Object.keys(cleanroomResult));
      }
    });

    it("should handle command execution consistently", async () => {
      const localResult = await runLocalCitty(["--help"]);

      expect(localResult.result.exitCode).toBeDefined();
      expect(localResult.result.args).toEqual(["--help"]);
      expect(localResult.result.cwd).toBeDefined();

      if (cleanroomAvailable) {
        const cleanroomResult = await runCitty(["--help"]);

        expect(cleanroomResult.result.exitCode).toBeDefined();
        expect(cleanroomResult.result.args).toEqual(["--help"]);
        expect(cleanroomResult.result.cwd).toBeDefined();
      }
    });

    it("should handle fluent assertions consistently", async () => {
      const localResult = await runLocalCitty(["--help"]);

      // Test fluent chaining
      const chained = localResult
        .expectExit(0)
        .expectOutput("gitvan")
        .expectStderr("");

      expect(chained).toBe(localResult);

      if (cleanroomAvailable) {
        const cleanroomResult = await runCitty(["--help"]);

        const cleanroomChained = cleanroomResult
          .expectExit(0)
          .expectOutput("gitvan")
          .expectStderr("");

        expect(cleanroomChained).toBe(cleanroomResult);
      }
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid commands gracefully", async () => {
      try {
        const result = await runLocalCitty([
          "invalid-command-that-does-not-exist",
        ]);
        expect(result.result.exitCode).not.toBe(0);
      } catch (error) {
        expect(error.result).toBeDefined();
        expect(error.result.exitCode).not.toBe(0);
      }
    });

    it("should provide meaningful error messages", async () => {
      try {
        const result = await runLocalCitty(["invalid-command"]);
        result.expectExit(0);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error.message).toContain("Expected exit code 0");
        expect(error.message).toContain("Command: node src/cli.mjs");
      }
    });
  });

  describe("JSON Output Integration", () => {
    it("should handle JSON parsing in both runners", async () => {
      const localResult = await runLocalCitty(["--help"], { json: true });

      // Should not throw even if output isn't JSON
      expect(localResult.result.json).toBeUndefined();

      if (cleanroomAvailable) {
        const cleanroomResult = await runCitty(["--help"], { json: true });
        expect(cleanroomResult.result.json).toBeUndefined();
      }
    });
  });

  describe("Timeout Integration", () => {
    it("should handle timeouts consistently", async () => {
      try {
        await runLocalCitty(["sleep", "5"], { timeout: 100 });
        expect.fail("Should have timed out");
      } catch (error) {
        expect(error.message).toContain("timed out");
      }
    });
  });
});

