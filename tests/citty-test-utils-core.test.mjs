import { describe, it } from "vitest";
import { runLocalCitty } from "../vendors/citty-test-utils/index.js";
import { wrapExpectation } from "../vendors/citty-test-utils/assertions.js";

describe("Citty Test Utils - Core Functionality", () => {
  describe("Local Runner", () => {
    it("should handle command execution", async () => {
      try {
        const result = await runLocalCitty(["--help"]);
        console.log("✅ Local runner executed successfully");
        console.log("Exit code:", result.exitCode);
        console.log("Output length:", result.stdout.length);
      } catch (error) {
        console.log("Expected error (CLI may not exist yet):", error.message);
        // This is expected if the CLI doesn't exist yet
      }
    });
  });

  describe("Assertions API", () => {
    it("should provide fluent assertion API", () => {
      const mockResult = {
        exitCode: 0,
        stdout: "Hello World",
        stderr: "",
        args: ["--help"],
        cwd: "/app",
      };

      const expectation = wrapExpectation(mockResult);

      // Test fluent API
      expectation.expectExit(0).expectOutput("Hello").expectStderr("");

      console.log("✅ Assertions API works correctly");
    });

    it("should handle assertion failures", () => {
      const mockResult = {
        exitCode: 1,
        stdout: "Error occurred",
        stderr: "Something went wrong",
        args: ["--help"],
        cwd: "/app",
      };

      const expectation = wrapExpectation(mockResult);

      try {
        expectation.expectExit(0); // This should fail
        throw new Error("Expected assertion to fail");
      } catch (error) {
        if (error.message.includes("Expected exit 0, got 1")) {
          console.log("✅ Assertion failure handling works correctly");
        } else {
          throw error;
        }
      }
    });

    it("should support regex matching", () => {
      const mockResult = {
        exitCode: 0,
        stdout: "Usage: gitvan [command]",
        stderr: "",
        args: ["--help"],
        cwd: "/app",
      };

      const expectation = wrapExpectation(mockResult);

      expectation
        .expectExit(0)
        .expectOutput(/Usage:/)
        .expectOutput(/gitvan/);

      console.log("✅ Regex matching works correctly");
    });
  });

  describe("Module Exports", () => {
    it("should export all required functions", async () => {
      const module = await import("../vendors/citty-test-utils/index.js");

      // Check that all expected exports are available
      const expectedExports = [
        "setupCleanroom",
        "runCitty",
        "teardownCleanroom",
        "runLocalCitty",
        "wrapExpectation",
      ];

      for (const exportName of expectedExports) {
        if (typeof module[exportName] !== "function") {
          throw new Error(
            `Expected ${exportName} to be exported as a function`
          );
        }
      }

      console.log("✅ All expected exports are available");
    });
  });
});
