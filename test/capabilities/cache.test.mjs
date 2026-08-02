import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  VerifierReceiptCache,
  receiptHash,
  verifierCacheIdentity,
} from "../../src/capabilities/index.mjs";

function aliveReceipt(capability) {
  const body = {
    schema: "receipt",
    subject: { sha: "abc", transport: "probe" },
    capability,
    admittedDependencies: [capability],
    observations: [{ capability, ok: true, standing: "ALIVE" }],
    standing: "ALIVE",
  };
  return { ...body, hash: receiptHash(body) };
}

function identity(overrides = {}) {
  return verifierCacheIdentity({
    capability: "gitvan.receipt",
    verifier: "test/capabilities/receipt.test.mjs",
    source: { repository: "seanchatmangpt/gitvan", sha: "abc" },
    validator: { path: "test/capabilities/receipt.test.mjs", sha: "def" },
    toolchain: { node: "v20", vitest: "4.0.16" },
    environment: { platform: "linux", arch: "x64" },
    configuration: { mode: "behavior" },
    transport: "probe",
    ...overrides,
  });
}

describe("VerifierReceiptCache", () => {
  it("reuses only an exact identity match", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-cache-"));
    const cache = new VerifierReceiptCache({ root });
    const key = identity();
    const receipt = aliveReceipt("gitvan.receipt");

    await cache.put(key, receipt);
    expect((await cache.get(key)).receipt.hash).toBe(receipt.hash);
    expect(await cache.reusable(key)).toBe(true);
    expect(await cache.get(identity({ source: { repository: "seanchatmangpt/gitvan", sha: "other" } }))).toBeNull();
  });

  it("changes identity when validator toolchain or configuration changes", () => {
    const base = identity();
    expect(identity({ validator: { path: "x", sha: "changed" } }).hash).not.toBe(base.hash);
    expect(identity({ toolchain: { node: "v22" } }).hash).not.toBe(base.hash);
    expect(identity({ configuration: { mode: "surface" } }).hash).not.toBe(base.hash);
  });

  it("refuses non-ALIVE receipts and capability mismatches", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-cache-"));
    const cache = new VerifierReceiptCache({ root });
    const partialBody = { ...aliveReceipt("gitvan.receipt"), standing: "PARTIAL_ALIVE" };
    const { hash: _oldHash, ...body } = partialBody;
    const partial = { ...body, hash: receiptHash(body) };
    await expect(cache.put(identity(), partial)).rejects.toThrow(/Only ALIVE/);
    await expect(cache.put(identity(), aliveReceipt("gitvan.lock"))).rejects.toThrow(/capability mismatch/);
  });

  it("detects cache record tampering", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-cache-"));
    const cache = new VerifierReceiptCache({ root });
    const key = identity();
    await cache.put(key, aliveReceipt("gitvan.receipt"));
    const path = cache.pathFor(key);
    const record = JSON.parse(await readFile(path, "utf8"));
    record.identity.transport = "process";
    await writeFile(path, JSON.stringify(record), "utf8");
    await expect(cache.get(key)).rejects.toThrow(/identity mismatch|record hash mismatch/);
    expect(await cache.reusable(key)).toBe(false);
  });
});
