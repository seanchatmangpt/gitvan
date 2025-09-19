// GitVan v2 — Simple useTemplate() tests with MemFS
// Tests core template functionality with inflection filters using in-memory file system

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { useTemplate } from "../src/composables/template.mjs";
import { withGitVan } from "../src/composables/ctx.mjs";

describe("useTemplate with MemFS", () => {
  let testDir;
  let templatesDir;

  // Mock context for testing
  const mockContext = {
    cwd: "/test/project",
    config: {
      templates: {
        dirs: ["templates"],
        autoescape: false,
        noCache: true,
      },
    },
    now: () => "2024-01-15T10:30:00.000Z",
  };

  beforeEach(() => {
    // Create in-memory test directory structure
    testDir = "/test-template-safe";
    templatesDir = `${testDir}/templates`;
    vol.mkdirSync(templatesDir, { recursive: true });

    // Create test templates
    vol.writeFileSync(
      `${templatesDir}/test.njk`,
      "Hello {{ name | capitalize }}! Today is {{ nowISO }}.",
    );
  });

  afterEach(() => {
    // Clean up in-memory file system
    vol.reset();
  });

  describe("basic functionality", () => {
    it("should render template with basic data", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.render("test.njk", { name: "john" });

        expect(result).toBe("Hello John! Today is 2024-01-15T10:30:00.000Z.");
      });
    });

    it("should render string template", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString("Hello {{ name }}!", {
          name: "world",
        });

        expect(result).toBe("Hello world!");
      });
    });

    it("should render to file", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const outputPath = `${testDir}/output.txt`;

        const result = await template.renderToFile("test.njk", outputPath, {
          name: "jane",
        });

        expect(result.path).toBe(outputPath);
        expect(result.bytes).toBeGreaterThan(0);

        const content = vol.readFileSync(outputPath, "utf8");
        expect(content).toBe("Hello Jane! Today is 2024-01-15T10:30:00.000Z.");
      });
    });
  });

  describe("inflection filters", () => {
    it("should handle pluralization", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString('{{ "user" | pluralize }}', {});
        expect(result).toBe("users");
      });
    });

    it("should handle singularization", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString('{{ "users" | singularize }}', {});
        expect(result).toBe("user");
      });
    });

    it("should handle camelize", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString(
          '{{ "user_profile" | camelize }}',
          {},
        );
        expect(result).toBe("UserProfile");
      });
    });

    it("should handle underscore", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString(
          '{{ "UserProfile" | underscore }}',
          {},
        );
        expect(result).toBe("user_profile");
      });
    });

    it("should handle dasherize", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString(
          '{{ "hello_world" | dasherize }}',
          {},
        );
        expect(result).toBe("hello-world");
      });
    });
  });

  describe("built-in filters", () => {
    it("should handle json filter", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const data = { name: "test", value: 42 };
        const result = template.renderString("{{ data | json }}", { data });

        expect(result).toBe(JSON.stringify(data, null, 0));
      });
    });

    it("should handle slug filter", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString('{{ "Hello World!" | slug }}', {});
        expect(result).toBe("hello-world");
      });
    });

    it("should handle upper filter", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString('{{ "hello" | upper }}', {});
        expect(result).toBe("HELLO");
      });
    });

    it("should handle lower filter", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString('{{ "HELLO" | lower }}', {});
        expect(result).toBe("hello");
      });
    });
  });

  describe("error handling", () => {
    it("should throw error for undefined variables", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });

        expect(() => {
          template.renderString("{{ undefined_var }}", {});
        }).toThrow();
      });
    });

    it("should throw error for now() calls", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });

        expect(() => {
          template.renderString("{{ now() }}", {});
        }).toThrow("Templates must not call now()");
      });
    });

    it("should throw error for random() calls", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });

        expect(() => {
          template.renderString("{{ random() }}", {});
        }).toThrow("Templates must not use random()");
      });
    });
  });

  describe("context integration", () => {
    it("should include git context in template data", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString("{{ git.cwd }}", {});

        expect(result).toBe(mockContext.cwd);
      });
    });

    it("should include nowISO when available", async () => {
      await withGitVan(mockContext, async () => {
        const template = await useTemplate({ paths: [templatesDir] });
        const result = template.renderString("{{ nowISO }}", {});

        expect(result).toBe("2024-01-15T10:30:00.000Z");
      });
    });
  });
});
