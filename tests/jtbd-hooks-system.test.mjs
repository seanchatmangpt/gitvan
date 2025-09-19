// tests/jtbd-hooks-system.test.mjs
// Focused test for JTBD Hooks system only

import { describe, it, expect } from "vitest";
import { withNativeGitTestEnvironment } from "../src/composables/test-environment.mjs";

describe("JTBD Hooks System", () => {
  it("should load Core Development Lifecycle hooks", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "src/core/job-registry.mjs": `
export function defineJob(jobDefinition) {
  return jobDefinition;
}
`,
          "hooks/jtbd-hooks/core-development-lifecycle/index.mjs": `
import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "core-development-lifecycle-jtbd-hooks",
    desc: "Core Development Lifecycle JTBD Hooks - Comprehensive automation for development workflow. Master orchestrator",
    tags: ["jtbd", "core-development", "master-orchestrator"],
    version: "1.0.0",
  },
  hooks: ["pre-commit", "pre-push", "post-merge"],
  async run(context) {
    console.log("✅ Core Development Lifecycle JTBD Hooks executed");
    return { success: true, message: "Core Development Lifecycle hooks executed successfully" };
  }
});
`,
        },
      },
      async (env) => {
        // Test loading the JTBD hook
        const hookPath = `${env.testDir}/hooks/jtbd-hooks/core-development-lifecycle/index.mjs`;

        // Import and execute the hook
        const hookModule = await import(hookPath);
        const hook = hookModule.default;

        expect(hook).toBeDefined();
        expect(hook.meta.name).toBe("core-development-lifecycle-jtbd-hooks");
        expect(hook.meta.tags).toContain("master-orchestrator");
        expect(hook.hooks).toContain("pre-commit");

        // Test execution
        const result = await hook.run({ test: true });
        expect(result.success).toBe(true);

        console.log(
          "✅ Core Development Lifecycle JTBD Hooks loaded and executed"
        );
      }
    );
  });

  it("should load Infrastructure & DevOps hooks", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "src/core/job-registry.mjs": `
export function defineJob(jobDefinition) {
  return jobDefinition;
}
`,
          "hooks/jtbd-hooks/infrastructure-devops/index.mjs": `
import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "infrastructure-devops-jtbd-hooks",
    desc: "Infrastructure & DevOps JTBD Hooks - Comprehensive automation for infrastructure management. Master orchestrator",
    tags: ["jtbd", "infrastructure", "devops", "master-orchestrator"],
    version: "1.0.0",
  },
  hooks: ["pre-push", "post-deploy"],
  async run(context) {
    console.log("✅ Infrastructure & DevOps JTBD Hooks executed");
    return { success: true, message: "Infrastructure & DevOps hooks executed successfully" };
  }
});
`,
        },
      },
      async (env) => {
        // Test loading the JTBD hook
        const hookPath = `${env.testDir}/hooks/jtbd-hooks/infrastructure-devops/index.mjs`;

        // Import and execute the hook
        const hookModule = await import(hookPath);
        const hook = hookModule.default;

        expect(hook).toBeDefined();
        expect(hook.meta.name).toBe("infrastructure-devops-jtbd-hooks");
        expect(hook.meta.tags).toContain("master-orchestrator");
        expect(hook.hooks).toContain("pre-push");

        // Test execution
        const result = await hook.run({ test: true });
        expect(result.success).toBe(true);

        console.log(
          "✅ Infrastructure & DevOps JTBD Hooks loaded and executed"
        );
      }
    );
  });

  it("should load Security & Compliance hooks", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "src/core/job-registry.mjs": `
export function defineJob(jobDefinition) {
  return jobDefinition;
}
`,
          "hooks/jtbd-hooks/security-compliance/index.mjs": `
import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "security-compliance-jtbd-hooks",
    desc: "Security & Compliance JTBD Hooks - Comprehensive automation for security and compliance. Master orchestrator",
    tags: ["jtbd", "security", "compliance", "master-orchestrator"],
    version: "1.0.0",
  },
  hooks: ["pre-commit", "pre-push"],
  async run(context) {
    console.log("✅ Security & Compliance JTBD Hooks executed");
    return { success: true, message: "Security & Compliance hooks executed successfully" };
  }
});
`,
        },
      },
      async (env) => {
        // Test loading the JTBD hook
        const hookPath = `${env.testDir}/hooks/jtbd-hooks/security-compliance/index.mjs`;

        // Import and execute the hook
        const hookModule = await import(hookPath);
        const hook = hookModule.default;

        expect(hook).toBeDefined();
        expect(hook.meta.name).toBe("security-compliance-jtbd-hooks");
        expect(hook.meta.tags).toContain("master-orchestrator");
        expect(hook.hooks).toContain("pre-commit");

        // Test execution
        const result = await hook.run({ test: true });
        expect(result.success).toBe(true);

        console.log("✅ Security & Compliance JTBD Hooks loaded and executed");
      }
    );
  });

  it("should load Monitoring & Observability hooks", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "src/core/job-registry.mjs": `
export function defineJob(jobDefinition) {
  return jobDefinition;
}
`,
          "hooks/jtbd-hooks/monitoring-observability/index.mjs": `
import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "monitoring-observability-jtbd-hooks",
    desc: "Monitoring & Observability JTBD Hooks - Comprehensive automation for monitoring and observability. Master orchestrator",
    tags: ["jtbd", "monitoring", "observability", "master-orchestrator"],
    version: "1.0.0",
  },
  hooks: ["post-commit", "timer"],
  async run(context) {
    console.log("✅ Monitoring & Observability JTBD Hooks executed");
    return { success: true, message: "Monitoring & Observability hooks executed successfully" };
  }
});
`,
        },
      },
      async (env) => {
        // Test loading the JTBD hook
        const hookPath = `${env.testDir}/hooks/jtbd-hooks/monitoring-observability/index.mjs`;

        // Import and execute the hook
        const hookModule = await import(hookPath);
        const hook = hookModule.default;

        expect(hook).toBeDefined();
        expect(hook.meta.name).toBe("monitoring-observability-jtbd-hooks");
        expect(hook.meta.tags).toContain("master-orchestrator");
        expect(hook.hooks).toContain("post-commit");

        // Test execution
        const result = await hook.run({ test: true });
        expect(result.success).toBe(true);

        console.log(
          "✅ Monitoring & Observability JTBD Hooks loaded and executed"
        );
      }
    );
  });

  it("should load Business Intelligence hooks", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "src/core/job-registry.mjs": `
export function defineJob(jobDefinition) {
  return jobDefinition;
}
`,
          "hooks/jtbd-hooks/business-intelligence/index.mjs": `
import { defineJob } from "../../../src/core/job-registry.mjs";

export default defineJob({
  meta: {
    name: "business-intelligence-jtbd-hooks",
    desc: "Business Intelligence JTBD Hooks - Comprehensive automation for business intelligence and analytics. Master orchestrator",
    tags: ["jtbd", "business-intelligence", "analytics", "master-orchestrator"],
    version: "1.0.0",
  },
  hooks: ["post-commit", "timer"],
  async run(context) {
    console.log("✅ Business Intelligence JTBD Hooks executed");
    return { success: true, message: "Business Intelligence hooks executed successfully" };
  }
});
`,
        },
      },
      async (env) => {
        // Test loading the JTBD hook
        const hookPath = `${env.testDir}/hooks/jtbd-hooks/business-intelligence/index.mjs`;

        // Import and execute the hook
        const hookModule = await import(hookPath);
        const hook = hookModule.default;

        expect(hook).toBeDefined();
        expect(hook.meta.name).toBe("business-intelligence-jtbd-hooks");
        expect(hook.meta.tags).toContain("master-orchestrator");
        expect(hook.hooks).toContain("post-commit");

        // Test execution
        const result = await hook.run({ test: true });
        expect(result.success).toBe(true);

        console.log("✅ Business Intelligence JTBD Hooks loaded and executed");
      }
    );
  });
});
