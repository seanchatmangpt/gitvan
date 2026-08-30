import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createActuationBroker, verifyReceipt } from "../src/enterprise/actuation-broker.mjs";

const rootDir = mkdtempSync(join(tmpdir(), "gitvan-enterprise-verifier-"));
const policy = {
  enabled: true,
  rootDir,
  actor: "verifier:enterprise-readiness",
  tenant: "verification-fixture",
  cli: { allowedCommands: [[process.execPath, "--version"]] },
  http: { allowedHosts: ["example.com"], allowedMethods: ["GET"] },
  file: { allowedOperations: ["read", "write"] },
};

const checks = [];
function check(name, condition, evidence = {}) {
  checks.push({ name, passed: Boolean(condition), evidence });
}

const allowed = createActuationBroker({
  id: "allowed-cli",
  type: "cli",
  config: { command: [process.execPath, "--version"], cwd: rootDir },
}, policy);
const allowedAdmission = allowed.admit();
const allowedExecution = allowed.complete({ success: true, exitCode: 0 });
check("admitted CLI produces verifiable receipt chain",
  allowedAdmission.admitted &&
  verifyReceipt(allowedAdmission.receipt) &&
  verifyReceipt(allowedExecution) &&
  allowedExecution.parentDigest === allowedAdmission.receipt.digest);

const forbiddenCli = createActuationBroker({
  id: "forbidden-cli",
  type: "cli",
  config: { command: ["/bin/bash", "-lc", "whoami"], cwd: rootDir },
}, policy).admit();
check("unknown CLI executable is refused", !forbiddenCli.admitted, { code: forbiddenCli.error?.code });

const forbiddenHttp = createActuationBroker({
  id: "forbidden-http",
  type: "http",
  config: { url: "https://127.0.0.1/admin", method: "GET" },
}, policy).admit();
check("unadmitted HTTP destination is refused", !forbiddenHttp.admitted, { code: forbiddenHttp.error?.code });

const forbiddenFile = createActuationBroker({
  id: "forbidden-file",
  type: "file",
  config: { operation: "write", filePath: "../escape.txt", content: "x" },
}, policy).admit();
check("filesystem escape is refused", !forbiddenFile.admitted, { code: forbiddenFile.error?.code });

const missingIdentity = createActuationBroker({
  id: "identity",
  type: "cli",
  config: { command: [process.execPath, "--version"], cwd: rootDir },
}, { ...policy, actor: null }).admit();
check("missing enterprise identity is refused", !missingIdentity.admitted, { code: missingIdentity.error?.code });

const passed = checks.every((entry) => entry.passed);
const report = {
  schema: "gitvan.enterprise.verifier.v1",
  standing: passed ? "ALIVE" : "BUILD_BROKEN",
  node: process.version,
  platform: process.platform,
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (!passed) process.exit(1);
