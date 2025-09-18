/**
 * Integration test for Pack class prompting system
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Pack } from "../../../src/pack/pack.mjs";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "pathe";

const TEST_PACK_DIR = "/tmp/test-pack-prompts";
const TEST_TARGET_DIR = "/tmp/test-target-prompts";

describe("Pack prompting integration", () => {
  beforeEach(() => {
    // Clean up test directories
    if (existsSync(TEST_PACK_DIR)) {
      rmSync(TEST_PACK_DIR, { recursive: true });
    }
    if (existsSync(TEST_TARGET_DIR)) {
      rmSync(TEST_TARGET_DIR, { recursive: true });
    }

    // Create test pack directory
    mkdirSync(TEST_PACK_DIR, { recursive: true });
    mkdirSync(TEST_TARGET_DIR, { recursive: true });
  });

  it("should resolve inputs with provided values", async () => {
    // Create test pack manifest
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "name",
          type: "text",
          description: "Project name",
          required: true,
        },
        {
          key: "framework",
          type: "select",
          description: "Choose framework",
          enum: ["react", "vue", "angular"],
          default: "react",
        },
        {
          key: "enabled",
          type: "boolean",
          description: "Enable feature",
          default: false,
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    const pack = new Pack(TEST_PACK_DIR);
    await pack.load();

    // Test with provided inputs
    const providedInputs = {
      name: "my-project",
      framework: "vue",
      enabled: true,
    };

    const resolved = await pack.resolveInputs(providedInputs, {
      noPrompt: true,
    });

    expect(resolved.name).toBe("my-project");
    expect(resolved.framework).toBe("vue");
    expect(resolved.enabled).toBe(true);
  });

  it("should use default values when no inputs provided", async () => {
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "port",
          type: "number",
          description: "Server port",
          default: 3000,
        },
        {
          key: "host",
          type: "text",
          description: "Server host",
          default: "localhost",
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    const pack = new Pack(TEST_PACK_DIR);
    await pack.load();

    const resolved = await pack.resolveInputs({}, { noPrompt: true });

    expect(resolved.port).toBe(3000);
    expect(resolved.host).toBe("localhost");
  });

  it("should fail for missing required inputs with noPrompt", async () => {
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "apiKey",
          type: "text",
          description: "API Key",
          required: true,
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    const pack = new Pack(TEST_PACK_DIR);
    await pack.load();

    await expect(pack.resolveInputs({}, { noPrompt: true })).rejects.toThrow(
      "Required input 'apiKey' is missing"
    );
  });

  it("should validate input types correctly", async () => {
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "port",
          type: "number",
          description: "Server port",
          min: 1000,
          max: 9999,
        },
        {
          key: "framework",
          type: "enum",
          description: "Framework",
          enum: ["react", "vue", "angular"],
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    const pack = new Pack(TEST_PACK_DIR);
    await pack.load();

    // Test valid inputs
    const validInputs = { port: 3000, framework: "react" };
    const resolved = await pack.resolveInputs(validInputs, { noPrompt: true });
    expect(resolved.port).toBe(3000);
    expect(resolved.framework).toBe("react");

    // Test invalid port range
    await expect(
      pack.resolveInputs({ port: 500 }, { noPrompt: true })
    ).rejects.toThrow("must be at least 1000");

    // Test invalid enum value
    await expect(
      pack.resolveInputs({ framework: "svelte" }, { noPrompt: true })
    ).rejects.toThrow("Invalid enum value");
  });

  it("should handle string to boolean conversion", async () => {
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "enabled",
          type: "boolean",
          description: "Enable feature",
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    const pack = new Pack(TEST_PACK_DIR);
    await pack.load();

    // Test string boolean conversion
    let resolved = await pack.resolveInputs(
      { enabled: "true" },
      { noPrompt: true }
    );
    expect(resolved.enabled).toBe(true);

    resolved = await pack.resolveInputs(
      { enabled: "false" },
      { noPrompt: true }
    );
    expect(resolved.enabled).toBe(false);

    resolved = await pack.resolveInputs({ enabled: "yes" }, { noPrompt: true });
    expect(resolved.enabled).toBe(true);

    resolved = await pack.resolveInputs({ enabled: "no" }, { noPrompt: true });
    expect(resolved.enabled).toBe(false);
  });

  it("should handle multiselect comma-separated strings", async () => {
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "plugins",
          type: "multiselect",
          description: "Choose plugins",
          enum: ["eslint", "prettier", "jest", "husky"],
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    const pack = new Pack(TEST_PACK_DIR);
    await pack.load();

    // Test comma-separated string conversion
    const resolved = await pack.resolveInputs(
      { plugins: "eslint,prettier,jest" },
      { noPrompt: true }
    );
    expect(resolved.plugins).toEqual(["eslint", "prettier", "jest"]);
  });

  it("should use prompting context defaults", async () => {
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "name",
          type: "text",
          description: "Project name",
          required: true,
        },
        {
          key: "version",
          type: "text",
          description: "Version",
          default: "1.0.0",
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    const pack = new Pack(TEST_PACK_DIR);
    await pack.load();

    // Test with prompting context defaults
    const resolved = await pack.resolveInputs(
      {},
      {
        noPrompt: true,
        defaults: { name: "default-project", version: "2.0.0" },
      }
    );

    expect(resolved.name).toBe("default-project");
    expect(resolved.version).toBe("2.0.0"); // Context default overrides input default
  });

  it("should handle Pack constructor options", async () => {
    const manifest = {
      id: "test-pack",
      version: "1.0.0",
      inputs: [
        {
          key: "name",
          type: "text",
          description: "Project name",
          required: true,
        },
      ],
    };

    writeFileSync(
      join(TEST_PACK_DIR, "pack.json"),
      JSON.stringify(manifest, null, 2)
    );

    // Test Pack with noPrompt option
    const pack = new Pack(TEST_PACK_DIR, { noPrompt: true });
    await pack.load();

    await expect(pack.resolveInputs({})).rejects.toThrow(
      "Required input 'name' is missing"
    );
  });
});
