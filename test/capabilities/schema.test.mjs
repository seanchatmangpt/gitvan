import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  CapabilityBatchRunner,
  CapabilityClaimLedger,
  capabilityReport,
  createGitVanCapabilityRegistry,
  verifierCacheIdentity,
  verifyCapability,
} from "../../src/capabilities/index.mjs";

async function schema(name) {
  return JSON.parse(await readFile(new URL(`../../schemas/${name}`, import.meta.url), "utf8"));
}

function validator(document) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(document);
}

describe("capability artifact schemas", () => {
  it("validates capability receipts", async () => {
    const registry = createGitVanCapabilityRegistry();
    let tick = 0;
    const receipt = await verifyCapability(registry, "gitvan.receipt", {
      now: () => `t${tick++}`,
      subject: { sha: "exact", transport: "custom" },
      execute: async () => ({ ok: true, standing: "ALIVE", output: "pass" }),
    });
    const validate = validator(await schema("capability-receipt.schema.json"));
    expect(validate(receipt), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...receipt, hash: "invalid" })).toBe(false);
  });

  it("validates batch receipts", async () => {
    const registry = createGitVanCapabilityRegistry();
    const receipt = await new CapabilityBatchRunner({
      registry,
      execute: async () => ({ ok: true, standing: "ALIVE", output: null }),
      subject: { sha: "exact" },
    }).run(["gitvan.lock"]);
    const validate = validator(await schema("capability-batch-receipt.schema.json"));
    expect(validate(receipt), JSON.stringify(validate.errors)).toBe(true);
  });

  it("validates reports and claims", async () => {
    const registry = createGitVanCapabilityRegistry();
    const receipt = await verifyCapability(registry, "gitvan.receipt", {
      subject: { sha: "exact" },
      execute: async () => ({ ok: true, standing: "ALIVE" }),
    });
    const report = capabilityReport([receipt], { title: "Exact", generatedAt: "2026-08-02T00:00:00.000Z" });
    const claims = new CapabilityClaimLedger(registry.list(), { expectedSubject: { sha: "exact" } });
    claims.ingest(receipt);

    const validateReport = validator(await schema("capability-report.schema.json"));
    const validateClaims = validator(await schema("capability-claims.schema.json"));
    expect(validateReport(report), JSON.stringify(validateReport.errors)).toBe(true);
    expect(validateClaims(claims.summary()), JSON.stringify(validateClaims.errors)).toBe(true);
  });

  it("validates verifier cache identities", async () => {
    const identity = verifierCacheIdentity({
      capability: "gitvan.receipt",
      verifier: "test/capabilities/receipt.test.mjs",
      source: { sha: "exact" },
      validator: { sha: "validator" },
      toolchain: { node: "v20" },
      environment: { platform: "linux" },
      configuration: { mode: "behavior" },
      transport: "process",
    });
    const validate = validator(await schema("verifier-cache-identity.schema.json"));
    expect(validate(identity), JSON.stringify(validate.errors)).toBe(true);
  });
});
