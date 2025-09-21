/**
 * Test fixtures and utilities for citty-test-utils
 */

export const mockResults = {
  success: {
    exitCode: 0,
    stdout:
      "Git-native development automation platform (gitvan v3.0.0)\n\nUSAGE gitvan graph|daemon|event|cron|audit|hooks|workflow|jtbd|cleanroom|init|setup|save|ensure|pack|marketplace|scaffold|compose|chat\n\nCOMMANDS\n\n        graph    Graph persistence and operations for GitVan\n       daemon    Manage GitVan daemon (start, stop, status, restart)\n        event    Manage GitVan events (simulate, test, list, trigger)\n         cron    Manage GitVan cron jobs (list, start, dry-run, status)\n        audit    Manage GitVan audit and verification (build, verify, list, show)\n        hooks    Manage GitVan Knowledge Hooks\n     workflow    Manage GitVan Workflows\n         jtbd    Manage GitVan Jobs-to-be-Done (JTBD) Hooks\n    cleanroom    Docker Cleanroom Testing Utilities for GitVan\n         init    Initialize GitVan project with Knowledge Hook Engine support\n        setup    Complete autonomic setup: start daemon, install hooks, and auto-install packs (non-blocking)\n         save    Save changes with AI-generated commit message and automatic job execution\n       ensure    Ensure GitVan is properly configured in the repository\n         pack    Manage GitVan packs\n  marketplace    Browse and install packs from the GitVan marketplace\n     scaffold    Run a pack scaffold to generate content\n      compose    Compose multiple packs together\n         chat    AI-powered chat interface for job generation\n\nUse gitvan <command> --help for more information about a command.",
    stderr: "",
    args: ["--help"],
    cwd: "/app",
    duration: 150,
  },

  failure: {
    exitCode: 1,
    stdout: "",
    stderr:
      "Error: Unknown command 'invalid-command'\nUse gitvan --help for more information.",
    args: ["invalid-command"],
    cwd: "/app",
    duration: 50,
  },

  jsonSuccess: {
    exitCode: 0,
    stdout:
      '{"message": "success", "data": {"version": "3.0.0", "commands": ["graph", "daemon", "workflow"]}}',
    stderr: "",
    args: ["--json", "--version"],
    cwd: "/app",
    json: {
      message: "success",
      data: {
        version: "3.0.0",
        commands: ["graph", "daemon", "workflow"],
      },
    },
    duration: 100,
  },

  timeout: {
    exitCode: 124, // Common timeout exit code
    stdout: "",
    stderr: "Command timed out",
    args: ["sleep", "10"],
    cwd: "/app",
    duration: 5000,
  },

  emptyOutput: {
    exitCode: 0,
    stdout: "",
    stderr: "",
    args: ["--quiet"],
    cwd: "/app",
    duration: 25,
  },

  largeOutput: {
    exitCode: 0,
    stdout: "A".repeat(10000), // 10KB of output
    stderr: "",
    args: ["--verbose"],
    cwd: "/app",
    duration: 200,
  },
};

export const testCommands = {
  help: ["--help"],
  version: ["--version"],
  invalid: ["invalid-command"],
  quiet: ["--quiet"],
  verbose: ["--verbose"],
  json: ["--json", "--version"],
  timeout: ["sleep", "10"],
  empty: [],
};

export const testScenarios = {
  basicHelp: {
    description: "Basic help command execution",
    command: testCommands.help,
    expectations: {
      exitCode: 0,
      outputContains: ["gitvan", "USAGE", "COMMANDS"],
      stderrEmpty: true,
    },
  },

  errorHandling: {
    description: "Error handling for invalid commands",
    command: testCommands.invalid,
    expectations: {
      exitCode: [1, 2, 127],
      stderrContains: ["Error", "Unknown command"],
    },
  },

  jsonOutput: {
    description: "JSON output parsing",
    command: testCommands.json,
    expectations: {
      exitCode: 0,
      hasJson: true,
    },
  },

  timeout: {
    description: "Command timeout handling",
    command: testCommands.timeout,
    timeout: 1000,
    expectations: {
      timeout: true,
    },
  },
};

export function createMockResult(overrides = {}) {
  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    args: [],
    cwd: "/app",
    duration: 100,
    ...overrides,
  };
}

export function createMockWrappedResult(overrides = {}) {
  const {
    wrapExpectation,
  } = require("../../../vendors/citty-test-utils/assertions.js");
  return wrapExpectation(createMockResult(overrides));
}

export async function runTestScenario(scenario) {
  const { runLocalCitty } = await import(
    "../../../vendors/citty-test-utils/local-runner.js"
  );

  const options = {};
  if (scenario.timeout) {
    options.timeout = scenario.timeout;
  }

  try {
    const result = await runLocalCitty(scenario.command, options);
    return { success: true, result };
  } catch (error) {
    return { success: false, error };
  }
}

export function validateScenarioResult(scenarioResult, scenario) {
  const { result, error } = scenarioResult;
  const testResult = result || error;

  if (!testResult) {
    throw new Error("No result or error returned from scenario");
  }

  const expectations = scenario.expectations;

  if (expectations.exitCode !== undefined) {
    if (Array.isArray(expectations.exitCode)) {
      expect(expectations.exitCode).toContain(testResult.exitCode);
    } else {
      expect(testResult.exitCode).toBe(expectations.exitCode);
    }
  }

  if (expectations.outputContains) {
    expectations.outputContains.forEach((text) => {
      expect(testResult.stdout).toContain(text);
    });
  }

  if (expectations.stderrContains) {
    expectations.stderrContains.forEach((text) => {
      expect(testResult.stderr).toContain(text);
    });
  }

  if (expectations.stderrEmpty) {
    expect(testResult.stderr).toBe("");
  }

  if (expectations.hasJson) {
    expect(testResult.json).toBeDefined();
  }

  if (expectations.timeout) {
    expect(error.message).toContain("timed out");
  }
}

export const performanceThresholds = {
  helpCommand: 2000, // 2 seconds
  errorHandling: 2000, // 2 seconds
  concurrentCommands: 5000, // 5 seconds for 5 concurrent
  sequentialCommands: 10000, // 10 seconds for 10 sequential
  memoryIncrease: 50 * 1024 * 1024, // 50MB
  timeoutAccuracy: 1000, // 1 second tolerance
};

export function measurePerformance(fn) {
  return async (...args) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    const result = await fn(...args);

    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    return {
      result,
      duration: endTime - startTime,
      memoryIncrease: endMemory.heapUsed - startMemory.heapUsed,
    };
  };
}

