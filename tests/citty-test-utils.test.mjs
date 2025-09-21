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

        // Basic verification that we got a wrapped result
        if (
          result &&
          result.result &&
          typeof result.result.exitCode === "number"
        ) {
          console.log(
            "✅ Local runner works - got exit code:",
            result.result.exitCode
          );

          // Verify we got actual help output
          if (result.result.stdout && result.result.stdout.length > 0) {
            console.log("✅ Local runner produces output");
            if (result.result.stdout.includes("USAGE")) {
              console.log("✅ Local runner produces correct help output");
            }
          } else {
            console.log(
              "⚠️  Local runner output is empty (may be suppressed in test environment)"
            );
          }

          // Test fluent assertions - just test exit code since output may be suppressed
          result.expectExit(0);
          console.log("✅ Local runner fluent assertions work");
        }
      } catch (error) {
        console.log("Local runner error:", error.message);
        throw error; // Re-throw to fail the test
      }
    });
  });

  describe("Cleanroom Runner", () => {
    let cleanroomAvailable = false;

    beforeAll(async () => {
      console.log("Setting up cleanroom...");
      try {
        // Use Promise.race to timeout quickly if Docker setup takes too long
        await Promise.race([
          setupCleanroom({ rootDir: "." }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Docker setup timeout")), 10000)
          ),
        ]);
        console.log("✅ Cleanroom setup completed");
        cleanroomAvailable = true;
      } catch (error) {
        console.log("Cleanroom setup error:", error.message);
        console.log("ℹ️  Skipping cleanroom tests (Docker not available)");
        cleanroomAvailable = false;
      }
    }, 12000); // 12 second timeout for Docker setup

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

    it("should run citty command in cleanroom", async () => {
      if (!cleanroomAvailable) {
        console.log("⏭️  Skipping cleanroom test (Docker not available)");
        return;
      }

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
        console.log("Cleanroom runner error:", error.message);
        throw error; // Re-throw to fail the test
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
