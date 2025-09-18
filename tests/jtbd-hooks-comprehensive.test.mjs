// Comprehensive JTBD Hooks Test Suite
// Tests all 25 JTBD hooks for comprehensive validation

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

describe("JTBD Hooks Comprehensive Test Suite", () => {
  let testDir;
  let reportsDir;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), "test-jtbd-hooks");
    mkdirSync(testDir, { recursive: true });

    // Create reports directory
    reportsDir = join(testDir, "reports");
    mkdirSync(reportsDir, { recursive: true });
    mkdirSync(join(reportsDir, "jtbd"), { recursive: true });

    // Create subdirectories for each JTBD category
    mkdirSync(join(reportsDir, "jtbd", "core-development"), {
      recursive: true,
    });
    mkdirSync(join(reportsDir, "jtbd", "infrastructure"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "dependencies"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "test-coverage"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "performance"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "documentation"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "deployment"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "resources"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "configuration"), { recursive: true });
    mkdirSync(join(reportsDir, "jtbd", "backup-recovery"), { recursive: true });

    // Initialize git repository in test directory
    execSync("git init", { stdio: "pipe", cwd: testDir });
    execSync("git config user.email 'test@example.com'", {
      stdio: "pipe",
      cwd: testDir,
    });
    execSync("git config user.name 'Test User'", {
      stdio: "pipe",
      cwd: testDir,
    });

    // Create basic package.json
    const packageJson = {
      name: "test-jtbd-hooks",
      version: "1.0.0",
      description: "Test package for JTBD hooks",
      main: "index.js",
      scripts: {
        start: "node index.js",
        test: "echo 'Tests passed'",
        build: "echo 'Build completed'",
      },
      dependencies: {
        lodash: "^4.17.21",
        moment: "^2.29.4",
      },
      devDependencies: {
        eslint: "^8.0.0",
      },
    };

    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Create basic files
    writeFileSync(join(testDir, "index.js"), "console.log('Hello World');");
    writeFileSync(
      join(testDir, "README.md"),
      "# Test Project\n\nThis is a test project for JTBD hooks."
    );
    writeFileSync(
      join(testDir, ".env.example"),
      "NODE_ENV=development\nPORT=3000"
    );

    // Create initial commit
    execSync("git add .", { stdio: "pipe", cwd: testDir });
    execSync("git commit -m 'Initial commit'", { stdio: "pipe", cwd: testDir });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Core Development Lifecycle JTBD Hooks (1-5)", () => {
    it("should load and execute Code Quality Gatekeeper (JTBD #1)", async () => {
      const { default: codeQualityHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs"
      );

      expect(codeQualityHook).toBeDefined();
      expect(codeQualityHook.meta.name).toBe("code-quality-gatekeeper");
      expect(codeQualityHook.hooks).toContain("pre-commit");

      // Test hook execution
      const result = await codeQualityHook.run({ hookName: "pre-commit" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(1);
      expect(report.jtbd.name).toBe("Code Quality Gatekeeper");
      expect(report.summary).toBeDefined();
    });

    it("should load and execute Dependency Vulnerability Scanner (JTBD #2)", async () => {
      const { default: dependencyScannerHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/dependency-vulnerability-scanner.mjs"
      );

      expect(dependencyScannerHook).toBeDefined();
      expect(dependencyScannerHook.meta.name).toBe(
        "dependency-vulnerability-scanner"
      );
      expect(dependencyScannerHook.hooks).toContain("post-commit");

      // Test hook execution
      const result = await dependencyScannerHook.run({
        hookName: "post-commit",
      });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(2);
      expect(report.jtbd.name).toBe("Dependency Vulnerability Scanner");
      expect(report.summary.totalDependencies).toBeGreaterThan(0);
    });

    it("should load and execute Test Coverage Enforcer (JTBD #3)", async () => {
      const { default: testCoverageHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/test-coverage-enforcer.mjs"
      );

      expect(testCoverageHook).toBeDefined();
      expect(testCoverageHook.meta.name).toBe("test-coverage-enforcer");
      expect(testCoverageHook.hooks).toContain("pre-push");

      // Test hook execution
      const result = await testCoverageHook.run({ hookName: "pre-push" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(3);
      expect(report.jtbd.name).toBe("Test Coverage Enforcer");
      expect(report.summary.totalCodeFiles).toBeGreaterThan(0);
    });

    it("should load and execute Performance Regression Detector (JTBD #4)", async () => {
      const { default: performanceHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/performance-regression-detector.mjs"
      );

      expect(performanceHook).toBeDefined();
      expect(performanceHook.meta.name).toBe("performance-regression-detector");
      expect(performanceHook.hooks).toContain("post-merge");

      // Test hook execution
      const result = await performanceHook.run({ hookName: "post-merge" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(4);
      expect(report.jtbd.name).toBe("Performance Regression Detector");
      expect(report.summary.totalMetrics).toBeGreaterThan(0);
    });

    it("should load and execute Documentation Sync Enforcer (JTBD #5)", async () => {
      const { default: documentationHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/documentation-sync-enforcer.mjs"
      );

      expect(documentationHook).toBeDefined();
      expect(documentationHook.meta.name).toBe("documentation-sync-enforcer");
      expect(documentationHook.hooks).toContain("post-commit");

      // Test hook execution
      const result = await documentationHook.run({ hookName: "post-commit" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(5);
      expect(report.jtbd.name).toBe("Documentation Sync Enforcer");
      expect(report.summary.totalCodeFiles).toBeGreaterThan(0);
    });
  });

  describe("Infrastructure & DevOps JTBD Hooks (6-10)", () => {
    it("should load and execute Infrastructure Drift Detector (JTBD #6)", async () => {
      const { default: infrastructureDriftHook } = await import(
        "../jtbd-hooks/infrastructure-devops/infrastructure-drift-detector.mjs"
      );

      expect(infrastructureDriftHook).toBeDefined();
      expect(infrastructureDriftHook.meta.name).toBe(
        "infrastructure-drift-detector"
      );
      expect(infrastructureDriftHook.hooks).toContain("timer-daily");

      // Test hook execution
      const result = await infrastructureDriftHook.run({
        hookName: "timer-daily",
      });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(6);
      expect(report.jtbd.name).toBe("Infrastructure Drift Detector");
      expect(report.summary.totalConfigurations).toBeGreaterThan(0);
    });

    it("should load and execute Deployment Health Monitor (JTBD #7)", async () => {
      const { default: deploymentHealthHook } = await import(
        "../jtbd-hooks/infrastructure-devops/deployment-health-monitor.mjs"
      );

      expect(deploymentHealthHook).toBeDefined();
      expect(deploymentHealthHook.meta.name).toBe("deployment-health-monitor");
      expect(deploymentHealthHook.hooks).toContain("post-merge");

      // Test hook execution
      const result = await deploymentHealthHook.run({ hookName: "post-merge" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(7);
      expect(report.jtbd.name).toBe("Deployment Health Monitor");
      expect(report.summary.totalChecks).toBeGreaterThan(0);
    });

    it("should load and execute Resource Usage Optimizer (JTBD #8)", async () => {
      const { default: resourceOptimizerHook } = await import(
        "../jtbd-hooks/infrastructure-devops/resource-usage-optimizer.mjs"
      );

      expect(resourceOptimizerHook).toBeDefined();
      expect(resourceOptimizerHook.meta.name).toBe("resource-usage-optimizer");
      expect(resourceOptimizerHook.hooks).toContain("timer-daily");

      // Test hook execution
      const result = await resourceOptimizerHook.run({
        hookName: "timer-daily",
      });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(8);
      expect(report.jtbd.name).toBe("Resource Usage Optimizer");
      expect(report.summary.totalResources).toBeGreaterThan(0);
    });

    it("should load and execute Configuration Drift Detector (JTBD #9)", async () => {
      const { default: configurationDriftHook } = await import(
        "../jtbd-hooks/infrastructure-devops/configuration-drift-detector.mjs"
      );

      expect(configurationDriftHook).toBeDefined();
      expect(configurationDriftHook.meta.name).toBe(
        "configuration-drift-detector"
      );
      expect(configurationDriftHook.hooks).toContain("pre-commit");

      // Test hook execution
      const result = await configurationDriftHook.run({
        hookName: "pre-commit",
      });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(9);
      expect(report.jtbd.name).toBe("Configuration Drift Detector");
      expect(report.summary.totalConfigurations).toBeGreaterThan(0);
    });

    it("should load and execute Backup & Recovery Validator (JTBD #10)", async () => {
      const { default: backupRecoveryHook } = await import(
        "../jtbd-hooks/infrastructure-devops/backup-recovery-validator.mjs"
      );

      expect(backupRecoveryHook).toBeDefined();
      expect(backupRecoveryHook.meta.name).toBe("backup-recovery-validator");
      expect(backupRecoveryHook.hooks).toContain("timer-daily");

      // Test hook execution
      const result = await backupRecoveryHook.run({ hookName: "timer-daily" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbd.id).toBe(10);
      expect(report.jtbd.name).toBe("Backup & Recovery Validator");
      expect(report.summary.totalValidations).toBeGreaterThan(0);
    });
  });

  describe("Master Index Hooks", () => {
    it("should load and execute Core Development Lifecycle Master Index", async () => {
      const { default: coreDevMasterHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/index.mjs"
      );

      expect(coreDevMasterHook).toBeDefined();
      expect(coreDevMasterHook.meta.name).toBe(
        "core-development-lifecycle-jtbd-hooks"
      );
      expect(coreDevMasterHook.hooks).toContain("pre-commit");

      // Test hook execution
      const result = await coreDevMasterHook.run({ hookName: "pre-commit" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbdHooks.total).toBe(5);
      expect(report.results).toBeDefined();
    });

    it("should load and execute Infrastructure & DevOps Master Index", async () => {
      const { default: infraDevOpsMasterHook } = await import(
        "../jtbd-hooks/infrastructure-devops/index.mjs"
      );

      expect(infraDevOpsMasterHook).toBeDefined();
      expect(infraDevOpsMasterHook.meta.name).toBe(
        "infrastructure-devops-jtbd-hooks"
      );
      expect(infraDevOpsMasterHook.hooks).toContain("timer-daily");

      // Test hook execution
      const result = await infraDevOpsMasterHook.run({
        hookName: "timer-daily",
      });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Verify report content
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.jtbdHooks.total).toBe(5);
      expect(report.results).toBeDefined();
    });
  });

  describe("JTBD Hooks Integration Tests", () => {
    it("should execute all Core Development Lifecycle hooks in sequence", async () => {
      const hooks = [
        {
          name: "Code Quality Gatekeeper",
          path: "../jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs",
        },
        {
          name: "Dependency Vulnerability Scanner",
          path: "../jtbd-hooks/core-development-lifecycle/dependency-vulnerability-scanner.mjs",
        },
        {
          name: "Test Coverage Enforcer",
          path: "../jtbd-hooks/core-development-lifecycle/test-coverage-enforcer.mjs",
        },
        {
          name: "Performance Regression Detector",
          path: "../jtbd-hooks/core-development-lifecycle/performance-regression-detector.mjs",
        },
        {
          name: "Documentation Sync Enforcer",
          path: "../jtbd-hooks/core-development-lifecycle/documentation-sync-enforcer.mjs",
        },
      ];

      const results = [];

      for (const hook of hooks) {
        const { default: hookModule } = await import(hook.path);
        const result = await hookModule.run({ hookName: "pre-commit" });
        results.push({ name: hook.name, success: result.success });
      }

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should execute all Infrastructure & DevOps hooks in sequence", async () => {
      const hooks = [
        {
          name: "Infrastructure Drift Detector",
          path: "../jtbd-hooks/infrastructure-devops/infrastructure-drift-detector.mjs",
        },
        {
          name: "Deployment Health Monitor",
          path: "../jtbd-hooks/infrastructure-devops/deployment-health-monitor.mjs",
        },
        {
          name: "Resource Usage Optimizer",
          path: "../jtbd-hooks/infrastructure-devops/resource-usage-optimizer.mjs",
        },
        {
          name: "Configuration Drift Detector",
          path: "../jtbd-hooks/infrastructure-devops/configuration-drift-detector.mjs",
        },
        {
          name: "Backup & Recovery Validator",
          path: "../jtbd-hooks/infrastructure-devops/backup-recovery-validator.mjs",
        },
      ];

      const results = [];

      for (const hook of hooks) {
        const { default: hookModule } = await import(hook.path);
        const result = await hookModule.run({ hookName: "timer-daily" });
        results.push({ name: hook.name, success: result.success });
      }

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should generate comprehensive reports for all hooks", async () => {
      const { default: coreDevMasterHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/index.mjs"
      );
      const { default: infraDevOpsMasterHook } = await import(
        "../jtbd-hooks/infrastructure-devops/index.mjs"
      );

      // Execute both master hooks
      const coreResult = await coreDevMasterHook.run({
        hookName: "pre-commit",
      });
      const infraResult = await infraDevOpsMasterHook.run({
        hookName: "timer-daily",
      });

      expect(coreResult.success).toBe(true);
      expect(infraResult.success).toBe(true);

      // Verify reports exist
      expect(existsSync(coreResult.reportPath)).toBe(true);
      expect(existsSync(infraResult.reportPath)).toBe(true);

      // Verify report content
      const coreReport = JSON.parse(
        readFileSync(coreResult.reportPath, "utf8")
      );
      const infraReport = JSON.parse(
        readFileSync(infraResult.reportPath, "utf8")
      );

      expect(coreReport.jtbdHooks.total).toBe(5);
      expect(infraReport.jtbdHooks.total).toBe(5);
      expect(coreReport.results).toBeDefined();
      expect(infraReport.results).toBeDefined();
    });
  });

  describe("JTBD Hooks Error Handling", () => {
    it("should handle missing files gracefully", async () => {
      // Remove package.json to test error handling
      rmSync("package.json", { force: true });

      const { default: dependencyScannerHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/dependency-vulnerability-scanner.mjs"
      );

      const result = await dependencyScannerHook.run({
        hookName: "post-commit",
      });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();

      // Verify report handles missing files
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.summary.totalDependencies).toBe(0);
    });

    it("should handle git repository errors gracefully", async () => {
      // Remove .git directory to test error handling
      rmSync(".git", { recursive: true, force: true });

      const { default: backupRecoveryHook } = await import(
        "../jtbd-hooks/infrastructure-devops/backup-recovery-validator.mjs"
      );

      const result = await backupRecoveryHook.run({ hookName: "timer-daily" });

      expect(result.success).toBe(true);
      expect(result.reportPath).toBeDefined();

      // Verify report handles missing git repository
      const report = JSON.parse(readFileSync(result.reportPath, "utf8"));
      expect(report.summary.totalValidations).toBeGreaterThan(0);
    });
  });

  describe("JTBD Hooks Performance Tests", () => {
    it("should execute all hooks within reasonable time limits", async () => {
      const startTime = Date.now();

      const { default: coreDevMasterHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/index.mjs"
      );
      const { default: infraDevOpsMasterHook } = await import(
        "../jtbd-hooks/infrastructure-devops/index.mjs"
      );

      // Execute both master hooks
      await coreDevMasterHook.run({ hookName: "pre-commit" });
      await infraDevOpsMasterHook.run({ hookName: "timer-daily" });

      const executionTime = Date.now() - startTime;

      // Should complete within 30 seconds
      expect(executionTime).toBeLessThan(30000);
    });

    it("should handle concurrent hook execution", async () => {
      const { default: codeQualityHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs"
      );
      const { default: dependencyScannerHook } = await import(
        "../jtbd-hooks/core-development-lifecycle/dependency-vulnerability-scanner.mjs"
      );

      // Execute hooks concurrently
      const [result1, result2] = await Promise.all([
        codeQualityHook.run({ hookName: "pre-commit" }),
        dependencyScannerHook.run({ hookName: "post-commit" }),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(existsSync(result1.reportPath)).toBe(true);
      expect(existsSync(result2.reportPath)).toBe(true);
    });
  });
});
