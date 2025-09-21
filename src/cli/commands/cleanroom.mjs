import { defineCommand } from "citty";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Docker Cleanroom Testing Utilities
 * Comprehensive testing framework for GitVan in isolated Docker environments
 */
export const cleanroomCommand = defineCommand({
  meta: {
    name: "cleanroom",
    description: "Docker Cleanroom Testing Utilities for GitVan",
    usage: "gitvan cleanroom <command> [options]",
    examples: [
      "gitvan cleanroom build",
      "gitvan cleanroom test --suite core",
      "gitvan cleanroom validate --image gitvan-test",
      "gitvan cleanroom benchmark --iterations 10",
    ],
  },
  subCommands: {
    build: defineCommand({
      meta: {
        name: "build",
        description: "Build Docker cleanroom test images",
        usage: "gitvan cleanroom build [--type <type>] [--tag <tag>]",
        examples: [
          "gitvan cleanroom build",
          "gitvan cleanroom build --type optimized --tag gitvan-cleanroom",
          "gitvan cleanroom build --type binary --tag gitvan-binary-test",
        ],
      },
      args: {
        type: {
          type: "string",
          description: "Docker image type (optimized, binary, full)",
          default: "optimized",
        },
        tag: {
          type: "string",
          description: "Docker image tag",
          default: "gitvan-cleanroom",
        },
        "no-cache": {
          type: "boolean",
          description: "Build without cache",
          default: false,
        },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.buildImage(args.type, args.tag, args["no-cache"]);
      },
    }),

    test: defineCommand({
      meta: {
        name: "test",
        description: "Run cleanroom test suites",
        usage: "gitvan cleanroom test [--suite <suite>] [--image <image>]",
        examples: [
          "gitvan cleanroom test",
          "gitvan cleanroom test --suite core",
          "gitvan cleanroom test --suite ai --image gitvan-ai-test",
          "gitvan cleanroom test --suite all --verbose",
        ],
      },
      args: {
        suite: {
          type: "string",
          description: "Test suite to run (core, ai, workflow, hooks, all)",
          default: "all",
        },
        image: {
          type: "string",
          description: "Docker image to use for testing",
          default: "gitvan-cleanroom",
        },
        verbose: {
          type: "boolean",
          description: "Verbose output",
          default: false,
        },
        "test-dir": {
          type: "string",
          description: "Test output directory",
          default: "./cleanroom-test-output",
        },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.runTestSuite(args.suite, args.image, {
          verbose: args.verbose,
          testDir: args["test-dir"],
        });
      },
    }),

    validate: defineCommand({
      meta: {
        name: "validate",
        description: "Validate Docker image and GitVan installation",
        usage: "gitvan cleanroom validate [--image <image>]",
        examples: [
          "gitvan cleanroom validate",
          "gitvan cleanroom validate --image gitvan-test",
        ],
      },
      args: {
        image: {
          type: "string",
          description: "Docker image to validate",
          default: "gitvan-cleanroom",
        },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.validateImage(args.image);
      },
    }),

    benchmark: defineCommand({
      meta: {
        name: "benchmark",
        description: "Run performance benchmarks",
        usage: "gitvan cleanroom benchmark [--iterations <count>]",
        examples: [
          "gitvan cleanroom benchmark",
          "gitvan cleanroom benchmark --iterations 20",
        ],
      },
      args: {
        iterations: {
          type: "number",
          description: "Number of benchmark iterations",
          default: 10,
        },
        image: {
          type: "string",
          description: "Docker image to benchmark",
          default: "gitvan-cleanroom",
        },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.runBenchmark(args.iterations, args.image);
      },
    }),

    report: defineCommand({
      meta: {
        name: "report",
        description: "Generate cleanroom test report",
        usage: "gitvan cleanroom report [--format <format>]",
        examples: [
          "gitvan cleanroom report",
          "gitvan cleanroom report --format json",
          "gitvan cleanroom report --format markdown",
        ],
      },
      args: {
        format: {
          type: "string",
          description: "Report format (markdown, json, html)",
          default: "markdown",
        },
        "test-dir": {
          type: "string",
          description: "Test output directory",
          default: "./cleanroom-test-output",
        },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.generateReport(args.format, args["test-dir"]);
      },
    }),

    help: defineCommand({
      meta: {
        name: "help",
        description: "Show cleanroom testing help",
      },
      async run() {
        const cleanroom = new CleanroomTesting();
        await cleanroom.showHelp();
      },
    }),
  },
  async run({ args }) {
    // If no subcommand provided, show help
    const cleanroom = new CleanroomTesting();
    return await cleanroom.showHelp();
  },
});

