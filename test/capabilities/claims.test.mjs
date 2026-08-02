import { describe, expect, it } from "vitest";
import {
  CapabilityClaimLedger,
  claimsToTOML,
  createGitVanCapabilityRegistry,
  receiptHash,
} from "../../src/capabilities/index.mjs";

function receipt(capability, subject, standing = "ALIVE") {
  const body = {
    schema: "receipt",
    subject,
    capability,
    admittedDependencies: [capability],
    observations: [{ capability, ok: standing === "ALIVE", standing }],
    standing,
  };
  return { ...body, hash: receiptHash(body) };
}

describe("CapabilityClaimLedger", () => {
  it("starts UNKNOWN regardless of declared standing", () => {
    const ledger = new CapabilityClaimLedger(createGitVanCapabilityRegistry().list());
    expect(ledger.require("gitvan.receipt")).toMatchObject({
      declaredStanding: "PARTIAL_ALIVE",
      standing: "UNKNOWN",
    });
  });

  it("admits replay-verified exact-subject receipts", () => {
    const ledger = new CapabilityClaimLedger(createGitVanCapabilityRegistry().list(), {
      expectedSubject: { repository: "seanchatmangpt/gitvan", sha: "abc" },
    });
    const value = receipt("gitvan.receipt", { repository: "seanchatmangpt/gitvan", sha: "abc", transport: "probe" });
    const claim = ledger.ingest(value);
    expect(claim.standing).toBe("ALIVE");
    expect(ledger.assertAlive("gitvan.receipt").receiptHash).toBe(value.hash);
    expect(ledger.receipt(value.hash)).toEqual(value);
    expect(ledger.summary().byStanding).toMatchObject({ ALIVE: 1, UNKNOWN: 8 });
    expect(claimsToTOML(ledger.summary())).toContain('id = "gitvan.receipt"');
  });

  it("keeps mismatched subjects UNKNOWN", () => {
    const ledger = new CapabilityClaimLedger(createGitVanCapabilityRegistry().list(), {
      expectedSubject: { sha: "expected" },
    });
    expect(ledger.ingest(receipt("gitvan.lock", { sha: "other" })).standing).toBe("UNKNOWN");
    expect(() => ledger.assertAlive("gitvan.lock")).toThrow(/not ALIVE/);
  });

  it("refuses unknown capabilities and tampered receipts", () => {
    const ledger = new CapabilityClaimLedger(createGitVanCapabilityRegistry().list());
    expect(() => ledger.ingest(receipt("gitvan.unknown", {}))).toThrow(/Unknown capability claim/);
    const value = receipt("gitvan.receipt", {});
    expect(() => ledger.ingest({ ...value, hash: "0".repeat(64) })).toThrow(/hash mismatch/);
  });
});
