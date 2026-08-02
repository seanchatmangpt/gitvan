import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FileReceiptStore,
  assertReceiptedActuation,
  receiptHash,
  verifyReceipt,
} from "../../src/capabilities/index.mjs";

function makeReceipt(standing = "ALIVE") {
  const body = {
    schema: "https://gitvan.dev/schemas/capability-receipt/v1",
    subject: { repository: "seanchatmangpt/gitvan", sha: "exact", transport: "process" },
    capability: "gitvan.receipt",
    admittedDependencies: ["gitvan.receipt"],
    observations: [{ capability: "gitvan.receipt", ok: standing === "ALIVE", standing }],
    standing,
  };
  return { ...body, hash: receiptHash(body) };
}

describe("receipt generation and replay capability", () => {
  it("hashes canonically and verifies replay", () => {
    const receipt = makeReceipt();
    expect(receipt.hash).toHaveLength(64);
    expect(verifyReceipt(receipt)).toBe(true);
    expect(assertReceiptedActuation(receipt, "gitvan.receipt")).toBe(true);
  });

  it("persists immutable evidence and restores exact bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-receipt-verifier-"));
    const store = new FileReceiptStore({ root });
    const receipt = makeReceipt();
    await store.put(receipt);
    expect(await store.get("gitvan.receipt")).toEqual(receipt);
    expect(await store.getByHash("gitvan.receipt", receipt.hash)).toEqual(receipt);
    expect(await store.hasAlive("gitvan.receipt")).toBe(true);
  });

  it("refuses tampering and non-ALIVE actuation", () => {
    const receipt = makeReceipt();
    expect(() => verifyReceipt({ ...receipt, subject: { sha: "tampered" } })).toThrow(/hash mismatch/);
    expect(() => assertReceiptedActuation(makeReceipt("PARTIAL_ALIVE"), "gitvan.receipt")).toThrow(/requires an ALIVE receipt/);
  });
});
