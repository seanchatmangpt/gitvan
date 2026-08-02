import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PackPlanner } from "../../src/pack/planner.mjs";

function pack(path) {
  return {
    path,
    manifest: {
      id: "capability-pack",
      version: "1.0.0",
      dependencies: { npm: { zod: "^4.0.0" } },
      provides: {
        files: [{ src: "config.json", target: "config.json", mode: "write" }],
        templates: [{ src: "module.mjs.njk", target: "src/module.mjs", mode: "write" }],
        jobs: [{ src: "verify.mjs", id: "verify" }],
        events: [{ src: "release.mjs", id: "release" }],
        transforms: [{ target: "package.json", kind: "json-merge", spec: { scripts: { verify: "node verify.mjs" } } }],
        schedules: [{ job: "verify", cron: "0 * * * *" }],
      },
      postInstall: [{ action: "run", args: ["verify"] }],
    },
  };
}

describe("pack dependency closure capability", () => {
  it("creates a complete dry-run plan without filesystem actuation", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-pack-verifier-"));
    const planner = new PackPlanner({ cwd: root, dryRun: true });
    const plan = await planner.createDetailedPlan(pack(root), root, "install", { feature: true });
    expect(plan.pack).toBe("capability-pack");
    expect(plan.mode).toBe("install");
    expect(plan.steps.map(step => step.type)).toEqual([
      "npm-deps",
      "file",
      "template",
      "job",
      "event",
      "transform",
      "schedule",
      "post-install",
    ]);
    expect(plan.steps.every(step => typeof step.description === "string")).toBe(true);
  });

  it("calculates impacts across dependency and file operations", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-pack-verifier-"));
    const planner = new PackPlanner({ cwd: root, dryRun: true });
    const plan = await planner.createDetailedPlan(pack(root), root, "install", {});
    const impacts = await planner.analyzeImpacts(plan, root);
    expect(impacts.dependencies).toContainEqual({ type: "npm", packages: { zod: "^4.0.0" } });
    expect(impacts.creates.length).toBeGreaterThanOrEqual(4);
    expect(impacts.commands.length).toBeGreaterThanOrEqual(1);
  });

  it("respects false conditional steps", async () => {
    const root = await mkdtemp(join(tmpdir(), "gitvan-pack-verifier-"));
    const planner = new PackPlanner({ cwd: root, dryRun: true });
    const conditional = pack(root);
    conditional.manifest.provides.files[0].when = "false";
    const plan = await planner.createDetailedPlan(conditional, root, "install", {});
    expect(plan.steps.filter(step => step.type === "file")).toHaveLength(0);
  });
});
