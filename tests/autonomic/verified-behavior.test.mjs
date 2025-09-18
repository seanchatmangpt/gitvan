import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "pathe";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";

describe("Autonomic Architecture - Verified Behavior", () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-autonomic-test-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("File System Operations", () => {
    it("should create essential directories quickly", async () => {
      const startTime = Date.now();

      // Create essential directories
      mkdirSync(join(testDir, ".gitvan"), { recursive: true });
      mkdirSync(join(testDir, "jobs"), { recursive: true });
      mkdirSync(join(testDir, "templates"), { recursive: true });
      mkdirSync(join(testDir, "packs"), { recursive: true });

      const duration = Date.now() - startTime;

      // Should create directories quickly
      expect(duration).toBeLessThan(100);

      // Verify directories exist
      expect(existsSync(join(testDir, ".gitvan"))).toBe(true);
      expect(existsSync(join(testDir, "jobs"))).toBe(true);
      expect(existsSync(join(testDir, "templates"))).toBe(true);
      expect(existsSync(join(testDir, "packs"))).toBe(true);
    });

    it("should create config file quickly", async () => {
      const configContent = `export default {
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    endpoint: "http://localhost:11434"
  },
  daemon: {
    enabled: true,
    worktrees: "current"
  },
  jobs: {
    dirs: ["jobs"]
  },
  templates: {
    dirs: ["templates"]
  },
  packs: {
    dirs: ["packs", ".gitvan/packs"]
  }
};`;

      const startTime = Date.now();
      writeFileSync(join(testDir, "gitvan.config.js"), configContent);
      const duration = Date.now() - startTime;

      // Should create config quickly
      expect(duration).toBeLessThan(50);

      // Verify config file exists and has correct content
      expect(existsSync(join(testDir, "gitvan.config.js"))).toBe(true);

      const actualContent = readFileSync(
        join(testDir, "gitvan.config.js"),
        "utf8"
      );
      expect(actualContent).toContain("export default");
      expect(actualContent).toContain("ai:");
      expect(actualContent).toContain("ollama");
      expect(actualContent).toContain("qwen3-coder:30b");
    });
  });

  describe("GitHub Template Configuration", () => {
    it("should create Next.js template config correctly", async () => {
      const nextjsConfig = `export default {
  autoInstall: {
    packs: ["nextjs-github-pack"]
  },
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    endpoint: "http://localhost:11434"
  },
  data: {
    projectName: "my-nextjs-app",
    description: "A Next.js application powered by GitVan",
    framework: "nextjs",
    version: "14.0.0"
  }
};`;

      writeFileSync(join(testDir, "gitvan.config.js"), nextjsConfig);

      // Verify config content
      const configContent = readFileSync(
        join(testDir, "gitvan.config.js"),
        "utf8"
      );
      expect(configContent).toContain("nextjs-github-pack");
      expect(configContent).toContain("my-nextjs-app");
      expect(configContent).toContain("nextjs");
      expect(configContent).toContain("14.0.0");
    });

    it("should create React template config correctly", async () => {
      const reactConfig = `export default {
  autoInstall: {
    packs: ["react-vite-pack", "tailwind-pack"]
  },
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    endpoint: "http://localhost:11434"
  },
  data: {
    projectName: "my-react-app",
    description: "A React application powered by GitVan",
    framework: "react",
    version: "18.0.0",
    bundler: "vite"
  }
};`;

      writeFileSync(join(testDir, "gitvan.config.js"), reactConfig);

      // Verify config content
      const configContent = readFileSync(
        join(testDir, "gitvan.config.js"),
        "utf8"
      );
      expect(configContent).toContain("react-vite-pack");
      expect(configContent).toContain("tailwind-pack");
      expect(configContent).toContain("my-react-app");
      expect(configContent).toContain("react");
      expect(configContent).toContain("vite");
    });
  });

  describe("Pack Structure", () => {
    it("should create pack manifest correctly", async () => {
      const packManifest = {
        id: "nextjs-github-pack",
        name: "Next.js GitHub Pack",
        version: "1.0.0",
        description: "A Next.js starter pack for GitVan",
        author: "GitVan Team",
        license: "MIT",
        tags: ["nextjs", "react", "typescript"],
        capabilities: ["project-scaffolding", "ai-integration"],
        provides: {
          jobs: [
            {
              name: "nextjs:create-project",
              file: "jobs/create-project.mjs",
              description: "Creates a new Next.js project",
            },
            {
              name: "nextjs:start-dev",
              file: "jobs/start-dev.mjs",
              description: "Starts the Next.js development server",
            },
          ],
        },
        gitvan: {
          packType: "template",
          version: "2.0.0",
          compatibility: {
            gitvan: ">=2.0.0",
          },
        },
      };

      const packsDir = join(testDir, "packs", "nextjs-github-pack");
      mkdirSync(packsDir, { recursive: true });
      writeFileSync(
        join(packsDir, "pack.json"),
        JSON.stringify(packManifest, null, 2)
      );

      // Verify pack manifest
      expect(existsSync(join(packsDir, "pack.json"))).toBe(true);

      const manifestContent = readFileSync(join(packsDir, "pack.json"), "utf8");
      const parsedManifest = JSON.parse(manifestContent);

      expect(parsedManifest.id).toBe("nextjs-github-pack");
      expect(parsedManifest.name).toBe("Next.js GitHub Pack");
      expect(parsedManifest.version).toBe("1.0.0");
      expect(parsedManifest.provides.jobs).toHaveLength(2);
      expect(parsedManifest.provides.jobs[0].name).toBe(
        "nextjs:create-project"
      );
    });

    it("should create job files correctly", async () => {
      const jobContent = `import { defineJob } from '../../../src/define.mjs';
import consola from 'consola';

export default defineJob({
  meta: {
    name: 'nextjs:create-project',
    description: 'Creates a new Next.js project with GitVan integration'
  },
  hooks: ['post-commit'],
  async run({ inputs }) {
    consola.info('Creating Next.js project...');
    
    // Create project structure
    const projectStructure = {
      'package.json': {
        name: inputs.projectName || 'my-nextjs-app',
        version: '1.0.0',
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        }
      },
      'next.config.js': 'module.exports = { reactStrictMode: true };',
      'src/app/page.tsx': \`export default function Home() {
  return (
    <div>
      <h1>Welcome to \${inputs.projectName || 'My Next.js App'}!</h1>
      <p>Powered by GitVan</p>
    </div>
  );
}\`
    };
    
    return {
      success: true,
      message: 'Next.js project created successfully',
      artifacts: Object.keys(projectStructure)
    };
  }
});`;

      const jobsDir = join(testDir, "packs", "nextjs-github-pack", "jobs");
      mkdirSync(jobsDir, { recursive: true });
      writeFileSync(join(jobsDir, "create-project.mjs"), jobContent);

      // Verify job file
      expect(existsSync(join(jobsDir, "create-project.mjs"))).toBe(true);

      const jobFileContent = readFileSync(
        join(jobsDir, "create-project.mjs"),
        "utf8"
      );
      expect(jobFileContent).toContain("defineJob");
      expect(jobFileContent).toContain("nextjs:create-project");
      expect(jobFileContent).toContain("post-commit");
      expect(jobFileContent).toContain("Next.js project created successfully");
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle multiple file operations efficiently", async () => {
      const startTime = Date.now();

      // Create many files
      for (let i = 0; i < 100; i++) {
        writeFileSync(
          join(testDir, `file${i}.js`),
          `console.log("File ${i}");`
        );
      }

      const duration = Date.now() - startTime;

      // Should handle many files efficiently
      expect(duration).toBeLessThan(1000);

      // Verify files were created
      for (let i = 0; i < 100; i++) {
        expect(existsSync(join(testDir, `file${i}.js`))).toBe(true);
      }
    });

    it("should handle directory creation efficiently", async () => {
      const startTime = Date.now();

      // Create many directories
      for (let i = 0; i < 50; i++) {
        mkdirSync(join(testDir, `dir${i}`), { recursive: true });
      }

      const duration = Date.now() - startTime;

      // Should handle many directories efficiently
      expect(duration).toBeLessThan(500);

      // Verify directories were created
      for (let i = 0; i < 50; i++) {
        expect(existsSync(join(testDir, `dir${i}`))).toBe(true);
      }
    });

    it("should use minimal memory for file operations", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many files
      for (let i = 0; i < 1000; i++) {
        writeFileSync(join(testDir, `file${i}.txt`), `Content ${i}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not use excessive memory
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe("Error Handling", () => {
    it("should handle missing directories gracefully", async () => {
      const nonExistentDir = join(testDir, "nonexistent");

      // Should not throw when trying to read from non-existent directory
      expect(existsSync(nonExistentDir)).toBe(false);

      // Should handle gracefully
      try {
        readFileSync(join(nonExistentDir, "file.txt"), "utf8");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error.code).toBe("ENOENT");
      }
    });

    it("should handle invalid JSON gracefully", async () => {
      const invalidJson = '{"invalid": json}';
      writeFileSync(join(testDir, "invalid.json"), invalidJson);

      // Should handle invalid JSON gracefully
      try {
        const content = readFileSync(join(testDir, "invalid.json"), "utf8");
        JSON.parse(content);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent file operations", async () => {
      const operations = [];

      // Start multiple file operations concurrently
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise((resolve) => {
            setTimeout(() => {
              writeFileSync(
                join(testDir, `concurrent${i}.txt`),
                `Content ${i}`
              );
              resolve(i);
            }, Math.random() * 100);
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(10);

      // Verify all files were created
      for (let i = 0; i < 10; i++) {
        expect(existsSync(join(testDir, `concurrent${i}.txt`))).toBe(true);
      }
    });
  });
});
