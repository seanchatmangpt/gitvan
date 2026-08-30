import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createActuationBroker,
  verifyReceipt,
} from "../../src/enterprise/actuation-broker.mjs";

function policy(rootDir) {
  return {
    enabled: true,
    rootDir,
    actor: "svc:gitvan-ci",
    tenant: "fortune5-fixture",
    cli: { allowedCommands: [[process.execPath, "--version"]], allowedEnv: ["NODE_ENV"] },
    http: { allowedHosts: ["example.com"], allowedMethods: ["GET", "POST"] },
    file: { allowedOperations: ["read", "write"] },
  };
}

test("enterprise CLI admission is allowlist-only and strips ambient secrets", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-"));
  process.env.SUPER_SECRET_TOKEN = "must-not-cross-boundary";
  process.env.NODE_ENV = "test";
  const broker = createActuationBroker({
    id: "cli-1",
    type: "cli",
    config: { command: [process.execPath, "--version"], cwd: root, env: { NODE_ENV: "test" } },
  }, policy(root));
  const admission = broker.admit();
  assert.equal(admission.admitted, true);
  assert.equal(admission.runtime.environment.NODE_ENV, "test");
  assert.equal(admission.runtime.environment.SUPER_SECRET_TOKEN, undefined);
  assert.equal(verifyReceipt(admission.receipt), true);
  assert.equal(existsSync(admission.receiptPath), true);
  assert.equal(verifyReceipt(JSON.parse(readFileSync(admission.receiptPath, "utf8"))), true);
});

test("enterprise CLI refuses non-admitted executable, dynamic arguments, and env authority", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-"));
  for (const step of [
    { id: "bad-command", type: "cli", config: { command: ["/bin/bash", "-lc", "id"], cwd: root } },
    { id: "dynamic", type: "cli", config: { command: [process.execPath, "{{args}}"], cwd: root } },
    { id: "bad-env", type: "cli", config: { command: [process.execPath, "--version"], cwd: root, env: { AWS_SECRET_ACCESS_KEY: "x" } } },
  ]) {
    const admission = createActuationBroker(step, policy(root)).admit();
    assert.equal(admission.admitted, false);
    assert.match(admission.error.code, /REFUSED$/);
    assert.equal(verifyReceipt(admission.receipt), true);
  }
});

test("enterprise HTTP admission constrains destination, scheme, and method", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-"));
  const ok = createActuationBroker({
    id: "http-ok",
    type: "http",
    config: { url: "https://example.com/v1/data?trace=1", method: "POST" },
  }, policy(root)).admit();
  assert.equal(ok.admitted, true);

  for (const url of ["http://example.com", "https://localhost/admin", "https://{{host}}/x"]) {
    const denied = createActuationBroker({
      id: "http-denied",
      type: "http",
      config: { url, method: "GET" },
    }, policy(root)).admit();
    assert.equal(denied.admitted, false);
  }
});

test("enterprise filesystem admission fences lexical and symlink escapes", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-root-"));
  const outside = mkdtempSync(join(tmpdir(), "gitvan-enterprise-outside-"));
  writeFileSync(join(root, "inside.txt"), "ok");
  writeFileSync(join(outside, "secret.txt"), "secret");

  const ok = createActuationBroker({
    id: "read-ok",
    type: "file",
    config: { operation: "read", filePath: "inside.txt" },
  }, policy(root)).admit();
  assert.equal(ok.admitted, true);
  assert.equal(ok.step.config.filePath, join(root, "inside.txt"));

  const traversal = createActuationBroker({
    id: "escape",
    type: "file",
    config: { operation: "read", filePath: join("..", "secret.txt") },
  }, policy(root)).admit();
  assert.equal(traversal.admitted, false);

  const link = join(root, "outside-link");
  try {
    symlinkSync(outside, link, "dir");
    const symlinkEscape = createActuationBroker({
      id: "symlink-escape",
      type: "file",
      config: { operation: "read", filePath: join(link, "secret.txt") },
    }, policy(root)).admit();
    assert.equal(symlinkEscape.admitted, false);
    assert.equal(symlinkEscape.error.code, "FILESYSTEM_SYMLINK_REFUSED");
  } catch (error) {
    if (process.platform !== "win32") throw error;
  }
});

test("receipts chain execution consequence and detect tampering", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-"));
  const broker = createActuationBroker({
    id: "receipt",
    type: "file",
    config: { operation: "write", filePath: "result.txt", content: "payload" },
  }, policy(root));
  const admission = broker.admit();
  assert.equal(admission.admitted, true);
  const execution = broker.complete({ success: true, duration: 12 });
  assert.equal(execution.parentDigest, admission.receipt.digest);
  assert.equal(verifyReceipt(execution), true);
  const tampered = structuredClone(execution);
  tampered.payload.consequence.success = false;
  assert.equal(verifyReceipt(tampered), false);
});

test("enterprise step admission is default-deny outside classified capabilities", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-"));
  for (const type of ["template", "output", "custom-plugin-step"]) {
    const admission = createActuationBroker({
      id: `deny-${type}`,
      type,
      config: { outputPath: "result.txt" },
    }, policy(root)).admit();
    assert.equal(admission.admitted, false);
    assert.equal(admission.error.code, "STEP_TYPE_AUTHORITY_REFUSED");
    assert.equal(verifyReceipt(admission.receipt), true);
  }
});

test("enterprise admits bounded in-memory SPARQL without granting machine actuation", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-"));
  const admission = createActuationBroker({
    id: "query",
    type: "sparql",
    config: { query: "SELECT * WHERE { ?s ?p ?o }" },
  }, policy(root)).admit();
  assert.equal(admission.admitted, true);
  assert.deepEqual(admission.receipt.payload.target, { capability: "in-memory-sparql" });
  assert.equal(verifyReceipt(admission.receipt), true);
});

test("enterprise receipts bind sensitive fields by digest instead of serializing raw values", () => {
  const root = mkdtempSync(join(tmpdir(), "gitvan-enterprise-sensitive-"));
  const secretContent = "fortune5-secret-payload";
  const broker = createActuationBroker({
    id: "sensitive-write",
    type: "file",
    config: { operation: "write", filePath: join(root, "private.txt"), content: secretContent },
  }, policy(root));
  const admission = broker.admit();
  assert.equal(admission.admitted, true);
  const execution = broker.complete({ success: false, error: "credential=fortune5-secret-error" });
  const serialized = JSON.stringify([admission.receipt, execution]);
  assert.equal(serialized.includes(secretContent), false);
  assert.equal(serialized.includes("private.txt"), false);
  assert.equal(serialized.includes("fortune5-secret-error"), false);
  assert.equal(serialized.includes(root), false);
  assert.match(execution.payload.consequence.errorDigest, /^sha256:/);
  assert.equal(verifyReceipt(execution), true);

  const refusal = createActuationBroker({
    id: "sensitive-refusal",
    type: "file",
    config: { operation: "read", filePath: join(root, "..", "outside-secret.txt") },
  }, policy(root)).admit();
  const refusedSerialized = JSON.stringify(refusal.receipt);
  assert.equal(refusal.admitted, false);
  assert.equal(refusedSerialized.includes("outside-secret.txt"), false);
  assert.equal(refusedSerialized.includes(root), false);
  assert.match(refusal.receipt.payload.refusal.detailsDigest, /^sha256:/);
});
