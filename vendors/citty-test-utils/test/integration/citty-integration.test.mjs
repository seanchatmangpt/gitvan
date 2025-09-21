// tests/integration/citty-integration.test.mjs
// Integration tests using citty directly to validate our testing utilities

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { defineCommand, runMain } from "citty";
import { runLocalCitty, runCitty, setupCleanroom, teardownCleanroom } from "../../index.js";

describe("Citty Integration Tests", () => {
  // Create a test CLI using citty
  const testCli = defineCommand({
    meta: {
      name: "test-cli",
      version: "1.0.0",
      description: "Test CLI for citty-test-utils integration testing"
    },
    args: {
      name: {
        type: "string",
        description: "Name to greet",
        default: "World"
      },
      verbose: {
        type: "boolean",
        description: "Enable verbose output",
        default: false
      },
      count: {
        type: "number",
        description: "Number of times to repeat",
        default: 1
      }
    },
    run: async (ctx) => {
      const { name, verbose, count } = ctx.args;
      
      if (verbose) {
        console.log("Verbose mode enabled");
      }
      
      for (let i = 0; i < count; i++) {
        console.log(`Hello, ${name}! (${i + 1}/${count})`);
      }
      
      if (ctx.args.json) {
        console.log(JSON.stringify({ 
          message: `Hello, ${name}!`, 
          count,
          verbose 
        }));
      }
    }
  });

  beforeAll(async () => {
    // Setup cleanroom for integration tests
    await setupCleanroom({ rootDir: ".", timeout: 60000 });
  }, 120000);

  afterAll(async () => {
    // Cleanup cleanroom
    await teardownCleanroom();
  }, 60000);

  describe("Local Runner Integration", () => {
    it("should test basic citty CLI commands locally", async () => {
      // Test basic help
      const helpResult = await runLocalCitty(["--help"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      expect(helpResult.exitCode).toBe(0);
      expect(helpResult.stdout).toContain("test-cli");
      expect(helpResult.stdout).toContain("USAGE");
    });

    it("should test version command", async () => {
      const versionResult = await runLocalCitty(["--version"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      expect(versionResult.exitCode).toBe(0);
      expect(versionResult.stdout).toMatch(/1\.0\.0/);
    });

    it("should test basic command execution", async () => {
      const result = await runLocalCitty(["John"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Hello, John!");
    });

    it("should test command with options", async () => {
      const result = await runLocalCitty(["Alice", "--verbose", "--count", "3"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Verbose mode enabled");
      expect(result.stdout).toContain("Hello, Alice! (1/3)");
      expect(result.stdout).toContain("Hello, Alice! (2/3)");
      expect(result.stdout).toContain("Hello, Alice! (3/3)");
    });

    it("should test JSON output", async () => {
      const result = await runLocalCitty(["Bob", "--json"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.json).toBeDefined();
      expect(result.json.message).toBe("Hello, Bob!");
      expect(result.json.count).toBe(1);
      expect(result.json.verbose).toBe(false);
    });

    it("should test invalid arguments", async () => {
      const result = await runLocalCitty(["--invalid-flag"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Unknown option");
    });
  });

  describe("Cleanroom Runner Integration", () => {
    it("should test basic citty CLI commands in cleanroom", async () => {
      const helpResult = await runCitty(["--help"], {
        env: { TEST_CLI: "true" }
      });
      
      expect(helpResult.exitCode).toBe(0);
      expect(helpResult.stdout).toContain("test-cli");
      expect(helpResult.stdout).toContain("USAGE");
    });

    it("should test version command in cleanroom", async () => {
      const versionResult = await runCitty(["--version"], {
        env: { TEST_CLI: "true" }
      });
      
      expect(versionResult.exitCode).toBe(0);
      expect(versionResult.stdout).toMatch(/1\.0\.0/);
    });

    it("should test command execution in cleanroom", async () => {
      const result = await runCitty(["Charlie"], {
        env: { TEST_CLI: "true" }
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Hello, Charlie!");
    });

    it("should test complex command in cleanroom", async () => {
      const result = await runCitty(["David", "--verbose", "--count", "2", "--json"], {
        env: { TEST_CLI: "true" }
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Verbose mode enabled");
      expect(result.stdout).toContain("Hello, David! (1/2)");
      expect(result.stdout).toContain("Hello, David! (2/2)");
      expect(result.json).toBeDefined();
      expect(result.json.message).toBe("Hello, David!");
      expect(result.json.count).toBe(2);
      expect(result.json.verbose).toBe(true);
    });
  });

  describe("Cross-Environment Consistency", () => {
    it("should produce consistent results between local and cleanroom", async () => {
      const localResult = await runLocalCitty(["Eve"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      const cleanroomResult = await runCitty(["Eve"], {
        env: { TEST_CLI: "true" }
      });
      
      expect(localResult.exitCode).toBe(cleanroomResult.exitCode);
      expect(localResult.stdout).toBe(cleanroomResult.stdout);
    });

    it("should handle JSON output consistently", async () => {
      const localResult = await runLocalCitty(["Frank", "--json"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      const cleanroomResult = await runCitty(["Frank", "--json"], {
        env: { TEST_CLI: "true" }
      });
      
      expect(localResult.exitCode).toBe(cleanroomResult.exitCode);
      expect(localResult.json).toEqual(cleanroomResult.json);
    });
  });

  describe("Fluent Assertions Integration", () => {
    it("should work with local runner assertions", async () => {
      const result = await runLocalCitty(["Grace"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      result
        .expectSuccess()
        .expectOutput(/Hello, Grace!/)
        .expectNoStderr();
    });

    it("should work with cleanroom runner assertions", async () => {
      const result = await runCitty(["Henry"], {
        env: { TEST_CLI: "true" }
      });
      
      result
        .expectSuccess()
        .expectOutput(/Hello, Henry!/)
        .expectNoStderr();
    });

    it("should handle JSON assertions", async () => {
      const result = await runLocalCitty(["Ivy", "--json"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      result
        .expectSuccess()
        .expectJson((json) => {
          expect(json.message).toBe("Hello, Ivy!");
          expect(json.count).toBe(1);
          expect(json.verbose).toBe(false);
        });
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid commands gracefully", async () => {
      // Note: Citty doesn't fail on unknown flags by default
      // This test verifies the command still runs successfully
      const result = await runLocalCitty(["--invalid-flag"], {
        cwd: process.cwd(),
        env: { TEST_CLI: "true" }
      });
      
      result
        .expectSuccess()
        .expectOutput(/Hello, World!/);
    });

    it("should handle invalid commands in cleanroom", async () => {
      // Note: Citty doesn't fail on unknown flags by default
      // This test verifies the command still runs successfully
      const result = await runCitty(["--invalid-flag"], {
        env: { TEST_CLI: "true" }
      });
      
      result
        .expectSuccess()
        .expectOutput(/Hello, World!/);
    });
  });
});
