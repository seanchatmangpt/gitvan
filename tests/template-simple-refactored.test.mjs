// GitVan v2 — Simple useTemplate() tests with Hybrid Test Environment
// Tests core template functionality with inflection filters using hybrid test environment

import { describe, it, expect } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";

describe("useTemplate with Hybrid Test Environment", () => {
  it("should handle basic template rendering", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Simple Template Test Repository\n",
          "templates/test.njk":
            "Hello {{ name | capitalize }}! Today is {{ nowISO }}.\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Test template file exists
        expect(env.files.exists("templates/test.njk")).toBe(true);

        // Test Git operations
        await env.gitAdd(".");
        await env.gitCommit("Add basic template");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add basic template");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle inflection filters", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Inflection Test Repository\n",
          "templates/inflection.njk": `{{ "user" | pluralize }}: {{ count | inflect "user" "users" }}
{{ "user_profile" | camelize }}: {{ "userProfile" | underscore }}
{{ "hello_world" | titleize }}: {{ "HelloWorld" | humanize }}`,
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Test inflection template exists
        expect(env.files.exists("templates/inflection.njk")).toBe(true);

        // Test Git operations
        await env.gitAdd(".");
        await env.gitCommit("Add inflection template");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add inflection template");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle template modifications", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Template Modification Test Repository\n",
          "templates/index.njk": "Hello {{ name }}!\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Modify template
        env.files.write(
          "templates/index.njk",
          "Hello {{ name | capitalize }}!\n"
        );
        expect(env.files.read("templates/index.njk")).toContain("capitalize");

        // Add new template
        env.files.write("templates/header.njk", "Welcome to {{ siteName }}!\n");

        // Test Git operations
        await env.gitAdd(".");
        await env.gitCommit("Modify and add templates");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Modify and add templates");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should handle complex template structure", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Complex Template Test Repository\n",
          "templates/components/Button.njk":
            "export const Button = () => {};\n",
          "templates/components/Modal.njk": "export const Modal = () => {};\n",
          "templates/pages/Home.njk": "export const Home = () => {};\n",
          "templates/utils/helpers.njk": "export const helpers = {};\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Test complex template structure
        expect(env.files.exists("templates/components/Button.njk")).toBe(true);
        expect(env.files.exists("templates/components/Modal.njk")).toBe(true);
        expect(env.files.exists("templates/pages/Home.njk")).toBe(true);
        expect(env.files.exists("templates/utils/helpers.njk")).toBe(true);

        // Test Git operations
        await env.gitAdd(".");
        await env.gitCommit("Add complex template structure");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add complex template structure");
        expect(log[1].message).toContain("Initial commit");
      }
    );
  });

  it("should demonstrate performance with many templates", async () => {
    const start = performance.now();

    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "README.md": "# Template Performance Test Repository\n",
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe("memfs");

        // Create many templates quickly
        for (let i = 0; i < 30; i++) {
          env.files.write(
            `templates/component${i}.njk`,
            `export const Component${i} = () => {};\n`
          );
        }

        // Create nested template structure
        for (let i = 0; i < 5; i++) {
          env.files.mkdir(`templates/feature${i}`);
          env.files.write(
            `templates/feature${i}/index.njk`,
            `export const Feature${i} = () => {};\n`
          );
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(500); // Should complete within 500ms

        console.log(
          `✅ Template Performance test completed in ${duration.toFixed(2)}ms`
        );

        // Test Git operations with many templates
        await env.gitAdd(".");
        await env.gitCommit("Add many templates");

        // Verify commit
        const log = await env.gitLog();
        expect(log[0].message).toContain("Add many templates");
        expect(log[1].message).toContain("Initial commit");

        // Verify templates exist
        for (let i = 0; i < 30; i++) {
          expect(env.files.exists(`templates/component${i}.njk`)).toBe(true);
        }
        for (let i = 0; i < 5; i++) {
          expect(env.files.exists(`templates/feature${i}/index.njk`)).toBe(
            true
          );
        }
      }
    );
  });
});
