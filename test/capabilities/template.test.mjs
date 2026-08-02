import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useTemplate } from "../../src/composables/template.mjs";

describe("template generation boundary capability", () => {
  it("renders deterministic strings with GitVan filters", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gitvan-template-verifier-"));
    await withGitVan({ cwd, env: {}, now: () => "2026-08-02T00:00:00.000Z" }, async () => {
      const template = await useTemplate({ paths: [], noCache: true, autoescape: false });
      const first = template.renderString("{{ name | upper }}:{{ nowISO }}", { name: "gitvan" });
      const second = template.renderString("{{ name | upper }}:{{ nowISO }}", { name: "gitvan" });
      expect(first).toBe("GITVAN:2026-08-02T00:00:00.000Z");
      expect(second).toBe(first);
    });
  });

  it("renders a template file to a bounded project-relative output", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gitvan-template-verifier-"));
    await writeFile(join(cwd, "value.njk"), "value={{ value }}", "utf8");
    await withGitVan({ cwd, env: {}, now: () => "2026-08-02T00:00:00.000Z" }, async () => {
      const template = await useTemplate({ paths: [cwd], noCache: true, autoescape: false });
      const result = await template.renderToFile("value.njk", "generated/value.txt", { value: 42 });
      expect(result).toEqual({ path: "generated/value.txt", bytes: 8 });
      expect(await readFile(join(cwd, "generated", "value.txt"), "utf8")).toBe("value=42");
    });
  });

  it("exposes the configured environment and paths without randomness", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gitvan-template-verifier-"));
    await withGitVan({ cwd, env: {}, now: () => "2026-08-02T00:00:00.000Z" }, async () => {
      const template = await useTemplate({ paths: [cwd], noCache: true });
      expect(template.paths).toEqual([cwd]);
      expect(template.env).toBeDefined();
      expect(template.renderString("{{ missing | default('bounded') }}")).toBe("bounded");
    });
  });
});
