/**
 * GitVan E2E Citty Test Utilities
 *
 * Additional utilities and helpers for E2E testing of Citty-based CLI
 * Provides mock data, test fixtures, and assertion helpers
 */

import { promises as fs } from "node:fs";
import { join, resolve } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

/**
 * Mock Data Generator
 * Generates realistic test data for GitVan CLI tests
 */
export class MockDataGenerator {
  /**
   * Generate mock GitVan project structure
   */
  static async generateMockProject(testDir) {
    const projectFiles = {
      "package.json": JSON.stringify(
        {
          name: "test-gitvan-project",
          version: "1.0.0",
          type: "module",
          dependencies: {
            gitvan: "^3.0.0",
          },
        },
        null,
        2
      ),

      "gitvan.config.js": `
export default {
  name: 'test-project',
  version: '1.0.0',
  description: 'Test GitVan project',
  hooks: {
    'pre-commit': ['code-quality-gatekeeper'],
    'pre-push': ['dependency-vulnerability-scanner']
  }
};
`,

      "README.md": `# Test GitVan Project

This is a test project for GitVan CLI testing.

## Features

- Code quality validation
- Dependency scanning
- Performance monitoring
`,

      "src/index.mjs": `
export function main() {
  console.log('Hello from test project');
}
`,

      "hooks/code-quality-gatekeeper.mjs": `
import { defineJob } from '../../../src/jobs/define.mjs';

export default defineJob({
  meta: {
    name: "code-quality-gatekeeper",
    desc: "Comprehensive code quality validation",
    tags: ["jtbd", "code-quality"],
    version: "1.0.0",
  },
  hooks: ["pre-commit", "pre-push"],
  async run(context) {
    console.log("Code quality validation");
    return { success: true, message: "Quality standards met" };
  }
});
`,

      "hooks/dependency-vulnerability-scanner.mjs": `
import { defineJob } from '../../../src/jobs/define.mjs';

export default defineJob({
  meta: {
    name: "dependency-vulnerability-scanner",
    desc: "Scan for dependency vulnerabilities",
    tags: ["jtbd", "security"],
    version: "1.0.0",
  },
  hooks: ["pre-push"],
  async run(context) {
    console.log("Dependency vulnerability scan");
    return { success: true, vulnerabilities: [] };
  }
});
`,

      "templates/component.njk": `
---
title: "{{ componentName }}"
description: "{{ description }}"
---

# {{ componentName }}

{{ description }}

## Usage

\`\`\`javascript
import { {{ componentName }} } from './{{ componentName }}';
\`\`\`
`,

      "workflows/test-workflow.ttl": `
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix ex: <http://example.org/> .

ex:test-workflow rdf:type gv:Workflow ;
    gv:name "Test Workflow" ;
    gv:description "A test workflow for E2E testing" ;
    gv:steps ex:step1, ex:step2 .

ex:step1 rdf:type gv:FileStep ;
    gv:operation "read" ;
    gv:filePath "./src/index.mjs" .

ex:step2 rdf:type gv:TemplateStep ;
    gv:template "file://templates/component.njk" ;
    gv:filePath "./output/component.md" .
`,

      "graph/default.ttl": `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .

ex:Project a gv:Project ;
    gv:name "Test Project" ;
    gv:version "1.0.0" ;
    gv:hasHook ex:code-quality-gatekeeper .

ex:code-quality-gatekeeper a gv:JTBDHook ;
    gv:name "code-quality-gatekeeper" ;
    gv:category "core-development-lifecycle" ;
    gv:domain "quality" .
`,
    };

    for (const [filePath, content] of Object.entries(projectFiles)) {
      const fullPath = join(testDir, filePath);
      await fs.mkdir(join(fullPath, ".."), { recursive: true });
      await fs.writeFile(fullPath, content);
    }

    return projectFiles;
  }

  /**
   * Generate mock Git repository
   */
  static async generateMockGitRepo(testDir) {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);

