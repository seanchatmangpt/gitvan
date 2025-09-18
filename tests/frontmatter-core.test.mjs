import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join, resolve } from "pathe";
import { parseFrontmatter } from "../src/utils/frontmatter.mjs";
import { injectString } from "../src/utils/inject.mjs";

describe("Frontmatter Core Functionality", () => {
  it("should parse YAML front-matter correctly", () => {
    const input = `---
title: Test Document
author: GitVan
version: 1.0
---
# {{ title }}

This is the body content.`;

    const { data, body } = parseFrontmatter(input);

    expect(data).toEqual({
      title: "Test Document",
      author: "GitVan",
      version: 1.0,
    });
    expect(body).toBe("# {{ title }}\n\nThis is the body content.");
  });

  it("should parse TOML front-matter correctly", () => {
    const input = `+++
title = "Test Document"
author = "GitVan"
version = 1.0
+++
# {{ title }}

This is the body content.`;

    const { data, body } = parseFrontmatter(input);

    expect(data).toEqual({
      title: "Test Document",
      author: "GitVan",
      version: 1.0,
    });
    expect(body).toBe("# {{ title }}\n\nThis is the body content.");
  });

  it("should parse JSON front-matter correctly", () => {
    const input = `;{"title":"Test Document","author":"GitVan","version":1.0}
# {{ title }}

This is the body content.`;

    const { data, body } = parseFrontmatter(input);

    expect(data).toEqual({
      title: "Test Document",
      author: "GitVan",
      version: 1.0,
    });
    expect(body).toBe("# {{ title }}\n\nThis is the body content.");
  });

  it("should handle content without front-matter", () => {
    const input = "# No Front Matter\n\nJust regular content here.";

    const { data, body } = parseFrontmatter(input);

    expect(data).toEqual({});
    expect(body).toBe("# No Front Matter\n\nJust regular content here.");
  });

  it("should preserve shebang lines", () => {
    const input = `#!/usr/bin/env node
---
name: script
---
console.log('Hello World');`;

    const { data, body } = parseFrontmatter(input);

    expect(data).toEqual({ name: "script" });
    expect(body).toBe("#!/usr/bin/env node\nconsole.log('Hello World');");
  });

  it("should handle single-line shebang", () => {
    const input = "#!/usr/bin/env node";

    const { data, body } = parseFrontmatter(input);

    expect(data).toEqual({});
    expect(body).toBe("#!/usr/bin/env node");
  });
});