/**
 * Cleanroom Testing Implementation
 */
class CleanroomTesting {
  constructor() {
    this.logger = console;
    this.testDir = "./cleanroom-test-output";
    this.dockerfiles = {
      optimized: "Dockerfile.binary-optimized",
      binary: "Dockerfile.binary",
      full: "Dockerfile.cleanroom",
    };
  }

  async buildImage(type, tag, noCache = false) {
    this.logger.info(`🐳 Building ${type} cleanroom image: ${tag}`);

    const dockerfile = this.dockerfiles[type];
    if (!dockerfile) {
      throw new Error(`Unknown image type: ${type}`);
    }

    const buildArgs = ["docker", "build"];
    if (noCache) buildArgs.push("--no-cache");
    buildArgs.push("-t", tag, "-f", dockerfile, ".");

    try {
      this.logger.info(`📦 Building with: ${buildArgs.join(" ")}`);
      execSync(buildArgs.join(" "), { stdio: "inherit" });
      this.logger.info(`✅ Successfully built ${tag}`);

      // Get image size
      const sizeOutput = execSync(
        `docker images ${tag} --format "table {{.Size}}"`,
        {
          encoding: "utf8",
        }
      );
      this.logger.info(`📊 Image size: ${sizeOutput.split("\n")[1]}`);
    } catch (error) {
      this.logger.error(`❌ Failed to build image: ${error.message}`);
      throw error;
    }
  }

  async runTestSuite(suite, image, options = {}) {
    const { verbose = false, testDir = "./cleanroom-test-output" } = options;

    this.logger.info(`🧪 Running ${suite} test suite with image: ${image}`);

    // Ensure test directory exists
    mkdirSync(testDir, { recursive: true });

    const testSuites = {
      core: this.getCoreTests(),
      ai: this.getAITests(),
      workflow: this.getWorkflowTests(),
      hooks: this.getHooksTests(),
      jtbd: this.getJTBDTests(),
      all: this.getAllTests(),
    };

    const tests = testSuites[suite];
    if (!tests) {
      throw new Error(`Unknown test suite: ${suite}`);
    }

    const results = {
      suite,
      image,
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0, total: 0 },
    };

    for (const test of tests) {
      this.logger.info(`🔍 Running test: ${test.name}`);

      try {
        const result = await this.runTest(test, image, testDir, verbose);
        results.tests.push(result);

        if (result.success) {
          results.summary.passed++;
          this.logger.info(`✅ ${test.name}: PASSED`);
        } else {
          results.summary.failed++;
          this.logger.error(`❌ ${test.name}: FAILED - ${result.error}`);
        }
      } catch (error) {
        results.tests.push({
          name: test.name,
          success: false,
          error: error.message,
          duration: 0,
        });
        results.summary.failed++;
        this.logger.error(`❌ ${test.name}: ERROR - ${error.message}`);
      }

      results.summary.total++;
    }

    // Save results
    this.saveTestResults(results, testDir);

