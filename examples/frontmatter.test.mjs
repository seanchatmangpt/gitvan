import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseFrontmatter } from "../src/utils/frontmatter.mjs";

describe("parseFrontmatter", () => {
  it("parses YAML front-matter and preserves body", () => {
    const input = `---\ntitle: Test\nflag: true\ncount: 3\n---\nHello {{ name }}!`;
    const { data, body } = parseFrontmatter(input);
    expect(data.title).toBe("Test");
    expect(data.flag).toBe(true);
    expect(data.count).toBe(3);
    expect(body).toBe("Hello {{ name }}!");
  });

  it("parses TOML front-matter and preserves body", () => {
    const input = `+++\nname = "GitVan"\nnum = 42\n+++\nBody here`;
    const { data, body } = parseFrontmatter(input);
    expect(data.name).toBe("GitVan");
    expect(data.num).toBe(42);
    expect(body).toBe("Body here");
  });

  it("parses JSON front-matter and preserves body", () => {
    // gray-matter JSON front-matter uses leading semicolon on first line
    const input = `;{"key":"value","n":1}\nBody`;
    const { data, body } = parseFrontmatter(input);
    expect(data.key).toBe("value");
    expect(data.n).toBe(1);
    expect(body).toBe("Body");
  });

  it("preserves a shebang line before front-matter", () => {
    const input = `#!/usr/bin/env node\n---\nname: script\n---\nconsole.log('hi');`;
    const { data, body } = parseFrontmatter(input);
    expect(data.name).toBe("script");
    expect(body.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(body.includes("console.log('hi');")).toBe(true);
  });

  it("handles content without front-matter", () => {
    const input = "No front matter";
    const { data, body } = parseFrontmatter(input);
    expect(data).toEqual({});
    expect(body).toBe("No front matter");
  });
});
