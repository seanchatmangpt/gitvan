import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileReceiptStore, receiptHash } from "../../src/capabilities/index.mjs";

function receipt(capability, sequence, standing = "ALIVE") {
  const body = {
    schema: "https://gitvan.dev/schemas/capability-receipt/v1",
    subject: { sequence },
    capability,
    admittedDependencies: [capability],
    observations: [{ capability, ok: standing === "ALIVE", standing }],
    standing,
  };
  return { ...body, hash: receiptHash(body) };
}

describe("FileReceiptStore", () => {
  it("preserves immutable history while advancing latest", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-receipts-"));
    const store = new FileReceiptStore({ root });
    const first = receipt("gitvan.receipt", 1);
    const second = receipt("gitvan.receipt", 2, "PARTIAL_ALIVE");

    const firstPaths = await store.put(first);
    const secondPaths = await store.put(second);

    expect((await store.get("gitvan.receipt")).hash).toBe(second.hash);
    expect((await store.getByHash("gitvan.receipt", first.hash)).subject.sequence).toBe(1);
    expect((await store.list("gitvan.receipt")).map(item => item.hash).sort()).toEqual([first.hash, second.hash].sort());
    expect(await store.verifyAll("gitvan.receipt")).toMatchObject({ valid: true, receipts: 2 });
    expect(firstPaths.historyPath).not.toBe(secondPaths.historyPath);
    expect(firstPaths.latestPath).toBe(secondPaths.latestPath);
  });

  it("deduplicates identical immutable receipts", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-receipts-"));
    const store = new FileReceiptStore({ root });
    const value = receipt("gitvan.lock", 1);
    await store.put(value);
    await store.put(value);
    expect(await store.verifyAll("gitvan.lock")).toMatchObject({ receipts: 1 });
  });

  it("refuses tampered history", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-receipts-"));
    const store = new FileReceiptStore({ root });
    const value = receipt("gitvan.lock", 1);
    const paths = await store.put(value);
    const tampered = JSON.parse(await readFile(paths.historyPath, "utf8"));
    tampered.subject.sequence = 9;
    await writeFile(paths.historyPath, JSON.stringify(tampered), "utf8");
    await expect(store.getByHash("gitvan.lock", value.hash)).rejects.toThrow(/hash mismatch/);
  });

  it("refuses malformed receipt hashes", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-receipts-"));
    const store = new FileReceiptStore({ root });
    await expect(store.getByHash("gitvan.lock", "not-a-hash")).rejects.toThrow(/Invalid receipt hash/);
  });
});
