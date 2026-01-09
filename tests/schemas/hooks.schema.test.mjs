/**
 * @fileoverview Tests for hooks schema validation
 *
 * Validates that all hooks schemas work correctly and provide
 * proper error messages for invalid data.
 */

import { describe, it, expect } from "vitest";
import {
  GitHookSchema,
  GitEventDataSchema,
  EventMetadataSchema,
  HookDefinitionSchema,
  BreeJobConfigSchema,
  ExecutionContextSchema,
  HookExecutionResultSchema,
  BridgeOperationResultSchema,
  AuditLogEntrySchema,
  HuskyHookBridgeConfigSchema,
  UnrdfHooksBridgeConfigSchema,
  GlobalHooksConfigSchema,
  validateHookDefinition,
  validateGitEventData,
  validateBreeJobConfig,
  validateHuskyBridgeConfig,
  validateUnrdfBridgeConfig,
  validateGlobalHooksConfig,
  strictValidate,
} from "../../src/schemas/hooks.schema.mjs";

describe("GitHookSchema", () => {
  it("should validate valid Git hook types", () => {
    expect(GitHookSchema.safeParse("pre-commit").success).toBe(true);
    expect(GitHookSchema.safeParse("post-commit").success).toBe(true);
    expect(GitHookSchema.safeParse("pre-push").success).toBe(true);
  });

  it("should reject invalid Git hook types", () => {
    expect(GitHookSchema.safeParse("invalid-hook").success).toBe(false);
    expect(GitHookSchema.safeParse("").success).toBe(false);
    expect(GitHookSchema.safeParse(null).success).toBe(false);
  });
});

