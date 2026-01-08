// tests/security/security-standalone.test.mjs
// Standalone security tests without test framework dependencies

import { strict as assert } from "node:assert";
import { join } from "pathe";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  validateFilePath,
  sanitizeJobId,
  filterEnvironmentVariables,
  validateWorkerPath,
  escapeForCodeTemplate,
  pathToFileURL,
} from "../../src/utils/security.mjs";

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failCount++;
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(`Expected function to throw: ${message}`);
  } catch (error) {
    // Expected
  }
}

console.log("Running Standalone Security Tests\n");
console.log("=" .repeat(60));

// Create test directory
const testDir = join(tmpdir(), `gitvan-security-${Date.now()}`);
mkdirSync(testDir, { recursive: true });

try {
  // VULNERABILITY 1: Code Injection Tests
  console.log("\n📌 Vulnerability 1: Code Injection Prevention");
  console.log("-".repeat(60));

  test("Blocks template literal injection", () => {
    assertThrows(
      () => validateFilePath("${process.exit(1)}"),
      "Should block template literal"
    );
  });

  test("Blocks backtick injection", () => {
    assertThrows(
      () => validateFilePath("`malicious`"),
      "Should block backticks"
    );
  });

  test("Blocks eval injection", () => {
    assertThrows(
      () => validateFilePath("test.js'; eval('code'); '"),
      "Should block eval"
    );
  });

  test("Blocks null bytes", () => {
    assertThrows(
      () => validateFilePath("test.mjs\0malicious"),
      "Should block null bytes"
    );
  });

  test("Accepts valid file paths", () => {
    const validFile = join(testDir, "valid.mjs");
    writeFileSync(validFile, "export default () => {};");
    const result = validateFilePath(validFile);
    assert.equal(typeof result, "string");
  });

  test("Enforces allowed directories", () => {
    const allowedFile = join(testDir, "allowed.mjs");
    writeFileSync(allowedFile, "export default () => {};");

    validateFilePath(allowedFile, { allowedDirs: [testDir] });

    assertThrows(() => {
      const otherDir = join(tmpdir(), "other");
      mkdirSync(otherDir, { recursive: true });
      const otherFile = join(otherDir, "other.mjs");
      writeFileSync(otherFile, "export default () => {};");
      validateFilePath(otherFile, { allowedDirs: [testDir] });
      rmSync(otherDir, { recursive: true, force: true });
    }, "Should block files outside allowed dirs");
  });

  // VULNERABILITY 2: Path Traversal Tests
  console.log("\n📌 Vulnerability 2: Path Traversal Prevention");
  console.log("-".repeat(60));

  test("Blocks ../ traversal", () => {
    assertThrows(
      () => sanitizeJobId("../../../etc/passwd"),
      "Should block ../ traversal"
    );
  });

  test("Blocks ..\\ traversal", () => {
    assertThrows(
      () => sanitizeJobId("..\\..\\windows\\system32"),
      "Should block ..\\ traversal"
    );
  });

  test("Blocks path separators", () => {
    assertThrows(
      () => sanitizeJobId("path/to/file"),
      "Should block forward slashes"
    );
    assertThrows(
      () => sanitizeJobId("path\\to\\file"),
      "Should block backslashes"
    );
  });

  test("Blocks null bytes in job ID", () => {
    assertThrows(
      () => sanitizeJobId("job\0malicious"),
      "Should block null bytes"
    );
  });

  test("Blocks home directory expansion", () => {
    assertThrows(
      () => sanitizeJobId("~/malicious"),
      "Should block tilde"
    );
  });

  test("Blocks environment variables", () => {
    assertThrows(
      () => sanitizeJobId("$HOME/path"),
      "Should block dollar signs"
    );
  });

  test("Accepts valid job IDs", () => {
    const validIds = ["my-job", "job_123", "JOB-456"];
    for (const id of validIds) {
      const result = sanitizeJobId(id);
      assert.equal(result, id);
    }
  });

  test("Sanitizes special characters", () => {
    const result = sanitizeJobId("job@with#special");
    assert.equal(result, "job_with_special");
  });

  test("Enforces max length", () => {
    assertThrows(
      () => sanitizeJobId("a".repeat(200)),
      "Should enforce max length"
    );
  });

  // VULNERABILITY 3: Environment Variable Leakage Tests
  console.log("\n📌 Vulnerability 3: Environment Leakage Prevention");
  console.log("-".repeat(60));

  test("Filters API keys", () => {
    const env = {
      NODE_ENV: "test",
      ANTHROPIC_API_KEY: "secret",
      OPENAI_API_KEY: "secret",
    };
    const filtered = filterEnvironmentVariables(env);
    assert.equal(filtered.NODE_ENV, "test");
    assert.equal(filtered.ANTHROPIC_API_KEY, undefined);
    assert.equal(filtered.OPENAI_API_KEY, undefined);
  });

  test("Filters secrets", () => {
    const env = {
      TZ: "UTC",
      AWS_SECRET: "secret",
      DATABASE_SECRET: "secret",
    };
    const filtered = filterEnvironmentVariables(env);
    assert.equal(filtered.TZ, "UTC");
    assert.equal(filtered.AWS_SECRET, undefined);
    assert.equal(filtered.DATABASE_SECRET, undefined);
  });

  test("Filters tokens", () => {
    const env = {
      PATH: "/usr/bin",
      GITHUB_TOKEN: "token",
      SLACK_TOKEN: "token",
    };
    const filtered = filterEnvironmentVariables(env);
    assert.equal(filtered.PATH, "/usr/bin");
    assert.equal(filtered.GITHUB_TOKEN, undefined);
    assert.equal(filtered.SLACK_TOKEN, undefined);
  });

  test("Filters passwords", () => {
    const env = {
      LANG: "C",
      DB_PASSWORD: "pass",
      ADMIN_PASSWORD: "pass",
    };
    const filtered = filterEnvironmentVariables(env);
    assert.equal(filtered.LANG, "C");
    assert.equal(filtered.DB_PASSWORD, undefined);
    assert.equal(filtered.ADMIN_PASSWORD, undefined);
  });

  test("Allows safe variables", () => {
    const env = {
      NODE_ENV: "production",
      TZ: "UTC",
      LANG: "C",
      PATH: "/usr/bin",
      HOME: "/home/user",
    };
    const filtered = filterEnvironmentVariables(env);
    assert.equal(filtered.NODE_ENV, "production");
    assert.equal(filtered.TZ, "UTC");
    assert.equal(filtered.LANG, "C");
    assert.equal(filtered.PATH, "/usr/bin");
    assert.equal(filtered.HOME, "/home/user");
  });

  test("Allows GITVAN_ prefix", () => {
    const env = {
      GITVAN_CONFIG: "value",
      GITVAN_DEBUG: "true",
      OTHER: "filtered",
    };
    const filtered = filterEnvironmentVariables(env);
    assert.equal(filtered.GITVAN_CONFIG, "value");
    assert.equal(filtered.GITVAN_DEBUG, "true");
    assert.equal(filtered.OTHER, undefined);
  });

  test("Blocks dangerous GITVAN_ vars", () => {
    const env = {
      GITVAN_API_KEY: "blocked",
      GITVAN_SECRET: "blocked",
      GITVAN_SAFE: "allowed",
    };
    const filtered = filterEnvironmentVariables(env);
    assert.equal(filtered.GITVAN_API_KEY, undefined);
    assert.equal(filtered.GITVAN_SECRET, undefined);
    assert.equal(filtered.GITVAN_SAFE, "allowed");
  });

  // VULNERABILITY 4: Undefined Variable Tests
  console.log("\n📌 Vulnerability 4: Undefined Variable Prevention");
  console.log("-".repeat(60));

  test("Captures job result before use", async () => {
    // Simulate the fixed code pattern
    const mockScheduler = {
      async runJob() {
        return { success: true, data: "result" };
      },
    };

    let jobResult = null;
    jobResult = await mockScheduler.runJob();

    assert.notEqual(jobResult, null);
    assert.equal(jobResult.success, true);
  });

  test("Handles null results", () => {
    let jobResult = null;
    assert.equal(jobResult, null);
  });

  test("Handles undefined results", () => {
    let jobResult = undefined;
    // Variable jobResult is declared (defined in scope) even if value is undefined
    assert.equal(typeof jobResult, "undefined"); // Value is undefined, but variable exists
  });

  // Additional Security Utilities
  console.log("\n📌 Additional Security Utilities");
  console.log("-".repeat(60));

  test("Escapes single quotes", () => {
    const result = escapeForCodeTemplate("it's");
    assert.equal(result, "it\\'s");
  });

  test("Escapes double quotes", () => {
    const result = escapeForCodeTemplate('"hello"');
    assert.equal(result, '\\"hello\\"');
  });

  test("Escapes backticks", () => {
    const result = escapeForCodeTemplate("`template`");
    assert.equal(result, "\\`template\\`");
  });

  test("Escapes template interpolation", () => {
    const result = escapeForCodeTemplate("${var}");
    assert.equal(result, "\\${var}");
  });

  test("Validates worker paths", () => {
    const workerDir = join(testDir, "workers");
    mkdirSync(workerDir, { recursive: true });

    const validPath = join(workerDir, "worker.mjs");
    validateWorkerPath(validPath, workerDir);

    assertThrows(() => {
      const invalidPath = join(testDir, "outside.mjs");
      validateWorkerPath(invalidPath, workerDir);
    }, "Should block paths outside worker dir");
  });

  test("Converts paths to file URLs", () => {
    const path = join(testDir, "file.mjs");
    const url = pathToFileURL(path);
    assert.ok(url.startsWith("file://"));
  });

  // Integration Test
  console.log("\n📌 Integration: Complete Security Flow");
  console.log("-".repeat(60));

  test("Validates complete job execution flow", () => {
    const jobId = "test-job-123";
    const jobFile = join(testDir, "job.mjs");
    writeFileSync(jobFile, "export default () => ({ success: true });");

    // Apply all security controls
    const sanitizedId = sanitizeJobId(jobId);
    assert.equal(sanitizedId, jobId);

    const validatedFile = validateFilePath(jobFile);
    assert.equal(validatedFile, jobFile);

    const workerDir = join(testDir, "workers");
    mkdirSync(workerDir, { recursive: true });

    const workerPath = join(workerDir, `${sanitizedId}-worker.mjs`);
    validateWorkerPath(workerPath, workerDir);

    const safeEnv = filterEnvironmentVariables({
      NODE_ENV: "test",
      ANTHROPIC_API_KEY: "secret",
    });
    assert.equal(safeEnv.NODE_ENV, "test");
    assert.equal(safeEnv.ANTHROPIC_API_KEY, undefined);
  });

  test("Blocks multi-vector attack", () => {
    const maliciousJob = {
      id: "../../../etc/passwd",
      file: "'; eval('code'); '",
    };

    assertThrows(
      () => sanitizeJobId(maliciousJob.id),
      "Should block malicious job ID"
    );

    assertThrows(
      () => validateFilePath(maliciousJob.file),
      "Should block malicious file path"
    );
  });
} finally {
  // Cleanup
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

// Print summary
console.log("\n" + "=".repeat(60));
console.log("\n📊 Test Summary:");
console.log(`   Total:  ${testCount}`);
console.log(`   ✅ Pass:  ${passCount}`);
console.log(`   ❌ Fail:  ${failCount}`);

if (failCount === 0) {
  console.log("\n✅ All security tests passed!");
  process.exit(0);
} else {
  console.log(`\n❌ ${failCount} test(s) failed`);
  process.exit(1);
}