describe("Injection Functionality", () => {
  it("should inject content after anchor", () => {
    const content = "Line 1\n// INSERT_HERE\nLine 3";
    const result = injectString(content, {
      snippet: "// Injected line",
      find: "// INSERT_HERE",
      where: "after",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      "Line 1\n// INSERT_HERE\n// Injected line\nLine 3"
    );
  });

  it("should inject content before anchor", () => {
    const content = "Line 1\n// INSERT_HERE\nLine 3";
    const result = injectString(content, {
      snippet: "// Injected line",
      find: "// INSERT_HERE",
      where: "before",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      "Line 1\n// Injected line\n// INSERT_HERE\nLine 3"
    );
  });

  it("should inject content at specific line", () => {
    const content = "Line 1\nLine 2\nLine 3";
    const result = injectString(content, {
      snippet: "// Injected line",
      where: "at_line",
      line: 2,
    });

    expect(result.changed).toBe(true);
    expect(result.content).toBe("Line 1\n// Injected line\nLine 2\nLine 3");
  });

  it("should inject content between anchors", () => {
    const content = "Line 1\n<!-- START -->\n<!-- END -->\nLine 4";
    const result = injectString(content, {
      snippet: "Injected content",
      start: "<!-- START -->",
      end: "<!-- END -->",
      where: "between",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      "Line 1\n<!-- START -->\nInjected content\n<!-- END -->\nLine 4"
    );
  });

  it("should be idempotent when once=true", () => {
    const content = "Line 1\n// INSERT_HERE\n// Injected line\nLine 3";
    const result = injectString(content, {
      snippet: "// Injected line",
      find: "// INSERT_HERE",
      where: "after",
      once: true,
    });

    expect(result.changed).toBe(false);
    expect(result.content).toBe(content);
  });

  it("should append when anchor not found", () => {
    const content = "Line 1\nLine 2";
    const result = injectString(content, {
      snippet: "// Injected line",
      find: "// NOT_FOUND",
      where: "after",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toBe("Line 1\nLine 2\n// Injected line");
  });

  it("should create anchors when between anchors not found", () => {
    const content = "Line 1\nLine 2";
    const result = injectString(content, {
      snippet: "Injected content",
      start: "<!-- START -->",
      end: "<!-- END -->",
      where: "between",
    });

    expect(result.changed).toBe(true);
    expect(result.content).toBe(
      "Line 1\nLine 2\n<!-- START -->\nInjected content\n<!-- END -->"
    );
  });
});

describe("Frontmatter Requirements Coverage", () => {
  it("should handle all required front-matter fields", () => {
    const input = `---
to: 
  - "file1.txt"
  - "file2.txt"
inject:
  - into: "target.txt"
    snippet: "// {{ comment }}"
    find: "// INSERT_HERE"
    where: "after"
copy:
  - from: "source.txt"
    to: "dest.txt"
sh:
  before: ["echo 'Before'"]
  after: ["echo 'After'"]
when: true
force: "overwrite"
data:
  custom: "value"
---
Template body`;

    const { data, body } = parseFrontmatter(input);

    expect(data.to).toEqual(["file1.txt", "file2.txt"]);
    expect(data.inject).toHaveLength(1);
    expect(data.inject[0]).toMatchObject({
      into: "target.txt",
      snippet: "// {{ comment }}",
      find: "// INSERT_HERE",
      where: "after",
    });
    expect(data.copy).toHaveLength(1);
    expect(data.copy[0]).toMatchObject({
      from: "source.txt",
      to: "dest.txt",
    });
    expect(data.sh).toMatchObject({
      before: ["echo 'Before'"],
      after: ["echo 'After'"],
    });
    expect(data.when).toBe(true);
    expect(data.force).toBe("overwrite");
    expect(data.data).toMatchObject({ custom: "value" });
    expect(body).toBe("Template body");
  });

  it("should handle perFile multi-output structure", () => {
    const input = `---
perFile:
  - to: "file1.txt"
    data:
      name: "First"
  - to: "file2.txt"
    data:
      name: "Second"
---
Content for {{ name }}`;

    const { data, body } = parseFrontmatter(input);

    expect(data.perFile).toHaveLength(2);
    expect(data.perFile[0]).toMatchObject({
      to: "file1.txt",
      data: { name: "First" },
    });
    expect(data.perFile[1]).toMatchObject({
      to: "file2.txt",
      data: { name: "Second" },
    });
    expect(body).toBe("Content for {{ name }}");
  });

  it("should handle all force policies", () => {
    const policies = ["error", "overwrite", "append", "skip"];

    policies.forEach((policy) => {
      const input = `---
force: "${policy}"
---
Content`;

      const { data } = parseFrontmatter(input);
      expect(data.force).toBe(policy);
    });
  });

  it("should handle all injection strategies", () => {
    const strategies = ["before", "after", "at_line", "between"];

    strategies.forEach((strategy) => {
      const input = `---
inject:
  - into: "target.txt"
    snippet: "content"
    where: "${strategy}"
---
Body`;

      const { data } = parseFrontmatter(input);
      expect(data.inject[0].where).toBe(strategy);
    });
  });

  it("should handle conditional when expressions", () => {
    const conditions = [true, false, "true", "false", "{{ condition }}"];

    conditions.forEach((condition) => {
      const input = `---
when: ${typeof condition === "string" ? `"${condition}"` : condition}
---
Content`;

      const { data } = parseFrontmatter(input);
      expect(data.when).toBe(condition);
    });
  });
});
