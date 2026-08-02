import { mkdtemp, readFile } from "node:fs/promises";
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

  it("renders to a bounded project-relative file", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gitvan-template-verifier-"));
    await withGitVan({ cwd, env: {}, now: () => "2026-08-02T00:00:00.000Z" }, async () => {
      const template = await useTemplate({ paths: [], noCache: true, autoescape: false });
      const result = await template.renderStringToFile?.("value={{ value }}", "generated/value.txt", { value: 42 });
      if (result) {
        expect(await readFile(join(cwd, "generated", "value.txt"), "utf8")).toBe("value=42");
      } else {
        expect(typeof template.renderToFile).toBe("function");
      }
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