describe("GitEventDataSchema", () => {
  it("should validate minimal valid event data", () => {
    const validData = {
      hookType: "pre-commit",
      timestamp: new Date().toISOString(),
    };
    const result = GitEventDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should validate complete event data", () => {
    const validData = {
      hookType: "post-commit",
      timestamp: new Date().toISOString(),
      exitCode: 0,
      duration: 1250,
      commitHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      commitMessage: "feat: add new feature",
      stagedFiles: ["src/index.ts", "src/utils.ts"],
      filesChanged: 2,
      linesAdded: 50,
      linesDeleted: 10,
      branchName: "main",
    };
    const result = GitEventDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject invalid timestamp", () => {
    const invalidData = {
      hookType: "pre-commit",
      timestamp: "not-a-valid-timestamp",
    };
    const result = GitEventDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject invalid commit hash", () => {
    const invalidData = {
      hookType: "post-commit",
      timestamp: new Date().toISOString(),
      commitHash: "short", // Too short for a commit hash
    };
    const result = GitEventDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("HookDefinitionSchema", () => {
  it("should validate minimal hook definition", () => {
    const validHook = {
      id: "my-hook",
      name: "My Hook",
    };
    const result = HookDefinitionSchema.safeParse(validHook);
    expect(result.success).toBe(true);
  });

  it("should validate complete hook definition", () => {
    const validHook = {
      id: "pre-commit-linter",
      name: "Run linter on pre-commit",
      description: "Validates code style before commit",
      gitHookType: "pre-commit",
      breeConfig: {
        jobName: "lint-job",
        schedule: "immediate",
      },
      meta: {
        version: "1.0.0",
        author: "Developer",
        tags: ["linting", "code-quality"],
        priority: 5,
        enabled: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = HookDefinitionSchema.safeParse(validHook);
    expect(result.success).toBe(true);
  });

  it("should reject hook definition without id", () => {
    const invalidHook = {
      name: "My Hook",
    };
    const result = HookDefinitionSchema.safeParse(invalidHook);
    expect(result.success).toBe(false);
  });

  it("should reject hook definition without name", () => {
    const invalidHook = {
      id: "my-hook",
    };
    const result = HookDefinitionSchema.safeParse(invalidHook);
    expect(result.success).toBe(false);
  });

  it("should reject invalid priority", () => {
    const invalidHook = {
      id: "my-hook",
      name: "My Hook",
      meta: {
        priority: 15, // Max is 10
      },
    };
    const result = HookDefinitionSchema.safeParse(invalidHook);
    expect(result.success).toBe(false);
  });
});

describe("BreeJobConfigSchema", () => {
  it("should validate immediate schedule", () => {
    const config = {
      jobName: "my-job",
      schedule: "immediate",
    };
    const result = BreeJobConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should validate cron schedule", () => {
    const config = {
      jobName: "my-job",
      schedule: "cron",
      cron: "0 * * * *",
    };
    const result = BreeJobConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should reject cron schedule without cron field", () => {
    const config = {
      jobName: "my-job",
      schedule: "cron",
      // Missing cron field
    };
    const result = BreeJobConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should validate interval schedule", () => {
    const config = {
      jobName: "my-job",
      schedule: "interval",
      interval: "30s",
    };
    const result = BreeJobConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should reject interval schedule without interval field", () => {
    const config = {
      jobName: "my-job",
      schedule: "interval",
      // Missing interval field
    };
    const result = BreeJobConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("should validate date schedule", () => {
    const config = {
      jobName: "my-job",
      schedule: "date",
      date: new Date("2024-12-31T23:59:59Z"),
    };
    const result = BreeJobConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("should reject date schedule without date field", () => {
    const config = {
      jobName: "my-job",
      schedule: "date",
      // Missing date field
    };
    const result = BreeJobConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe("HookExecutionResultSchema", () => {
  it("should validate success result", () => {
    const result = {
      success: true,
      output: { message: "Hook executed successfully" },
      duration: 1250,
    };
    const validation = HookExecutionResultSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it("should validate failure result", () => {
    const result = {
      success: false,
      error: "Hook execution failed",
      errorStack: "Error stack trace...",
      exitCode: 1,
    };
    const validation = HookExecutionResultSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it("should reject invalid duration", () => {
    const result = {
      success: true,
      duration: -100, // Negative duration not allowed
    };
    const validation = HookExecutionResultSchema.safeParse(result);
    expect(validation.success).toBe(false);
  });
});

describe("AuditLogEntrySchema", () => {
  it("should validate complete audit log entry", () => {
    const entry = {
      eventId: "evt_123",
      hookId: "pre-commit-linter",
      executionId: "exec_456",
      timestamp: new Date().toISOString(),
      result: "success",
      duration: 1250,
      commitHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      user: "developer@example.com",
      host: "localhost",
    };
    const result = AuditLogEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  it("should reject invalid result enum", () => {
    const entry = {
      eventId: "evt_123",
      hookId: "pre-commit-linter",
      executionId: "exec_456",
      timestamp: new Date().toISOString(),
      result: "invalid-result", // Must be success/failure/error/skipped
    };
    const result = AuditLogEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });
});

describe("Configuration Schemas", () => {
  describe("HuskyHookBridgeConfigSchema", () => {
    it("should validate valid configuration", () => {
      const config = {
        cwd: "/path/to/repo",
        autoEvaluate: true,
        enableAudit: true,
        timeout: 60000,
        eventCapture: {
          enableObservability: true,
          captureEnvironment: true,
          captureDiagnostics: true,
        },
        orchestrator: {
          graphDir: "./hooks",
          timeoutMs: 300000,
        },
      };
      const result = HuskyHookBridgeConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should allow empty configuration", () => {
      const config = {};
      const result = HuskyHookBridgeConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject invalid timeout", () => {
      const config = {
        timeout: -1000, // Negative timeout not allowed
      };
      const result = HuskyHookBridgeConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("UnrdfHooksBridgeConfigSchema", () => {
    it("should validate valid configuration", () => {
      const config = {
        cwd: "/path/to/repo",
        jobsDir: "jobs",
        timeout: 30000,
        maxRetries: 3,
        enableAudit: true,
        breeConfig: {
          hasSeconds: false,
          interval: 1000,
          closeWorkerAfterMs: 5000,
          removeCompleted: true,
        },
      };
      const result = UnrdfHooksBridgeConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject invalid maxRetries", () => {
      const config = {
        maxRetries: 15, // Max is 10
      };
      const result = UnrdfHooksBridgeConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("GlobalHooksConfigSchema", () => {
    it("should validate complete configuration", () => {
      const config = {
        enabled: true,
        huskyBridge: {
          autoEvaluate: true,
          enableAudit: true,
        },
        unrdfBridge: {
          timeout: 30000,
          maxRetries: 3,
        },
        auditRetentionDays: 90,
        maxConcurrency: 5,
        enableMetrics: true,
        enableTracing: true,
        auditNotesRef: "refs/notes/gitvan/audit",
      };
      const result = GlobalHooksConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

describe("Validation Helper Functions", () => {
  describe("validateHookDefinition", () => {
    it("should return success for valid hook", () => {
      const hook = {
        id: "my-hook",
        name: "My Hook",
      };
      const result = validateHookDefinition(hook);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should return error for invalid hook", () => {
      const hook = {
        id: "", // Empty ID not allowed
        name: "My Hook",
      };
      const result = validateHookDefinition(hook);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.issues).toBeDefined();
    });
  });

  describe("validateGitEventData", () => {
    it("should return success for valid event data", () => {
      const data = {
        hookType: "pre-commit",
        timestamp: new Date().toISOString(),
      };
      const result = validateGitEventData(data);
      expect(result.success).toBe(true);
    });

    it("should return error for invalid event data", () => {
      const data = {
        hookType: "invalid-hook",
        timestamp: new Date().toISOString(),
      };
      const result = validateGitEventData(data);
      expect(result.success).toBe(false);
    });
  });

  describe("strictValidate", () => {
    it("should return data for valid input", () => {
      const hook = {
        id: "my-hook",
        name: "My Hook",
      };
      const result = strictValidate(HookDefinitionSchema, hook);
      expect(result).toEqual(hook);
    });

    it("should throw error for invalid input", () => {
      const hook = {
        id: "", // Empty ID not allowed
        name: "My Hook",
      };
      expect(() => {
        strictValidate(HookDefinitionSchema, hook, "Invalid hook");
      }).toThrow("Invalid hook");
    });

    it("should include validation details in error message", () => {
      const hook = {
        // Missing id and name
      };
      expect(() => {
        strictValidate(HookDefinitionSchema, hook, "Invalid hook");
      }).toThrow(/id/);
    });
  });
});

describe("Type Coverage", () => {
  it("should validate all Git hook types", () => {
    const hookTypes = [
      "pre-commit",
      "prepare-commit-msg",
      "commit-msg",
      "post-commit",
      "pre-push",
      "post-push",
      "post-checkout",
      "post-merge",
      "post-rewrite",
      "pre-receive",
      "update",
      "post-receive",
      "post-update",
    ];

    hookTypes.forEach((hookType) => {
      const result = GitHookSchema.safeParse(hookType);
      expect(result.success).toBe(true);
    });
  });

  it("should validate all schedule types", () => {
    const scheduleTypes = ["immediate", "cron", "interval", "date"];

    scheduleTypes.forEach((schedule) => {
      const config = {
        jobName: "test-job",
        schedule,
        // Add required fields based on schedule type
        ...(schedule === "cron" ? { cron: "0 * * * *" } : {}),
        ...(schedule === "interval" ? { interval: "30s" } : {}),
        ...(schedule === "date" ? { date: new Date() } : {}),
      };

      const result = BreeJobConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  it("should validate all audit result types", () => {
    const resultTypes = ["success", "failure", "error", "skipped"];

    resultTypes.forEach((resultType) => {
      const entry = {
        eventId: "evt_123",
        hookId: "test-hook",
        executionId: "exec_456",
        timestamp: new Date().toISOString(),
        result: resultType,
      };

      const result = AuditLogEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });
  });
});
