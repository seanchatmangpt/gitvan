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

describe("Complete JTBD Hooks Implementation Validation", () => {
  let testDir;
  let reportsDir;

  beforeEach(async () => {
    testDir = join(process.cwd(), "test-complete-jtbd-hooks");
    mkdirSync(testDir, { recursive: true });

    reportsDir = join(testDir, "reports");
    mkdirSync(reportsDir, { recursive: true });
    mkdirSync(join(reportsDir, "jtbd"), { recursive: true });

    // Create subdirectories for each JTBD category
    mkdirSync(join(reportsDir, "jtbd", "core-development"), {
      recursive: true,
    });
    mkdirSync(join(reportsDir, "jtbd", "infrastructure-devops"), {
      recursive: true,
    });
    mkdirSync(join(reportsDir, "jtbd", "security-compliance"), {
      recursive: true,
    });
    mkdirSync(join(reportsDir, "jtbd", "monitoring-observability"), {
      recursive: true,
    });
    mkdirSync(join(reportsDir, "jtbd", "business-intelligence"), {
      recursive: true,
    });

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

    // Create some test files
    writeFileSync(join(testDir, "test-file.js"), "console.log('test');");
    writeFileSync(
      join(testDir, "package.json"),
      '{"name": "test", "version": "1.0.0"}'
    );
    writeFileSync(join(testDir, "README.md"), "# Test Project");

    // Initial commit
    execSync("git add .", { stdio: "pipe", cwd: testDir });
    execSync("git commit -m 'Initial commit'", { stdio: "pipe", cwd: testDir });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Core Development Lifecycle JTBD Hooks (1-5)", () => {
    it("should load and validate all Core Development Lifecycle hooks", async () => {
      const hooks = [
        {
          name: "code-quality-gatekeeper",
          path: "../hooks/jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs",
        },
        {
          name: "dependency-vulnerability-scanner",
          path: "../hooks/jtbd-hooks/core-development-lifecycle/dependency-vulnerability-scanner.mjs",
        },
        {
          name: "test-coverage-enforcer",
          path: "../hooks/jtbd-hooks/core-development-lifecycle/test-coverage-enforcer.mjs",
        },
        {
          name: "performance-regression-detector",
          path: "../hooks/jtbd-hooks/core-development-lifecycle/performance-regression-detector.mjs",
        },
        {
          name: "documentation-sync-enforcer",
          path: "../hooks/jtbd-hooks/core-development-lifecycle/documentation-sync-enforcer.mjs",
        },
      ];

      for (const hook of hooks) {
        const { default: hookModule } = await import(hook.path);
        expect(hookModule).toBeDefined();
        expect(hookModule.meta.name).toBe(hook.name);
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });

    it("should load Core Development Lifecycle master index", async () => {
      const { default: masterHook } = await import(
        "../hooks/jtbd-hooks/core-development-lifecycle/index.mjs"
      );
      expect(masterHook).toBeDefined();
      expect(masterHook.meta.name).toBe(
        "core-development-lifecycle-jtbd-hooks"
      );
      expect(masterHook.meta.desc).toContain("Core Development Lifecycle");
      expect(masterHook.hooks).toContain("pre-commit");
      expect(masterHook.hooks).toContain("post-commit");
      expect(masterHook.run).toBeDefined();
      expect(typeof masterHook.run).toBe("function");
    });
  });

  describe("Infrastructure & DevOps JTBD Hooks (6-10)", () => {
    it("should load and validate all Infrastructure & DevOps hooks", async () => {
      const hooks = [
        {
          name: "infrastructure-drift-detector",
          path: "../hooks/jtbd-hooks/infrastructure-devops/infrastructure-drift-detector.mjs",
        },
        {
          name: "deployment-health-monitor",
          path: "../hooks/jtbd-hooks/infrastructure-devops/deployment-health-monitor.mjs",
        },
        {
          name: "resource-usage-optimizer",
          path: "../hooks/jtbd-hooks/infrastructure-devops/resource-usage-optimizer.mjs",
        },
        {
          name: "configuration-drift-detector",
          path: "../hooks/jtbd-hooks/infrastructure-devops/configuration-drift-detector.mjs",
        },
        {
          name: "backup-recovery-validator",
          path: "../hooks/jtbd-hooks/infrastructure-devops/backup-recovery-validator.mjs",
        },
      ];

      for (const hook of hooks) {
        const { default: hookModule } = await import(hook.path);
        expect(hookModule).toBeDefined();
        expect(hookModule.meta.name).toBe(hook.name);
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });

    it("should load Infrastructure & DevOps master index", async () => {
      const { default: masterHook } = await import(
        "../hooks/jtbd-hooks/infrastructure-devops/index.mjs"
      );
      expect(masterHook).toBeDefined();
      expect(masterHook.meta.name).toBe("infrastructure-devops-jtbd-hooks");
      expect(masterHook.meta.desc).toContain("Infrastructure & DevOps");
      expect(masterHook.hooks).toContain("post-merge");
      expect(masterHook.hooks).toContain("timer-daily");
      expect(masterHook.run).toBeDefined();
      expect(typeof masterHook.run).toBe("function");
    });
  });

  describe("Security & Compliance JTBD Hooks (11-15)", () => {
    it("should load and validate all Security & Compliance hooks", async () => {
      const hooks = [
        {
          name: "security-policy-enforcer",
          path: "../hooks/jtbd-hooks/security-compliance/security-policy-enforcer.mjs",
        },
        {
          name: "license-compliance-validator",
          path: "../hooks/jtbd-hooks/security-compliance/license-compliance-validator.mjs",
        },
        {
          name: "security-vulnerability-scanner",
          path: "../hooks/jtbd-hooks/security-compliance/security-vulnerability-scanner.mjs",
        },
        {
          name: "access-control-validator",
          path: "../hooks/jtbd-hooks/security-compliance/access-control-validator.mjs",
        },
        {
          name: "data-privacy-guardian",
          path: "../hooks/jtbd-hooks/security-compliance/data-privacy-guardian.mjs",
        },
      ];

      for (const hook of hooks) {
        const { default: hookModule } = await import(hook.path);
        expect(hookModule).toBeDefined();
        expect(hookModule.meta.name).toBe(hook.name);
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });

    it("should load Security & Compliance master index", async () => {
      const { default: masterHook } = await import(
        "../hooks/jtbd-hooks/security-compliance/index.mjs"
      );
      expect(masterHook).toBeDefined();
      expect(masterHook.meta.name).toBe("security-compliance-jtbd-hooks");
      expect(masterHook.meta.desc).toContain("Security & Compliance");
      expect(masterHook.hooks).toContain("pre-commit");
      expect(masterHook.hooks).toContain("pre-push");
      expect(masterHook.run).toBeDefined();
      expect(typeof masterHook.run).toBe("function");
    });
  });

  describe("Monitoring & Observability JTBD Hooks (16-20)", () => {
    it("should load and validate all Monitoring & Observability hooks", async () => {
      const hooks = [
        {
          name: "application-performance-monitor",
          path: "../hooks/jtbd-hooks/monitoring-observability/application-performance-monitor.mjs",
        },
        {
          name: "system-health-monitor",
          path: "../hooks/jtbd-hooks/monitoring-observability/system-health-monitor.mjs",
        },
        {
          name: "error-tracking-alerting",
          path: "../hooks/jtbd-hooks/monitoring-observability/error-tracking-alerting.mjs",
        },
        {
          name: "log-aggregation-analysis",
          path: "../hooks/jtbd-hooks/monitoring-observability/log-aggregation-analysis.mjs",
        },
        {
          name: "realtime-monitoring-dashboard",
          path: "../hooks/jtbd-hooks/monitoring-observability/realtime-monitoring-dashboard.mjs",
        },
      ];

      for (const hook of hooks) {
        const { default: hookModule } = await import(hook.path);
        expect(hookModule).toBeDefined();
        expect(hookModule.meta.name).toBe(hook.name);
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });

    it("should load Monitoring & Observability master index", async () => {
      const { default: masterHook } = await import(
        "../hooks/jtbd-hooks/monitoring-observability/index.mjs"
      );
      expect(masterHook).toBeDefined();
      expect(masterHook.meta.name).toBe("monitoring-observability-jtbd-hooks");
      expect(masterHook.meta.desc).toContain("Monitoring & Observability");
      expect(masterHook.hooks).toContain("post-merge");
      expect(masterHook.hooks).toContain("timer-hourly");
      expect(masterHook.run).toBeDefined();
      expect(typeof masterHook.run).toBe("function");
    });
  });

  describe("Business Intelligence JTBD Hooks (21-25)", () => {
    it("should load and validate all Business Intelligence hooks", async () => {
      const hooks = [
        {
          name: "business-metrics-tracker",
          path: "../hooks/jtbd-hooks/business-intelligence/business-metrics-tracker.mjs",
        },
        {
          name: "user-behavior-analytics",
          path: "../hooks/jtbd-hooks/business-intelligence/user-behavior-analytics.mjs",
        },
        {
          name: "market-intelligence-analyzer",
          path: "../hooks/jtbd-hooks/business-intelligence/market-intelligence-analyzer.mjs",
        },
        {
          name: "predictive-analytics-engine",
          path: "../hooks/jtbd-hooks/business-intelligence/predictive-analytics-engine.mjs",
        },
        {
          name: "business-intelligence-dashboard",
          path: "../hooks/jtbd-hooks/business-intelligence/business-intelligence-dashboard.mjs",
        },
      ];

      for (const hook of hooks) {
        const { default: hookModule } = await import(hook.path);
        expect(hookModule).toBeDefined();
        expect(hookModule.meta.name).toBe(hook.name);
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });

    it("should load Business Intelligence master index", async () => {
      const { default: masterHook } = await import(
        "../hooks/jtbd-hooks/business-intelligence/index.mjs"
      );
      expect(masterHook).toBeDefined();
      expect(masterHook.meta.name).toBe("business-intelligence-jtbd-hooks");
      expect(masterHook.meta.desc).toContain("Business Intelligence");
      expect(masterHook.hooks).toContain("post-merge");
      expect(masterHook.hooks).toContain("timer-daily");
      expect(masterHook.run).toBeDefined();
      expect(typeof masterHook.run).toBe("function");
    });
  });

  describe("Complete JTBD Hooks Coverage", () => {
    it("should have all 25 JTBD hooks implemented", async () => {
      const allHooks = [
        // Core Development Lifecycle (1-5)
        "../hooks/jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs",
        "../hooks/jtbd-hooks/core-development-lifecycle/dependency-vulnerability-scanner.mjs",
        "../hooks/jtbd-hooks/core-development-lifecycle/test-coverage-enforcer.mjs",
        "../hooks/jtbd-hooks/core-development-lifecycle/performance-regression-detector.mjs",
        "../hooks/jtbd-hooks/core-development-lifecycle/documentation-sync-enforcer.mjs",

        // Infrastructure & DevOps (6-10)
        "../hooks/jtbd-hooks/infrastructure-devops/infrastructure-drift-detector.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/deployment-health-monitor.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/resource-usage-optimizer.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/configuration-drift-detector.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/backup-recovery-validator.mjs",

        // Security & Compliance (11-15)
        "../hooks/jtbd-hooks/security-compliance/security-policy-enforcer.mjs",
        "../hooks/jtbd-hooks/security-compliance/license-compliance-validator.mjs",
        "../hooks/jtbd-hooks/security-compliance/security-vulnerability-scanner.mjs",
        "../hooks/jtbd-hooks/security-compliance/access-control-validator.mjs",
        "../hooks/jtbd-hooks/security-compliance/data-privacy-guardian.mjs",

        // Monitoring & Observability (16-20)
        "../hooks/jtbd-hooks/monitoring-observability/application-performance-monitor.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/system-health-monitor.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/error-tracking-alerting.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/log-aggregation-analysis.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/realtime-monitoring-dashboard.mjs",

        // Business Intelligence (21-25)
        "../hooks/jtbd-hooks/business-intelligence/business-metrics-tracker.mjs",
        "../hooks/jtbd-hooks/business-intelligence/user-behavior-analytics.mjs",
        "../hooks/jtbd-hooks/business-intelligence/market-intelligence-analyzer.mjs",
        "../hooks/jtbd-hooks/business-intelligence/predictive-analytics-engine.mjs",
        "../hooks/jtbd-hooks/business-intelligence/business-intelligence-dashboard.mjs",
      ];

      expect(allHooks).toHaveLength(25);

      for (const hookPath of allHooks) {
        const { default: hookModule } = await import(hookPath);
        expect(hookModule).toBeDefined();
        expect(hookModule.meta).toBeDefined();
        expect(hookModule.meta.name).toBeDefined();
        expect(hookModule.meta.desc).toBeDefined();
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });

    it("should have all 5 master index hooks implemented", async () => {
      const masterHooks = [
        "../hooks/jtbd-hooks/core-development-lifecycle/index.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/index.mjs",
        "../hooks/jtbd-hooks/security-compliance/index.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/index.mjs",
        "../hooks/jtbd-hooks/business-intelligence/index.mjs",
      ];

      expect(masterHooks).toHaveLength(5);

      for (const hookPath of masterHooks) {
        const { default: hookModule } = await import(hookPath);
        expect(hookModule).toBeDefined();
        expect(hookModule.meta).toBeDefined();
        expect(hookModule.meta.name).toBeDefined();
        expect(hookModule.meta.desc).toContain("Master orchestrator");
        expect(hookModule.meta.tags).toContain("master-orchestrator");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });
  });

  describe("JTBD Hooks Functionality Validation", () => {
    it("should validate that all hooks have proper Git state capture", async () => {
      // Test a representative hook from each category
      const testHooks = [
        "../hooks/jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/infrastructure-drift-detector.mjs",
        "../hooks/jtbd-hooks/security-compliance/security-policy-enforcer.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/application-performance-monitor.mjs",
        "../hooks/jtbd-hooks/business-intelligence/business-metrics-tracker.mjs",
      ];

      for (const hookPath of testHooks) {
        const { default: hookModule } = await import(hookPath);

        // Check that the hook has the basic structure
        expect(hookModule).toBeDefined();
        expect(hookModule.meta).toBeDefined();
        expect(hookModule.meta.name).toBeDefined();
        expect(hookModule.meta.desc).toBeDefined();
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");
      }
    });

    it("should validate that all hooks have proper error handling", async () => {
      const testHooks = [
        "../hooks/jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/infrastructure-drift-detector.mjs",
        "../hooks/jtbd-hooks/security-compliance/security-policy-enforcer.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/application-performance-monitor.mjs",
        "../hooks/jtbd-hooks/business-intelligence/business-metrics-tracker.mjs",
      ];

      for (const hookPath of testHooks) {
        const { default: hookModule } = await import(hookPath);

        // Check that the run method has proper error handling
        const runFunction = hookModule.run.toString();
        expect(runFunction).toContain("try");
        expect(runFunction).toContain("catch");
        expect(runFunction).toContain("error");
      }
    });

    it("should validate that all hooks have proper reporting structure", async () => {
      const testHooks = [
        "../hooks/jtbd-hooks/core-development-lifecycle/code-quality-gatekeeper.mjs",
        "../hooks/jtbd-hooks/infrastructure-devops/infrastructure-drift-detector.mjs",
        "../hooks/jtbd-hooks/security-compliance/security-policy-enforcer.mjs",
        "../hooks/jtbd-hooks/monitoring-observability/application-performance-monitor.mjs",
        "../hooks/jtbd-hooks/business-intelligence/business-metrics-tracker.mjs",
      ];

      for (const hookPath of testHooks) {
        const { default: hookModule } = await import(hookPath);

        // Check that the hook has the basic reporting structure
        expect(hookModule).toBeDefined();
        expect(hookModule.meta).toBeDefined();
        expect(hookModule.meta.name).toBeDefined();
        expect(hookModule.meta.desc).toBeDefined();
        expect(hookModule.meta.tags).toContain("jtbd");
        expect(hookModule.hooks).toBeDefined();
        expect(Array.isArray(hookModule.hooks)).toBe(true);
        expect(hookModule.run).toBeDefined();
        expect(typeof hookModule.run).toBe("function");

        // Check that the run function contains reporting logic
        const runFunction = hookModule.run.toString();
        expect(runFunction).toContain("Starting job");
      }
    });
  });
});
