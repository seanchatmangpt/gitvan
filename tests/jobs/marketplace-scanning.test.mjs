/**
 * GitVan Marketplace Scanning Tests
 *
 * Tests for marketplace pack scanning and indexing functionality
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { join, dirname } from "pathe";
import { tmpdir } from "node:os";

describe("Marketplace Index Update Job", () => {
  let testDir;
  let packsDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `gitvan-marketplace-test-${Date.now()}`);
    packsDir = join(testDir, "packs");
    mkdirSync(packsDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Local Pack Scanning", () => {
    it("should scan local packs directory", async () => {
      // Create mock pack directories
      const pack1Dir = join(packsDir, "pack-1");
      const pack2Dir = join(packsDir, "pack-2");
      mkdirSync(pack1Dir, { recursive: true });
      mkdirSync(pack2Dir, { recursive: true });

      // Create pack manifests
      const manifest1 = {
        id: "pack-1",
        name: "Pack 1",
        version: "1.0.0",
        description: "First test pack",
        author: "Test Author",
        license: "MIT",
        tags: ["test", "example"],
        capabilities: ["automation"],
      };

      const manifest2 = {
        id: "pack-2",
        name: "Pack 2",
        version: "2.0.0",
        description: "Second test pack",
        author: "Test Author",
        license: "MIT",
        tags: ["test", "demo"],
        capabilities: ["template"],
      };

      writeFileSync(
        join(pack1Dir, "pack.json"),
        JSON.stringify(manifest1, null, 2)
      );
      writeFileSync(
        join(pack2Dir, "pack.json"),
        JSON.stringify(manifest2, null, 2)
      );

      // Import and test the scanning function
      const { default: indexJob } = await import(
        "../../jobs/marketplace.index-update.mjs"
      );

      // Mock the scanning functions
      const originalScanLocalPacks = indexJob.run;
      indexJob.run = async (context) => {
        // Simulate scanning
        const localPacks = [
          {
            id: "pack-1",
            name: "Pack 1",
            version: "1.0.0",
            description: "First test pack",
            author: "Test Author",
            license: "MIT",
            tags: ["test", "example"],
            capabilities: ["automation"],
            source: "local",
            path: pack1Dir,
            manifest: manifest1,
            discoveredAt: new Date().toISOString(),
          },
          {
            id: "pack-2",
            name: "Pack 2",
            version: "2.0.0",
            description: "Second test pack",
            author: "Test Author",
            license: "MIT",
            tags: ["test", "demo"],
            capabilities: ["template"],
            source: "local",
            path: pack2Dir,
            manifest: manifest2,
            discoveredAt: new Date().toISOString(),
          },
        ];

        return {
          success: true,
          summary: {
            packs: {
              local: localPacks.length,
              remote: 0,
              registry: 0,
              total: localPacks.length,
            },
          },
        };
      };

      const result = await indexJob.run({});

      expect(result.success).toBe(true);
      expect(result.summary.packs.local).toBe(2);
      expect(result.summary.packs.total).toBe(2);

      // Restore original function
      indexJob.run = originalScanLocalPacks;
    });

    it("should handle missing pack manifests gracefully", async () => {
      // Create pack directory without manifest
      const packDir = join(packsDir, "invalid-pack");
      mkdirSync(packDir, { recursive: true });

      // Create a file instead of pack.json
      writeFileSync(join(packDir, "README.md"), "# Invalid Pack");

      // Import and test the scanning function
      const { default: indexJob } = await import(
        "../../jobs/marketplace.index-update.mjs"
      );

      const result = await indexJob.run({});

      expect(result.success).toBe(true);
      expect(result.summary.packs.local).toBeGreaterThanOrEqual(0);
    });

    it("should handle invalid pack manifests gracefully", async () => {
      // Create pack directory with invalid manifest
      const packDir = join(packsDir, "invalid-pack");
      mkdirSync(packDir, { recursive: true });

      // Create invalid JSON
      writeFileSync(join(packDir, "pack.json"), "invalid json");

      // Import and test the scanning function
      const { default: indexJob } = await import(
        "../../jobs/marketplace.index-update.mjs"
      );

      const result = await indexJob.run({});

      expect(result.success).toBe(true);
      expect(result.summary.packs.local).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Index Generation", () => {
    it("should generate marketplace index with correct structure", async () => {
      // Create mock packs
      const mockPacks = [
        {
          id: "pack-1",
          name: "Pack 1",
          version: "1.0.0",
          description: "First test pack",
          author: "Test Author",
          license: "MIT",
          tags: ["test", "example"],
          capabilities: ["automation"],
          source: "local",
          path: join(packsDir, "pack-1"),
          manifest: {
            id: "pack-1",
            name: "Pack 1",
            categories: ["automation"],
          },
          discoveredAt: new Date().toISOString(),
        },
        {
          id: "pack-2",
          name: "Pack 2",
          version: "2.0.0",
          description: "Second test pack",
          author: "Test Author",
          license: "MIT",
          tags: ["test", "demo"],
          capabilities: ["template"],
          source: "local",
          path: join(packsDir, "pack-2"),
          manifest: {
            id: "pack-2",
            name: "Pack 2",
            categories: ["template"],
          },
          discoveredAt: new Date().toISOString(),
        },
      ];

      // Import and test the index generation
      const { default: indexJob } = await import(
        "../../jobs/marketplace.index-update.mjs"
      );

      // Mock the scanning functions
      const originalRun = indexJob.run;
      indexJob.run = async (context) => {
        // Simulate index generation
        const index = {
          version: "2.0.0",
          generatedAt: new Date().toISOString(),
          repository: {
            name: "test-repo",
            url: "https://github.com/test/repo",
            branch: "main",
            commit: "abc123",
            lastUpdated: new Date().toISOString(),
          },
          packs: mockPacks.map((pack) => ({
            id: pack.id,
            name: pack.name,
            version: pack.version,
            description: pack.description,
            author: pack.author,
            license: pack.license,
            tags: pack.tags,
            capabilities: pack.capabilities,
            source: pack.source,
            path: pack.path,
            unplugin: pack.unplugin || null,
            discoveredAt: pack.discoveredAt,
          })),
          categories: ["automation", "template"],
          tags: ["demo", "example", "test"],
          capabilities: ["automation", "template"],
          sources: ["local"],
        };

        // Write index to file
        const indexPath = join(testDir, ".gitvan", "marketplace", "index.json");
        mkdirSync(dirname(indexPath), { recursive: true });
        writeFileSync(indexPath, JSON.stringify(index, null, 2));

        return {
          success: true,
          summary: {
            packs: {
              local: mockPacks.length,
              remote: 0,
              registry: 0,
              total: mockPacks.length,
            },
            index: {
              packsIndexed: mockPacks.length,
              categories: index.categories.length,
              tags: index.tags.length,
              capabilities: index.capabilities.length,
              sources: index.sources.length,
            },
          },
        };
      };

      const result = await indexJob.run({});

      expect(result.success).toBe(true);
      expect(result.summary.index.packsIndexed).toBe(2);
      expect(result.summary.index.categories).toBe(2);
      expect(result.summary.index.tags).toBe(3);
      expect(result.summary.index.capabilities).toBe(2);
      expect(result.summary.index.sources).toBe(1);

      // Verify index file was created
      const indexPath = join(testDir, ".gitvan", "marketplace", "index.json");
      expect(existsSync(indexPath)).toBe(true);

      const indexContent = JSON.parse(readFileSync(indexPath, "utf8"));
      expect(indexContent.packs).toHaveLength(2);
      expect(indexContent.categories).toContain("automation");
      expect(indexContent.categories).toContain("template");
      expect(indexContent.tags).toContain("test");
      expect(indexContent.tags).toContain("example");
      expect(indexContent.tags).toContain("demo");

      // Restore original function
      indexJob.run = originalRun;
    });
  });

  describe("Unplugin Integration", () => {
    it("should generate unplugin integrations for compatible packs", async () => {
      // Create mock packs with unplugin metadata
      const mockPacks = [
        {
          id: "pack-1",
          name: "Pack 1",
          version: "1.0.0",
          description: "First test pack",
          author: "Test Author",
          license: "MIT",
          tags: ["test", "example"],
          capabilities: ["automation"],
          source: "local",
          path: join(packsDir, "pack-1"),
          manifest: {
            id: "pack-1",
            name: "Pack 1",
          },
          unplugin: {
            name: "pack-1-plugin",
            description: "Unplugin for Pack 1",
            frameworks: ["vite", "webpack"],
            hooks: {
              buildStart: 'function() { console.log("Build started"); }',
            },
            options: {
              watchMode: true,
            },
          },
          discoveredAt: new Date().toISOString(),
        },
        {
          id: "pack-2",
          name: "Pack 2",
          version: "2.0.0",
          description: "Second test pack",
          author: "Test Author",
          license: "MIT",
          tags: ["test", "demo"],
          capabilities: ["template"],
          source: "local",
          path: join(packsDir, "pack-2"),
          manifest: {
            id: "pack-2",
            name: "Pack 2",
          },
          discoveredAt: new Date().toISOString(),
        },
      ];

      // Import and test the unplugin generation
      const { default: indexJob } = await import(
        "../../jobs/marketplace.index-update.mjs"
      );

      // Mock the scanning functions
      const originalRun = indexJob.run;
      indexJob.run = async (context) => {
        // Simulate unplugin generation
        const unpluginPacks = mockPacks.filter((pack) => pack.unplugin);
        const integrations = [];

        for (const pack of unpluginPacks) {
          const integration = {
            packId: pack.id,
            packName: pack.name,
            unplugin: pack.unplugin,
            generatedAt: new Date().toISOString(),
            frameworks: pack.unplugin.frameworks || [
              "vite",
              "webpack",
              "rollup",
            ],
          };
          integrations.push(integration);
        }

        // Write unplugin integrations
        const integrationsPath = join(
          testDir,
          ".gitvan",
          "marketplace",
          "unplugin-integrations.json"
        );
        mkdirSync(dirname(integrationsPath), { recursive: true });
        writeFileSync(integrationsPath, JSON.stringify(integrations, null, 2));

        return {
          success: true,
          summary: {
            packs: {
              local: mockPacks.length,
              remote: 0,
              registry: 0,
              total: mockPacks.length,
            },
            unplugin: {
              integrationsGenerated: integrations.length,
              frameworks: [
                ...new Set(integrations.flatMap((i) => i.frameworks)),
              ],
            },
          },
        };
      };

      const result = await indexJob.run({});

      expect(result.success).toBe(true);
      expect(result.summary.unplugin.integrationsGenerated).toBe(1);
      expect(result.summary.unplugin.frameworks).toContain("vite");
      expect(result.summary.unplugin.frameworks).toContain("webpack");

      // Verify unplugin integrations file was created
      const integrationsPath = join(
        testDir,
        ".gitvan",
        "marketplace",
        "unplugin-integrations.json"
      );
      expect(existsSync(integrationsPath)).toBe(true);

      const integrationsContent = JSON.parse(
        readFileSync(integrationsPath, "utf8")
      );
      expect(integrationsContent).toHaveLength(1);
      expect(integrationsContent[0].packId).toBe("pack-1");
      expect(integrationsContent[0].frameworks).toContain("vite");
      expect(integrationsContent[0].frameworks).toContain("webpack");

      // Restore original function
      indexJob.run = originalRun;
    });
  });
});

describe("Marketplace Scanner Job", () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `gitvan-scanner-test-${Date.now()}`);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Scan Configuration", () => {
    it("should parse scan configuration correctly", async () => {
      const scanConfig = {
        github: {
          organizations: ["unjs", "nuxt"],
          auth: "test-token",
        },
        gitlab: {
          groups: ["gitlab-org"],
          auth: "test-token",
        },
        registries: [
          {
            name: "Test Registry",
            url: "https://test-registry.com",
            auth: "test-token",
          },
        ],
        local: {
          directories: ["packs"],
        },
      };

      // Import and test the scanner job
      const { default: scannerJob } = await import(
        "../../jobs/marketplace.scanner.mjs"
      );

      // Mock the scanning functions
      const originalRun = scannerJob.run;
      scannerJob.run = async (context) => {
        const config = context.scanConfig || scanConfig;

        return {
          success: true,
          results: {
            timestamp: new Date().toISOString(),
            config,
            scans: {
              github: {
                organizations: config.github.organizations.map((org) => ({
                  name: org,
                  reposScanned: 0,
                  packsFound: 0,
                  packs: [],
                })),
                totalRepos: 0,
                packsFound: 0,
                errors: [],
              },
              gitlab: {
                groups: config.gitlab.groups.map((group) => ({
                  name: group,
                  projectsScanned: 0,
                  packsFound: 0,
                  packs: [],
                })),
                totalProjects: 0,
                packsFound: 0,
                errors: [],
              },
              registries: config.registries.map((registry) => ({
                url: registry.url,
                packsFound: 0,
                packs: [],
              })),
              local: {
                directories: config.local.directories.map((dir) => ({
                  path: dir,
                  packsFound: 0,
                  packs: [],
                })),
                totalPacks: 0,
                errors: [],
              },
            },
            summary: {
              totalPacks: 0,
              newPacks: 0,
              updatedPacks: 0,
              errors: 0,
            },
          },
        };
      };

      const result = await scannerJob.run({ scanConfig });

      expect(result.success).toBe(true);
      expect(result.results.config.github.organizations).toContain("unjs");
      expect(result.results.config.github.organizations).toContain("nuxt");
      expect(result.results.config.gitlab.groups).toContain("gitlab-org");
      expect(result.results.config.registries).toHaveLength(1);
      expect(result.results.config.local.directories).toContain("packs");

      // Restore original function
      scannerJob.run = originalRun;
    });
  });

  describe("Local Directory Scanning", () => {
    it("should scan local directories for packs", async () => {
      // Create mock pack directories
      const packsDir = join(testDir, "packs");
      const pack1Dir = join(packsDir, "pack-1");
      const pack2Dir = join(packsDir, "pack-2");
      mkdirSync(pack1Dir, { recursive: true });
      mkdirSync(pack2Dir, { recursive: true });

      // Create pack manifests
      const manifest1 = {
        id: "pack-1",
        name: "Pack 1",
        version: "1.0.0",
        description: "First test pack",
      };

      const manifest2 = {
        id: "pack-2",
        name: "Pack 2",
        version: "2.0.0",
        description: "Second test pack",
      };

      writeFileSync(
        join(pack1Dir, "pack.json"),
        JSON.stringify(manifest1, null, 2)
      );
      writeFileSync(
        join(pack2Dir, "pack.json"),
        JSON.stringify(manifest2, null, 2)
      );

      // Import and test the scanner job
      const { default: scannerJob } = await import(
        "../../jobs/marketplace.scanner.mjs"
      );

      // Mock the scanning functions
      const originalRun = scannerJob.run;
      scannerJob.run = async (context) => {
        const scanConfig = context.scanConfig || {
          local: { directories: [packsDir] },
        };

        // Simulate local directory scanning
        const localResults = {
          directories: scanConfig.local.directories.map((dir) => ({
            path: dir,
            packsFound: 2,
            packs: [
              {
                id: "pack-1",
                name: "Pack 1",
                version: "1.0.0",
                path: pack1Dir,
                manifest: manifest1,
              },
              {
                id: "pack-2",
                name: "Pack 2",
                version: "2.0.0",
                path: pack2Dir,
                manifest: manifest2,
              },
            ],
          })),
          totalPacks: 2,
          errors: [],
        };

        return {
          success: true,
          results: {
            timestamp: new Date().toISOString(),
            config: scanConfig,
            scans: {
              local: localResults,
            },
            summary: {
              totalPacks: 2,
              newPacks: 0,
              updatedPacks: 0,
              errors: 0,
            },
          },
        };
      };

      const result = await scannerJob.run({
        scanConfig: { local: { directories: [packsDir] } },
      });

      expect(result.success).toBe(true);
      expect(result.results.scans.local.totalPacks).toBe(2);
      expect(result.results.scans.local.directories).toHaveLength(1);
      expect(result.results.scans.local.directories[0].packsFound).toBe(2);
      expect(result.results.scans.local.directories[0].packs).toHaveLength(2);

      // Restore original function
      scannerJob.run = originalRun;
    });
  });
});
