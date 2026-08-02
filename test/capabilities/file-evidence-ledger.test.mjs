import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileEvidenceLedger } from "../../src/capabilities/index.mjs";

describe("FileEvidenceLedger", () => {
  it("appends, reloads, verifies, filters, and compacts evidence", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gitvan-evidence-"));
    let tick = 0;
    const path = join(cwd, "ledger.ndjson");
    const ledger = new FileEvidenceLedger({ path, now: () => `t${tick++}` });

    const first = await ledger.append("verification.started", { capability: "gitvan.receipt" });
    const second = await ledger.append("verification.finished", { capability: "gitvan.receipt", standing: "ALIVE" });
    expect(second.body.previousHash).toBe(first.hash);
    expect(await ledger.verify()).toEqual({ valid: true, entries: 2, head: second.hash });
    expect(await ledger.list({ capability: "gitvan.receipt" })).toHaveLength(2);
    expect((await ledger.summary()).byCapability).toEqual({ "gitvan.receipt": 2 });

    const reloaded = new FileEvidenceLedger({ path });
    expect(await reloaded.verify()).toEqual({ valid: true, entries: 2, head: second.hash });
    await reloaded.compact();
    expect((await readFile(path, "utf8")).trim().split("\n")).toHaveLength(2);
  });

  it("refuses tampered persisted evidence", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gitvan-evidence-"));
    const path = join(cwd, "ledger.ndjson");
    const ledger = new FileEvidenceLedger({ path, now: () => "t0" });
    await ledger.append("x", { capability: "gitvan.receipt" });
    const [entry] = (await readFile(path, "utf8")).trim().split("\n").map(JSON.parse);
    entry.body.payload.capability = "tampered";
    await writeFile(path, `${JSON.stringify(entry)}\n`, "utf8");
    await expect(new FileEvidenceLedger({ path }).verify()).rejects.toThrow(/hash mismatch/);
  });
});
