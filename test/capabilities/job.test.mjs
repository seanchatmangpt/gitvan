import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createJobDiscovery } from "../../src/composables/job-discovery.mjs";
import { createJobExecution } from "../../src/composables/job-execution.mjs";

async function fixture() {
  const cwd = await mkdtemp(join(tmpdir(), "gitvan-job-verifier-"));
  await mkdir(join(cwd, "jobs", "build"), { recursive: true });
  await writeFile(join(cwd, "jobs", "build", "compile.mjs"), `
    export const meta = { name: "Compile", desc: "Compile sources", tags: ["build", "ci"] };
    export const cron = "0 * * * *";
    export default async function run({ payload }) { return { ok: true, payload }; }
  `, "utf8");
  return cwd;
}

describe("job discovery and execution capability", () => {
  it("discovers nested jobs with metadata filters", async () => {
    const cwd = await fixture();
    const discovery = createJobDiscovery({ cwd, env: { TZ: "UTC", LANG: "C" } });
    const jobs = await discovery.list();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: "build/compile",
      name: "Compile",
      description: "Compile sources",
      tags: ["build", "ci"],
      cron: "0 * * * *",
    });
    expect(await discovery.exists("build/compile")).toBe(true);
    expect(await discovery.exists("missing")).toBe(false);
    expect(await discovery.getByTag("ci")).toHaveLength(1);
    expect(await discovery.getCronJobs()).toHaveLength(1);
    expect(await discovery.search("compile")).toHaveLength(1);
  });

  it("executes a discovered job through the injected runner", async () => {
    const cwd = await fixture();
    const discovery = createJobDiscovery({ cwd, env: { TZ: "UTC", LANG: "C" } });
    const runner = { runJob: vi.fn(async (definition, options) => ({ id: definition.id, payload: options.payload, status: "success" })) };
    const execution = createJobExecution(
      { cwd, env: { TZ: "UTC", LANG: "C" } },
      {
        git: { info: async () => ({ worktree: cwd, branch: "main", head: "abc" }) },
        receipt: { list: async () => [] },
        lock: { acquire: async () => true, release: async () => true, isLocked: async () => false },
        runner,
        discovery,
      },
    );
    const result = await execution.run("build/compile", { payload: { target: "all" } });
    expect(result).toEqual({ id: "build/compile", payload: { target: "all" }, status: "success" });
    expect(runner.runJob).toHaveBeenCalledOnce();
    expect(await execution.isRunning("build/compile")).toBe(false);
    expect(await execution.history("build/compile")).toEqual([]);
  });

  it("refuses missing jobs with a transparent error", async () => {
    const cwd = await fixture();
    const discovery = createJobDiscovery({ cwd, env: {} });
    await expect(discovery.get("missing")).rejects.toThrow(/Job not found/);
  });
});