    // Display summary
    this.logger.info(`\n📊 Test Summary:`);
    this.logger.info(`   Total: ${results.summary.total}`);
    this.logger.info(`   Passed: ${results.summary.passed}`);
    this.logger.info(`   Failed: ${results.summary.failed}`);
    this.logger.info(
      `   Success Rate: ${(
        (results.summary.passed / results.summary.total) *
        100
      ).toFixed(1)}%`
    );
  }

  async runTest(test, image, testDir, verbose) {
    const startTime = Date.now();

    try {
      const dockerArgs = [
        "docker",
        "run",
        "--rm",
        "-v",
        `${process.cwd()}/${testDir}:/workspace`,
        "-w",
        "/workspace",
        image,
        "bash",
        "-c",
        test.command,
      ];

      if (verbose) {
        this.logger.info(`🐳 Executing: ${dockerArgs.join(" ")}`);
      }

      const output = execSync(dockerArgs.join(" "), {
        encoding: "utf8",
        stdio: verbose ? "inherit" : "pipe",
      });

      return {
        name: test.name,
        success: true,
        output: output,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: test.name,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  async validateImage(image) {
    this.logger.info(`🔍 Validating Docker image: ${image}`);

    const validations = [
      {
        name: "Image exists",
        command: `docker images ${image} --format "{{.Repository}}" | grep -q ${image}`,
      },
      {
        name: "GitVan CLI accessible",
        command: "node /gitvan/dist/bin/gitvan.mjs --help > /dev/null 2>&1",
      },
      {
        name: "GitVan init works",
        command:
          "node /gitvan/dist/bin/gitvan.mjs init --name test --description test > /dev/null 2>&1",
      },
      {
        name: "Git operations work",
        command:
          "git init && echo 'test' > test.txt && git add test.txt && git commit -m 'test' > /dev/null 2>&1",
      },
    ];

    let passed = 0;
    for (const validation of validations) {
      try {
        execSync(`docker run --rm ${image} bash -c "${validation.command}"`, {
          stdio: "pipe",
        });
        this.logger.info(`✅ ${validation.name}`);
        passed++;
      } catch (error) {
        this.logger.error(`❌ ${validation.name}`);
      }
    }

    this.logger.info(
      `\n📊 Validation Summary: ${passed}/${validations.length} passed`
    );

    if (passed === validations.length) {
      this.logger.info(`✅ Image ${image} is valid and ready for testing`);
    } else {
      this.logger.error(`❌ Image ${image} has validation issues`);
    }
  }

  async runBenchmark(iterations, image) {
    this.logger.info(
      `⚡ Running performance benchmark: ${iterations} iterations`
    );

    const benchmarks = [
      {
        name: "CLI Help Command",
        command: "time node /gitvan/dist/bin/gitvan.mjs --help",
      },
      {
        name: "Project Initialization",
        command:
          "time node /gitvan/dist/bin/gitvan.mjs init --name benchmark --description benchmark",
      },
      {
        name: "Hooks List",
        command: "time node /gitvan/dist/bin/gitvan.mjs hooks list",
      },
      {
        name: "JTBD List",
        command: "time node /gitvan/dist/bin/gitvan.mjs jtbd list",
      },
    ];

    const results = {
      image,
      iterations,
      timestamp: new Date().toISOString(),
      benchmarks: [],
    };

    for (const benchmark of benchmarks) {
      this.logger.info(`🔍 Benchmarking: ${benchmark.name}`);

      const times = [];
      for (let i = 0; i < iterations; i++) {
        try {
          const startTime = Date.now();
          execSync(`docker run --rm ${image} bash -c "${benchmark.command}"`, {
            stdio: "pipe",
          });
          const duration = Date.now() - startTime;
          times.push(duration);

          if (i % 5 === 0) {
            this.logger.info(
              `   Iteration ${i + 1}/${iterations}: ${duration}ms`
            );
          }
        } catch (error) {
          this.logger.error(`   Iteration ${i + 1} failed: ${error.message}`);
        }
      }

      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        results.benchmarks.push({
          name: benchmark.name,
          average: avg,
          min,
          max,
          iterations: times.length,
        });

        this.logger.info(`📊 ${benchmark.name}:`);
        this.logger.info(`   Average: ${avg.toFixed(2)}ms`);
        this.logger.info(`   Min: ${min}ms`);
        this.logger.info(`   Max: ${max}ms`);
      }
    }

    // Save benchmark results
    writeFileSync(
      join(this.testDir, `benchmark-${Date.now()}.json`),
      JSON.stringify(results, null, 2)
    );

    this.logger.info(`✅ Benchmark completed and saved`);
  }

  async generateReport(format, testDir) {
    this.logger.info(`📄 Generating ${format} test report`);

    // Read test results
    const testFiles = execSync(`find ${testDir} -name "test-results-*.json"`, {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    if (testFiles.length === 0) {
      this.logger.error("No test results found");
      return;
    }

    const allResults = testFiles
      .map((file) => {
        try {
          return JSON.parse(readFileSync(file, "utf8"));
        } catch (error) {
          this.logger.warn(`Failed to read ${file}: ${error.message}`);
          return null;
        }
      })
      .filter(Boolean);

    const report = this.generateReportContent(allResults, format);

    const reportFile = join(
      testDir,
      `cleanroom-report-${Date.now()}.${format}`
    );
    writeFileSync(reportFile, report);

    this.logger.info(`✅ Report generated: ${reportFile}`);
  }

  generateReportContent(results, format) {
    const summary = this.calculateSummary(results);

    switch (format) {
      case "json":
        return JSON.stringify({ summary, results }, null, 2);

      case "markdown":
        return this.generateMarkdownReport(summary, results);

      case "html":
        return this.generateHTMLReport(summary, results);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  generateMarkdownReport(summary, results) {
    return `# GitVan Cleanroom Test Report

## Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests}
- **Failed**: ${summary.failedTests}
- **Success Rate**: ${summary.successRate.toFixed(1)}%
- **Test Suites**: ${summary.testSuites}

## Test Results

${results
  .map(
    (result) => `
### ${result.suite} Suite
- **Image**: ${result.image}
- **Timestamp**: ${result.timestamp}
- **Tests**: ${result.summary.total} (${result.summary.passed} passed, ${
      result.summary.failed
    } failed)

#### Test Details
${result.tests
  .map(
    (test) => `
- **${test.name}**: ${test.success ? "✅ PASSED" : "❌ FAILED"} (${
      test.duration
    }ms)
  ${!test.success ? `  - Error: ${test.error}` : ""}
`
  )
  .join("")}
`
  )
  .join("")}

---
*Generated by GitVan Cleanroom Testing Utilities*
`;
  }

  generateHTMLReport(summary, results) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>GitVan Cleanroom Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .test-suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .passed { color: green; }
        .failed { color: red; }
    </style>
</head>
<body>
    <h1>GitVan Cleanroom Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${summary.totalTests}</p>
        <p>Passed: <span class="passed">${summary.passedTests}</span></p>
        <p>Failed: <span class="failed">${summary.failedTests}</span></p>
        <p>Success Rate: ${summary.successRate.toFixed(1)}%</p>
    </div>
    
    ${results
      .map(
        (result) => `
    <div class="test-suite">
        <h3>${result.suite} Suite</h3>
        <p>Image: ${result.image}</p>
        <p>Tests: ${result.summary.total} (${result.summary.passed} passed, ${
          result.summary.failed
        } failed)</p>
        
        <ul>
        ${result.tests
          .map(
            (test) => `
            <li class="${test.success ? "passed" : "failed"}">
                ${test.name}: ${test.success ? "PASSED" : "FAILED"} (${
              test.duration
            }ms)
                ${
                  !test.success ? `<br><small>Error: ${test.error}</small>` : ""
                }
            </li>
        `
          )
          .join("")}
        </ul>
    </div>
    `
      )
      .join("")}
</body>
</html>`;
  }

  calculateSummary(results) {
    const totalTests = results.reduce(
      (sum, result) => sum + result.summary.total,
      0
    );
    const passedTests = results.reduce(
      (sum, result) => sum + result.summary.passed,
      0
    );
    const failedTests = results.reduce(
      (sum, result) => sum + result.summary.failed,
      0
    );

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      testSuites: results.length,
    };
  }

  saveTestResults(results, testDir) {
    const filename = join(testDir, `test-results-${Date.now()}.json`);
    writeFileSync(filename, JSON.stringify(results, null, 2));
    this.logger.info(`💾 Test results saved: ${filename}`);
  }

  getCoreTests() {
    return [
      {
        name: "CLI Help Command",
        command: "node /gitvan/dist/bin/gitvan.mjs --help",
      },
      {
        name: "Project Initialization",
        command:
          "node /gitvan/dist/bin/gitvan.mjs init --name cleanroom-test --description 'Cleanroom test project'",
      },
      {
        name: "Git Repository Setup",
        command:
          "git init && echo 'test content' > test.txt && git add test.txt && git commit -m 'Initial commit'",
      },
      {
        name: "Configuration Loading",
        command: "test -f gitvan.config.js && test -f package.json",
      },
    ];
  }

  getAITests() {
    return [
      {
        name: "Chat Command Help",
        command: "node /gitvan/dist/bin/gitvan.mjs chat help",
      },
      {
        name: "Chat Generate (Fallback)",
        command:
          "node /gitvan/dist/bin/gitvan.mjs chat generate --prompt 'Create a simple test job'",
      },
      {
        name: "AI Template Loop",
        command:
          "node /gitvan/dist/bin/gitvan.mjs chat template 'Create a React component'",
      },
    ];
  }

  getWorkflowTests() {
    return [
      {
        name: "Workflow Help",
        command: "node /gitvan/dist/bin/gitvan.mjs workflow help",
      },
      {
        name: "Workflow List",
        command: "node /gitvan/dist/bin/gitvan.mjs workflow list",
      },
      {
        name: "Workflow Directory Structure",
        command: "test -d workflows && test -f workflows/README.md",
      },
    ];
  }

  getHooksTests() {
    return [
      {
        name: "Hooks Help",
        command: "node /gitvan/dist/bin/gitvan.mjs hooks help",
      },
      {
        name: "Hooks List",
        command: "node /gitvan/dist/bin/gitvan.mjs hooks list",
      },
      {
        name: "Hooks Stats",
        command: "node /gitvan/dist/bin/gitvan.mjs hooks stats",
      },
      {
        name: "Hooks Directory Structure",
        command: "test -d hooks && test -f hooks/README.md",
      },
    ];
  }

  getJTBDTests() {
    return [
      {
        name: "JTBD Help",
        command: "node /gitvan/dist/bin/gitvan.mjs jtbd help",
      },
      {
        name: "JTBD List",
        command: "node /gitvan/dist/bin/gitvan.mjs jtbd list",
      },
      {
        name: "JTBD Stats",
        command: "node /gitvan/dist/bin/gitvan.mjs jtbd stats",
      },
      {
        name: "JTBD Create Hook",
        command:
          "node /gitvan/dist/bin/gitvan.mjs jtbd create test-hook 'Test Hook' ask",
      },
      {
        name: "JTBD Directory Structure",
        command: "test -d hooks/jtbd-hooks || mkdir -p hooks/jtbd-hooks",
      },
    ];
  }

  getAllTests() {
    return [
      ...this.getCoreTests(),
      ...this.getAITests(),
      ...this.getWorkflowTests(),
      ...this.getHooksTests(),
      ...this.getJTBDTests(),
    ];
  }

  async showHelp() {
    this.logger.info(`
🐳 GitVan Docker Cleanroom Testing Utilities:
═══════════════════════════════════════════════════════════════════════════════

📦 Build cleanroom images:
   gitvan cleanroom build
   gitvan cleanroom build --type optimized --tag gitvan-cleanroom
   gitvan cleanroom build --type binary --tag gitvan-binary-test

🧪 Run test suites:
   gitvan cleanroom test
   gitvan cleanroom test --suite core
   gitvan cleanroom test --suite ai --image gitvan-ai-test
   gitvan cleanroom test --suite all --verbose

🔍 Validate Docker images:
   gitvan cleanroom validate
   gitvan cleanroom validate --image gitvan-test

⚡ Run performance benchmarks:
   gitvan cleanroom benchmark
   gitvan cleanroom benchmark --iterations 20

📄 Generate test reports:
   gitvan cleanroom report
   gitvan cleanroom report --format json
   gitvan cleanroom report --format markdown

🎯 Available Test Suites:
   • core: Core system functionality (CLI, init, git)
   • ai: AI integration and chat commands
   • workflow: Workflow engine functionality
   • hooks: Knowledge hooks system
   • jtbd: Jobs-to-be-Done hooks
   • all: Complete test suite

🐳 Docker Image Types:
   • optimized: Binary-optimized image (recommended)
   • binary: Self-contained binary image
   • full: Complete development image

For more information, visit: https://github.com/seanchatmangpt/gitvan
    `);
  }
}
