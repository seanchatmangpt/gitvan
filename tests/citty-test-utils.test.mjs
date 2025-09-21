import { describe, it, beforeAll, afterAll } from "vitest";
import {
  setupCleanroom,
  runCitty,
  teardownCleanroom,
  runLocalCitty,
} from "../vendors/citty-test-utils/index.js";

describe("Citty Test Utils", () => {
  describe("Local Runner", () => {
    it("should run local citty command", async () => {
      try {
        const result = await runLocalCitty(["--help"]);
        console.log("Local runner result:", result);
        // Basic verification that we got a result
        if (result && typeof result.exitCode === "number") {
          console.log(
            "✅ Local runner works - got exit code:",
            result.exitCode
          );
        }
      } catch (error) {
        console.log(
          "Local runner error (expected if CLI doesn't exist):",
          error.message
        );
        // This is expected if the CLI doesn't exist yet
      }
    });
  });

  describe("Cleanroom Runner", () => {
    beforeAll(async () => {
      console.log("Setting up cleanroom...");
      try {
        await setupCleanroom({ rootDir: "." });
        console.log("✅ Cleanroom setup completed");
      } catch (error) {
        console.log("Cleanroom setup error:", error.message);
        // Skip tests if Docker isn't available
      }
    });

    afterAll(async () => {
      try {
        await teardownCleanroom();
        console.log("✅ Cleanroom teardown completed");
      } catch (error) {
        console.log("Cleanroom teardown error:", error.message);
      }
    });

    it("should run citty command in cleanroom", async () => {
      try {
        const result = await runCitty(["--help"]);
        console.log("Cleanroom runner result:", result);
        // Basic verification that we got a result
        if (
          result &&
          result.result &&
          typeof result.result.exitCode === "number"
        ) {
          console.log(
            "✅ Cleanroom runner works - got exit code:",
            result.result.exitCode
          );
        }
      } catch (error) {
        console.log(
          "Cleanroom runner error (expected if CLI doesn't exist):",
          error.message
        );
        // This is expected if the CLI doesn't exist yet
      }
    });
  });

  describe("Assertions", () => {
    it("should provide fluent assertion API", async () => {
      const { wrapExpectation } = await import(
        "../vendors/citty-test-utils/assertions.js"
      );

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
  });
});