    // Initialize git repository
    await execFileAsync("git", ["init"], { cwd: testDir });
    await execFileAsync("git", ["config", "user.name", "Test User"], {
      cwd: testDir,
    });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], {
      cwd: testDir,
    });

    // Create initial commit
    await execFileAsync("git", ["add", "."], { cwd: testDir });
    await execFileAsync("git", ["commit", "-m", "Initial commit"], {
      cwd: testDir,
    });

    return testDir;
  }

  /**
   * Generate mock JTBD hooks
   */
  static generateMockJTBDHooks() {
    return {
      "code-quality-gatekeeper": {
        name: "code-quality-gatekeeper",
        description: "Comprehensive code quality validation",
        category: "core-development-lifecycle",
        domain: "quality",
        hooks: ["pre-commit", "pre-push"],
        predicates: ["ask", "threshold"],
      },
      "dependency-vulnerability-scanner": {
        name: "dependency-vulnerability-scanner",
        description: "Scan for dependency vulnerabilities",
        category: "infrastructure-devops",
        domain: "security",
        hooks: ["pre-push"],
        predicates: ["ask", "select"],
      },
      "performance-monitor": {
        name: "performance-monitor",
        description: "Monitor application performance",
        category: "infrastructure-devops",
        domain: "performance",
        hooks: ["post-commit"],
        predicates: ["select", "threshold"],
      },
    };
  }

  /**
   * Generate mock workflow data
   */
  static generateMockWorkflows() {
    return {
      "test-workflow": {
        id: "http://example.org/test-workflow",
        name: "Test Workflow",
        description: "A test workflow for E2E testing",
        steps: [
          {
            id: "step1",
            type: "FileStep",
            operation: "read",
            filePath: "./src/index.mjs",
          },
          {
            id: "step2",
            type: "TemplateStep",
            template: "file://templates/component.njk",
            filePath: "./output/component.md",
          },
        ],
      },
    };
  }
}

/**
 * Test Fixtures
 * Pre-configured test scenarios and data
 */
export class TestFixtures {
  /**
   * Create a complete GitVan test environment
   */
  static async createTestEnvironment(options = {}) {
    const testDir = join(tmpdir(), `gitvan-e2e-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Generate mock project
    await MockDataGenerator.generateMockProject(testDir);

    // Generate mock git repo if requested
    if (options.withGit) {
      await MockDataGenerator.generateMockGitRepo(testDir);
    }

    return {
      testDir,
      cleanup: async () => {
        try {
          await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
          console.warn(
            `Failed to clean up test directory ${testDir}: ${error.message}`
          );
        }
      },
    };
  }

  /**
   * Create a minimal test environment
   */
  static async createMinimalTestEnvironment() {
    const testDir = join(tmpdir(), `gitvan-minimal-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create minimal package.json
    await fs.writeFile(
      join(testDir, "package.json"),
      JSON.stringify(
        {
          name: "minimal-test",
          version: "1.0.0",
          type: "module",
        },
        null,
        2
      )
    );

    return {
      testDir,
      cleanup: async () => {
        try {
          await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
          console.warn(
            `Failed to clean up test directory ${testDir}: ${error.message}`
          );
        }
      },
    };
  }
}

/**
 * Assertion Helpers
 * Extended assertion utilities for CLI testing
 */
export class CLIAssertions {
  /**
   * Assert command output contains all expected texts
   */
  static assertOutputContainsAll(output, expectedTexts) {
    for (const text of expectedTexts) {
      if (!output.includes(text)) {
        throw new Error(
          `Expected output to contain "${text}" but got: ${output}`
        );
      }
    }
    return true;
  }

  /**
   * Assert command output matches regex pattern
   */
  static assertOutputMatches(output, pattern) {
    if (!pattern.test(output)) {
      throw new Error(
        `Output does not match pattern: ${pattern}\nActual output: ${output}`
      );
    }
    return true;
  }

  /**
   * Assert command output does not contain text
   */
  static assertOutputNotContains(output, unexpectedText) {
    if (output.includes(unexpectedText)) {
      throw new Error(
        `Expected output to NOT contain "${unexpectedText}" but got: ${output}`
      );
    }
    return true;
  }

