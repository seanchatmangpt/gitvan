import { defineCommand } from "citty";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getCoreTests,
  getAITests,
  getWorkflowTests,
  getHooksTests,
  getJTBDTests,
  getAllTests,
  generateMarkdownReport,
  generateHTMLReport,
  calculateSummary,
} from "./cleanroom-tests.mjs";

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
      },
      args: {
        type: { type: "string", description: "Docker image type (optimized, binary, full)", default: "optimized" },
        tag: { type: "string", description: "Docker image tag", default: "gitvan-cleanroom" },
        "no-cache": { type: "boolean", description: "Build without cache", default: false },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.buildImage(args.type, args.tag, args["no-cache"]);
      },
    }),

    test: defineCommand({
      meta: { name: "test", description: "Run cleanroom test suites" },
      args: {
        suite: { type: "string", description: "Test suite (core, ai, workflow, hooks, all)", default: "all" },
        image: { type: "string", description: "Docker image to use", default: "gitvan-cleanroom" },
        verbose: { type: "boolean", description: "Verbose output", default: false },
        "test-dir": { type: "string", description: "Test output directory", default: "./cleanroom-test-output" },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.runTestSuite(args.suite, args.image, {
          verbose: args.verbose, testDir: args["test-dir"],
        });
      },
    }),

    validate: defineCommand({
      meta: { name: "validate", description: "Validate Docker image and GitVan installation" },
      args: {
        image: { type: "string", description: "Docker image to validate", default: "gitvan-cleanroom" },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.validateImage(args.image);
      },
    }),

    benchmark: defineCommand({
      meta: { name: "benchmark", description: "Run performance benchmarks" },
      args: {
        iterations: { type: "number", description: "Number of benchmark iterations", default: 10 },
        image: { type: "string", description: "Docker image to benchmark", default: "gitvan-cleanroom" },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.runBenchmark(args.iterations, args.image);
      },
    }),

    report: defineCommand({
      meta: { name: "report", description: "Generate cleanroom test report" },
      args: {
        format: { type: "string", description: "Report format (markdown, json, html)", default: "markdown" },
        "test-dir": { type: "string", description: "Test output directory", default: "./cleanroom-test-output" },
      },
      async run({ args }) {
        const cleanroom = new CleanroomTesting();
        await cleanroom.generateReport(args.format, args["test-dir"]);
      },
    }),

    help: defineCommand({
      meta: { name: "help", description: "Show cleanroom testing help" },
      async run() {
        const cleanroom = new CleanroomTesting();
        await cleanroom.showHelp();
      },
    }),
  },
  async run({ args }) {
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
    this.logger.info(`Building ${type} cleanroom image: ${tag}`);
    const dockerfile = this.dockerfiles[type];
    if (!dockerfile) throw new Error(`Unknown image type: ${type}`);

    const buildArgs = ["docker", "build"];
    if (noCache) buildArgs.push("--no-cache");
    buildArgs.push("-t", tag, "-f", dockerfile, ".");

    try {
      this.logger.info(`Building with: ${buildArgs.join(" ")}`);
      execSync(buildArgs.join(" "), { stdio: "inherit" });
      this.logger.info(`Successfully built ${tag}`);
      const sizeOutput = execSync(`docker images ${tag} --format "table {{.Size}}"`, { encoding: "utf8" });
      this.logger.info(`Image size: ${sizeOutput.split("\n")[1]}`);
    } catch (error) {
      this.logger.error(`Failed to build image: ${error.message}`);
      throw error;
    }
  }

  async runTestSuite(suite, image, options = {}) {
    const { verbose = false, testDir = "./cleanroom-test-output" } = options;
    this.logger.info(`Running ${suite} test suite with image: ${image}`);
    mkdirSync(testDir, { recursive: true });

    const testSuites = {
      core: getCoreTests(),
      ai: getAITests(),
      workflow: getWorkflowTests(),
      hooks: getHooksTests(),
      jtbd: getJTBDTests(),
      all: getAllTests(),
    };

    const tests = testSuites[suite];
    if (!tests) throw new Error(`Unknown test suite: ${suite}`);

    const results = {
      suite, image,
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0, total: 0 },
    };

    for (const test of tests) {
      this.logger.info(`Running test: ${test.name}`);
      try {
        const result = await this.runTest(test, image, testDir, verbose);
        results.tests.push(result);
        if (result.success) {
          results.summary.passed++;
          this.logger.info(`${test.name}: PASSED`);
        } else {
          results.summary.failed++;
          this.logger.error(`${test.name}: FAILED - ${result.error}`);
        }
      } catch (error) {
        results.tests.push({ name: test.name, success: false, error: error.message, duration: 0 });
        results.summary.failed++;
        this.logger.error(`${test.name}: ERROR - ${error.message}`);
      }
      results.summary.total++;
    }

    this.saveTestResults(results, testDir);
    this.logger.info(`\nTest Summary:`);
    this.logger.info(`   Total: ${results.summary.total}`);
    this.logger.info(`   Passed: ${results.summary.passed}`);
    this.logger.info(`   Failed: ${results.summary.failed}`);
    this.logger.info(`   Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  }

  async runTest(test, image, testDir, verbose) {
    const startTime = Date.now();
    try {
      const dockerArgs = ["docker", "run", "--rm", "-v", `${process.cwd()}/${testDir}:/workspace`, "-w", "/workspace", image, "bash", "-c", test.command];
      if (verbose) this.logger.info(`Executing: ${dockerArgs.join(" ")}`);
      const output = execSync(dockerArgs.join(" "), { encoding: "utf8", stdio: verbose ? "inherit" : "pipe" });
      return { name: test.name, success: true, output, duration: Date.now() - startTime };
    } catch (error) {
      return { name: test.name, success: false, error: error.message, duration: Date.now() - startTime };
    }
  }

  async validateImage(image) {
    this.logger.info(`Validating Docker image: ${image}`);
    const validations = [
      { name: "Image exists", command: `docker images ${image} --format "{{.Repository}}" | grep -q ${image}` },
      { name: "GitVan CLI accessible", command: "node /gitvan/dist/bin/gitvan.mjs --help > /dev/null 2>&1" },
      { name: "GitVan init works", command: "node /gitvan/dist/bin/gitvan.mjs init --name test --description test > /dev/null 2>&1" },
      { name: "Git operations work", command: "git init && echo 'test' > test.txt && git add test.txt && git commit -m 'test' > /dev/null 2>&1" },
    ];

    let passed = 0;
    for (const validation of validations) {
      try {
        execSync(`docker run --rm ${image} bash -c "${validation.command}"`, { stdio: "pipe" });
        this.logger.info(`PASS: ${validation.name}`);
        passed++;
      } catch (error) {
        this.logger.error(`FAIL: ${validation.name}`);
      }
    }

    this.logger.info(`\nValidation Summary: ${passed}/${validations.length} passed`);
    if (passed === validations.length) {
      this.logger.info(`Image ${image} is valid and ready for testing`);
    } else {
      this.logger.error(`Image ${image} has validation issues`);
    }
  }

  async runBenchmark(iterations, image) {
    this.logger.info(`Running performance benchmark: ${iterations} iterations`);
    const benchmarks = [
      { name: "CLI Help Command", command: "time node /gitvan/dist/bin/gitvan.mjs --help" },
      { name: "Project Initialization", command: "time node /gitvan/dist/bin/gitvan.mjs init --name benchmark --description benchmark" },
      { name: "Hooks List", command: "time node /gitvan/dist/bin/gitvan.mjs hooks list" },
      { name: "JTBD List", command: "time node /gitvan/dist/bin/gitvan.mjs jtbd list" },
    ];

    const results = { image, iterations, timestamp: new Date().toISOString(), benchmarks: [] };

    for (const benchmark of benchmarks) {
      this.logger.info(`Benchmarking: ${benchmark.name}`);
      const times = [];
      for (let i = 0; i < iterations; i++) {
        try {
          const startTime = Date.now();
          execSync(`docker run --rm ${image} bash -c "${benchmark.command}"`, { stdio: "pipe" });
          times.push(Date.now() - startTime);
          if (i % 5 === 0) this.logger.info(`   Iteration ${i + 1}/${iterations}: ${times[times.length - 1]}ms`);
        } catch (error) {
          this.logger.error(`   Iteration ${i + 1} failed: ${error.message}`);
        }
      }

      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        results.benchmarks.push({ name: benchmark.name, average: avg, min: Math.min(...times), max: Math.max(...times), iterations: times.length });
        this.logger.info(`${benchmark.name}: Average=${avg.toFixed(2)}ms Min=${Math.min(...times)}ms Max=${Math.max(...times)}ms`);
      }
    }

    writeFileSync(join(this.testDir, `benchmark-${Date.now()}.json`), JSON.stringify(results, null, 2));
    this.logger.info(`Benchmark completed and saved`);
  }

  async generateReport(format, testDir) {
    this.logger.info(`Generating ${format} test report`);
    const testFiles = execSync(`find ${testDir} -name "test-results-*.json"`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);

    if (testFiles.length === 0) {
      this.logger.error("No test results found");
      return;
    }

    const allResults = testFiles.map((file) => {
      try { return JSON.parse(readFileSync(file, "utf8")); }
      catch (error) { this.logger.warn(`Failed to read ${file}: ${error.message}`); return null; }
    }).filter(Boolean);

    const summary = calculateSummary(allResults);
    let report;
    switch (format) {
      case "json": report = JSON.stringify({ summary, results: allResults }, null, 2); break;
      case "markdown": report = generateMarkdownReport(summary, allResults); break;
      case "html": report = generateHTMLReport(summary, allResults); break;
      default: throw new Error(`Unsupported format: ${format}`);
    }

    const reportFile = join(testDir, `cleanroom-report-${Date.now()}.${format}`);
    writeFileSync(reportFile, report);
    this.logger.info(`Report generated: ${reportFile}`);
  }

  saveTestResults(results, testDir) {
    const filename = join(testDir, `test-results-${Date.now()}.json`);
    writeFileSync(filename, JSON.stringify(results, null, 2));
    this.logger.info(`Test results saved: ${filename}`);
  }

  async showHelp() {
    this.logger.info(`
GitVan Docker Cleanroom Testing Utilities:

Build cleanroom images:
   gitvan cleanroom build
   gitvan cleanroom build --type optimized --tag gitvan-cleanroom

Run test suites:
   gitvan cleanroom test
   gitvan cleanroom test --suite core
   gitvan cleanroom test --suite all --verbose

Validate Docker images:
   gitvan cleanroom validate
   gitvan cleanroom validate --image gitvan-test

Run performance benchmarks:
   gitvan cleanroom benchmark
   gitvan cleanroom benchmark --iterations 20

Generate test reports:
   gitvan cleanroom report
   gitvan cleanroom report --format json

Available Test Suites: core, ai, workflow, hooks, jtbd, all
Docker Image Types: optimized (recommended), binary, full
    `);
  }
}
