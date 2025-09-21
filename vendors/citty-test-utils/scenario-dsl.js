// Scenario DSL for building complex test scenarios
import { runCitty, runLocalCitty } from "./index.js";

export function scenario(name) {
  const steps = [];
  let currentStep = null;

  const builder = {
    step(description, action = null) {
      currentStep = {
        description,
        command: null,
        action: null,
        expectations: [],
      };
      steps.push(currentStep);

      if (action) {
        currentStep.action = action;
      }
      return this;
    },

    run(args, options = {}) {
      if (!currentStep) {
        throw new Error("Must call step() before run()");
      }
      // Convert string to array if needed
      const commandArgs = Array.isArray(args) ? args : args.split(" ");
      currentStep.command = { args: commandArgs, options };
      return this;
    },

    runCommand(command) {
      if (!currentStep) {
        throw new Error("Must call step() before runCommand()");
      }
      const args = typeof command === "string" ? command.split(" ") : command;
      currentStep.command = { args, options: {} };
      return this;
    },

    expect(expectationFn) {
      if (!currentStep) {
        throw new Error("Must call step() before expect()");
      }
      currentStep.expectations.push(expectationFn);
      return this;
    },

    async execute(runner = "local") {
      const results = [];
      let lastResult = null;

      for (const step of steps) {
        if (!step.command && !step.action) {
          throw new Error(
            `Step "${step.description}" has no command or action`
          );
        }

        console.log(`🔄 Executing: ${step.description}`);

        try {
          let result;

          if (step.action) {
            // Execute custom action
            result = await step.action({ lastResult, context: {} });
          } else {
            // Execute the command
            result =
              runner === "cleanroom"
                ? await runCitty(step.command.args, step.command.options)
                : await runLocalCitty(step.command.args, step.command.options);
          }

          lastResult = result;

          // Apply expectations
          for (const expectation of step.expectations) {
            try {
              expectation(result);
            } catch (error) {
              console.log(
                `❌ Expectation failed in step "${step.description}": ${error.message}`
              );
              throw error;
            }
          }

          results.push({ step: step.description, result, success: true });
          console.log(`✅ Step completed: ${step.description}`);
        } catch (error) {
          console.log(`❌ Step failed: ${step.description} - ${error.message}`);
          results.push({
            step: step.description,
            error: error.message,
            success: false,
          });
          throw error;
        }
      }

      return {
        scenario: name,
        results,
        success: results.every((r) => r.success),
        lastResult,
      };
    },

    // Convenience methods
    expectSuccess() {
      return this.expect((result) => result.expectSuccess());
    },

    expectFailure() {
      return this.expect((result) => result.expectFailure());
    },

    expectExit(code) {
      return this.expect((result) => result.expectExit(code));
    },

    expectOutput(match) {
      return this.expect((result) => result.expectOutput(match));
    },

    expectStderr(match) {
      return this.expect((result) => result.expectStderr(match));
    },

    expectNoOutput() {
      return this.expect((result) => result.expectNoOutput());
    },

    expectNoStderr() {
      return this.expect((result) => result.expectNoStderr());
    },

    expectJson(validator) {
      return this.expect((result) => result.expectJson(validator));
    },
  };

  return builder;
}

// Utility functions for common test patterns
export const testUtils = {
  // Wait for a condition to be true
  async waitFor(conditionFn, timeout = 5000, interval = 100) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await conditionFn()) return true;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Retry a command until it succeeds
  async retry(runnerFn, maxAttempts = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await runnerFn();
      } catch (error) {
        lastError = error;
        if (i < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  },

  // Create a temporary file for testing
  async createTempFile(content, extension = ".txt") {
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");

    const tempDir = mkdtempSync(join(tmpdir(), "citty-test-"));
    const tempFile = join(tempDir, `test${extension}`);
    writeFileSync(tempFile, content);
    return tempFile;
  },

  // Clean up temporary files
  async cleanupTempFiles(files) {
    const { unlinkSync, rmdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");

    for (const file of files) {
      try {
        unlinkSync(file);
        rmdirSync(dirname(file));
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  },
};

// Convenience functions for different runner types
export function cleanroomScenario(name) {
  const builder = scenario(name);
  const originalExecute = builder.execute;
  builder.execute = () => originalExecute("cleanroom");
  return builder;
}

export function localScenario(name) {
  const builder = scenario(name);
  const originalExecute = builder.execute;
  builder.execute = () => originalExecute("local");
  return builder;
}

// Pre-built scenario templates
export const scenarios = {
  help: (options = {}) =>
    scenario("Help command")
      .step("Show help")
      .run("--help", options)
      .expectSuccess()
      .expectOutput(/USAGE/),

  version: (options = {}) =>
    scenario("Version check")
      .step("Get version")
      .run("--version", options)
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/),

  invalidCommand: (options = {}) =>
    scenario("Invalid command handling")
      .step("Run invalid command")
      .run("invalid-command", options)
      .expectFailure()
      .expectStderr(/Unknown command|not found/),

  initProject: (projectName = "test-project", options = {}) =>
    scenario(`Initialize ${projectName}`)
      .step("Initialize project")
      .run("init", projectName, options)
      .expectSuccess()
      .expectOutput(/Initialized/)
      .step("Check status")
      .run("status", options)
      .expectSuccess(),

  buildAndTest: (options = {}) =>
    scenario("Build and test workflow")
      .step("Build project")
      .run("build", options)
      .expectSuccess()
      .expectOutput(/Build complete/)
      .step("Run tests")
      .run("test", options)
      .expectSuccess()
      .expectOutput(/Tests passed/),

  // Cleanroom-specific scenarios
  cleanroomInit: (projectName = "test-project") =>
    cleanroomScenario(`Cleanroom init ${projectName}`)
      .step("Initialize in cleanroom")
      .run("init", projectName)
      .expectSuccess()
      .step("List files")
      .run("ls")
      .expectSuccess()
      .expectOutput(projectName),

  // Local development scenarios
  localDev: (options = {}) =>
    localScenario("Local development")
      .step("Start dev server")
      .run("dev", { ...options, env: { NODE_ENV: "development" } })
      .expectSuccess()
      .expectOutput(/Development server/),
};
