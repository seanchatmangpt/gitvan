import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { StepRunner } from "../../src/workflow/step-runner.mjs";

function contextManager() {
  const values = new Map();
  return {
    async get(key) { return values.get(key); },
    async set(key, value) { values.set(key, value); },
  };
}

function enterprisePolicy(rootDir, overrides = {}) {
  return {
    enabled: true,
    rootDir,
    actor: "test:enterprise-runner",
    tenant: "fortune5-fixture",
    cli: { allowedCommands: [[process.execPath, "--version"]] },
    file: { allowedOperations: ["read", "write"] },
    http: { allowedHosts: ["127.0.0.1"], allowedMethods: ["GET"], allowHttp: true },
    ...overrides,
  };
}

describe("StepRunner enterprise actuation boundary", () => {
  let server;
  afterEach(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    server = null;
  });

  it("executes an exactly admitted CLI command with a receipt chain", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-runner-"));
    process.env.SHOULD_NOT_REACH_CHILD_TOKEN = "secret";
    const runner = new StepRunner({ enterprisePolicy: enterprisePolicy(rootDir) });
    const result = await runner.executeStep(
      { id: "node-version", type: "cli", config: { command: [process.execPath, "--version"], cwd: rootDir } },
      contextManager(), null, null
    );
    expect(result.success).toBe(true);
    expect(result.standing).toBe("EXECUTED");
    expect(result.outputs.stdout).toMatch(/^v\d+/);
    expect(result.receipts).toHaveLength(2);
    expect(result.receipts[1].parentDigest).toBe(result.receipts[0].digest);
  });

  it("refuses an unadmitted CLI command before execution", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-runner-"));
    const runner = new StepRunner({ enterprisePolicy: enterprisePolicy(rootDir) });
    const result = await runner.executeStep(
      { id: "shell", type: "cli", config: { command: ["/bin/sh", "-c", "echo should-not-run"], cwd: rootDir } },
      contextManager(), null, null
    );
    expect(result.success).toBe(false);
    expect(result.standing).toBe("REFUSED");
    expect(result.errorCode).toBe("CLI_AUTHORITY_REFUSED");
    expect(result.receipts).toHaveLength(1);
  });

  it("propagates handler-level failure instead of manufacturing success in legacy mode", async () => {
    const runner = new StepRunner();
    runner.registerHandler("fixture-failure", {
      getStepType() { return "fixture-failure"; },
      validate() { return true; },
      async execute() { return { success: false, error: "fixture failed", data: {} }; },
    });
    const result = await runner.executeStep(
      { id: "failure", type: "fixture-failure", config: {} },
      contextManager(), null, null
    );
    expect(result.success).toBe(false);
    expect(result.standing).toBe("FAILED");
    expect(result.error).toBe("fixture failed");
  });

  it("refuses a registered custom handler before execution in enterprise mode", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-runner-"));
    const runner = new StepRunner({ enterprisePolicy: enterprisePolicy(rootDir) });
    let executed = false;
    runner.registerHandler("custom-plugin-step", {
      getStepType() { return "custom-plugin-step"; },
      validate() { return true; },
      async execute() { executed = true; return { success: true, data: {} }; },
    });
    const result = await runner.executeStep(
      { id: "custom", type: "custom-plugin-step", config: {} },
      contextManager(), null, null
    );
    expect(executed).toBe(false);
    expect(result.success).toBe(false);
    expect(result.standing).toBe("REFUSED");
    expect(result.errorCode).toBe("STEP_TYPE_AUTHORITY_REFUSED");
    expect(result.receipts).toHaveLength(1);
  });

  it("does not follow an HTTP redirect outside the admitted destination", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "gitvan-runner-"));
    server = createServer((req, res) => {
      res.statusCode = 302;
      res.setHeader("location", "https://example.com/");
      res.end();
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const runner = new StepRunner({ enterprisePolicy: enterprisePolicy(rootDir) });
    const result = await runner.executeStep(
      { id: "redirect", type: "http", config: { url: `http://127.0.0.1:${port}/redirect`, method: "GET" } },
      contextManager(), null, null
    );
    expect(result.success).toBe(false);
    expect(result.standing).toBe("FAILED");
    expect(result.outputs.status).toBe(302);
    expect(result.error).toContain("redirects require explicit re-admission");
  });
});