  /**
   * Assert command execution time is within limits
   */
  static assertExecutionTime(result, maxTime) {
    if (result.duration > maxTime) {
      throw new Error(
        `Command took ${result.duration}ms, expected less than ${maxTime}ms`
      );
    }
    return true;
  }

  /**
   * Assert command exit code
   */
  static assertExitCode(result, expectedCode) {
    if (result.exitCode !== expectedCode) {
      throw new Error(
        `Expected exit code ${expectedCode}, got ${result.exitCode}`
      );
    }
    return true;
  }

  /**
   * Assert command success
   */
  static assertSuccess(result) {
    if (!result.success) {
      throw new Error(
        `Command failed with exit code ${result.exitCode}\nStderr: ${result.stderr}`
      );
    }
    return true;
  }

  /**
   * Assert command failure
   */
  static assertFailure(result) {
    if (result.success) {
      throw new Error(
        `Command should have failed but succeeded with exit code ${result.exitCode}`
      );
    }
    return true;
  }

  /**
   * Assert file exists
   */
  static async assertFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      throw new Error(`File does not exist: ${filePath}`);
    }
  }

  /**
   * Assert file content contains text
   */
  static async assertFileContains(filePath, expectedContent) {
    const content = await fs.readFile(filePath, "utf8");
    if (!content.includes(expectedContent)) {
      throw new Error(
        `File ${filePath} does not contain expected content: ${expectedContent}`
      );
    }
    return true;
  }

  /**
   * Assert file content matches pattern
   */
  static async assertFileMatches(filePath, pattern) {
    const content = await fs.readFile(filePath, "utf8");
    if (!pattern.test(content)) {
      throw new Error(`File ${filePath} does not match pattern: ${pattern}`);
    }
    return true;
  }
}

/**
 * Test Data Builder
 * Fluent API for building test data
 */
export class TestDataBuilder {
  constructor() {
    this.data = {};
  }

  /**
   * Add project configuration
   */
  withProjectConfig(config) {
    this.data.projectConfig = config;
    return this;
  }

  /**
   * Add JTBD hooks
   */
  withJTBDHooks(hooks) {
    this.data.jtbdHooks = hooks;
    return this;
  }

  /**
   * Add workflows
   */
  withWorkflows(workflows) {
    this.data.workflows = workflows;
    return this;
  }

  /**
   * Add templates
   */
  withTemplates(templates) {
    this.data.templates = templates;
    return this;
  }

  /**
   * Add git repository
   */
  withGitRepo() {
    this.data.withGit = true;
    return this;
  }

  /**
   * Build the test data
   */
  build() {
    return this.data;
  }
}

/**
 * Performance Testing Utilities
 * Utilities for testing CLI performance
 */
export class PerformanceTestUtils {
  /**
   * Measure command execution time
   */
  static async measureExecutionTime(commandFn) {
    const startTime = Date.now();
    await commandFn();
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Run command multiple times and get statistics
   */
  static async runMultipleTimes(commandFn, iterations = 10) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const time = await this.measureExecutionTime(commandFn);
      times.push(time);
    }

    const sortedTimes = times.sort((a, b) => a - b);
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      times,
      average,
      median,
      min,
      max,
      iterations,
    };
  }

  /**
   * Assert performance is within limits
   */
  static assertPerformanceWithinLimits(stats, maxAverage, maxMax) {
    if (stats.average > maxAverage) {
      throw new Error(
        `Average execution time ${stats.average}ms exceeds limit ${maxAverage}ms`
      );
    }
    if (stats.max > maxMax) {
      throw new Error(
        `Maximum execution time ${stats.max}ms exceeds limit ${maxMax}ms`
      );
    }
    return true;
  }
}

/**
 * Default export for easy importing
 */
export default {
  MockDataGenerator,
  TestFixtures,
  CLIAssertions,
  TestDataBuilder,
  PerformanceTestUtils,
};
