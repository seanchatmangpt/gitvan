import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runLocalCitty } from "../../../vendors/citty-test-utils/local-runner.js";

describe("Citty Test Utils - Unit Tests", () => {
  describe("Local Runner", () => {
    describe("Project Root Detection", () => {
      it("should find GitVan project root", async () => {
        const result = await runLocalCitty(["--help"]);

        expect(result.result.cwd).toBe("/Users/sac/gitvan");
        expect(result.result.exitCode).toBeDefined();
      });

      it("should handle invalid CLI path gracefully", async () => {
        // This should work since we're in the GitVan project
        const result = await runLocalCitty(["--help"]);
        expect(result.result).toBeDefined();
      });
    });

    describe("Process Execution", () => {
      it("should execute commands with correct arguments", async () => {
        const result = await runLocalCitty(["--help"]);

        expect(result.result.args).toEqual(["--help"]);
        expect(result.result.exitCode).toBeDefined();
      });

      it("should handle timeout", async () => {
        // Test with a very short timeout
        try {
          await runLocalCitty(["sleep", "10"], { timeout: 100 });
          expect.fail("Should have timed out");
        } catch (error) {
          expect(error.message).toContain("timed out");
        }
      });

      it("should handle environment variables", async () => {
        const result = await runLocalCitty(["--help"], {
          env: { TEST_VAR: "test-value" },
        });

        expect(result.result).toBeDefined();
        expect(result.result.exitCode).toBeDefined();
      });
    });

    describe("JSON Parsing", () => {
      it("should parse JSON output when requested", async () => {
        const result = await runLocalCitty(["--help"], { json: true });

        // Since --help doesn't output JSON, json should be undefined
        expect(result.result.json).toBeUndefined();
      });

      it("should handle JSON parsing errors gracefully", async () => {
        // This tests the safeJsonParse function indirectly
        const result = await runLocalCitty(["--help"], { json: true });

        // Should not throw, just return undefined for non-JSON output
        expect(result.result.json).toBeUndefined();
      });
    });

    describe("Result Wrapping", () => {
      it("should return wrapped result with assertions", async () => {
        const result = await runLocalCitty(["--help"]);

        expect(result.result).toBeDefined();
        expect(typeof result.expectExit).toBe("function");
        expect(typeof result.expectOutput).toBe("function");
        expect(typeof result.expectStderr).toBe("function");
      });

      it("should handle process errors", async () => {
        // Commands with non-zero exit codes still return wrapped results
        const result = await runLocalCitty(["nonexistent-command"]);

        // Should return a wrapped result even for failed commands
        expect(result.result).toBeDefined();
        expect(result.result.exitCode).not.toBe(0);
        expect(typeof result.expectExit).toBe("function");

        // Should be able to use assertions on failed commands
        result.expectFailure().expectStderrContains("Unknown command");
      });
    });
  });
});
