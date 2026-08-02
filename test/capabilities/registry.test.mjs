import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useRegistry } from "../../src/composables/registry.mjs";

async function fixture() {
  const cwd = await mkdtemp(join(tmpdir(), "gitvan-registry-verifier-"));
  await mkdir(join(cwd, "jobs"), { recursive: true });
  await writeFile(join(cwd, "jobs", "verify.mjs"), `
    export const meta = { name: "Verify", desc: "Verify exact subject", tags: ["evidence"] };
    export default async function run() { return { ok: true }; }
  `, "utf8");
  return cwd;
}

describe("registry lookup and refusal capability", () => {
  it("indexes and retrieves discovered jobs", async () => {
    const cwd = await fixture();
    await withGitVan({ cwd, env: {}, now: () => "2026-08-02T00:00:00.000Z" }, async () => {
      const registry = useRegistry();
      const jobs = await registry.getJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({ id: "verify", name: "Verify", tags: ["evidence"] });
      expect((await registry.getJob("verify")).definition.run).toBeTypeOf("function");
      expect(await registry.search("exact", { types: ["jobs"] })).toMatchObject({ total: 1 });
    });
  });

  it("groups records by public ontology dimensions", async () => {
    const cwd = await fixture();
    await withGitVan({ cwd, env: {} }, async () => {
      const registry = useRegistry();
      const items = [
        { id: "a", tags: ["ci", "build"], type: "job", jobId: "a", category: "core" },
        { id: "b", tags: ["ci"], type: "event", jobId: "a", category: "core" },
      ];
      expect(registry.groupByTag(items).ci).toHaveLength(2);
      expect(registry.groupByType(items).job).toHaveLength(1);
      expect(registry.groupByJob(items).a).toHaveLength(2);
      expect(registry.groupByCategory(items).core).toHaveLength(2);
    });
  });

  it("preserves unknown lookup failure context", async () => {
    const cwd = await fixture();
    await withGitVan({ cwd, env: {} }, async () => {
      const registry = useRegistry();
      await expect(registry.getJob("missing")).rejects.toThrow(/Failed to get job missing/);
    });
  });
});
