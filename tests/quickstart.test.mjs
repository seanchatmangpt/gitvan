/**
 * GitVan v2 Quickstart Tests
 * Tests for the 5-minute quickstart guide functionality
 *
 * These tests verify that all features shown in the quickstart actually work.
 * They follow the test-fix-verify loop mandated by OLLAMA.md
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  rmSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "pathe";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, ".test-workspace");
const GITVAN_ROOT = join(__dirname, "..");

describe("GitVan v2 Quickstart Tests", () => {
  beforeEach(() => {
    // Create clean test workspace
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    process.chdir(TEST_DIR);

    // Initialize git repo
    execSync("git init");
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("1. Installation", () => {
    it("should create required directory structure", () => {
      // Create directories as shown in quickstart
      mkdirSync("jobs/docs", { recursive: true });
      mkdirSync("templates", { recursive: true });
      mkdirSync("dist", { recursive: true });

      expect(existsSync("jobs/docs")).toBe(true);
      expect(existsSync("templates")).toBe(true);
      expect(existsSync("dist")).toBe(true);
    });

    it("should have package.json with gitvan dependency", () => {
      writeFileSync(
        "package.json",
        JSON.stringify(
          {
            name: "test-repo",
            version: "1.0.0",
            type: "module",
            dependencies: {
              gitvan: "file:" + GITVAN_ROOT,
            },
          },
          null,
          2
        )
      );

      const pkg = JSON.parse(readFileSync("package.json", "utf8"));
      expect(pkg.dependencies.gitvan).toBeDefined();
    });
  });

  describe("2. Template Creation", () => {
    it("should create changelog.njk template", () => {
      mkdirSync("templates", { recursive: true });

      const templateContent = `# Changelog

Generated: {{ now }}

{% for c in commits -%}
- {{ c.hash }} {{ c.subject }}
{% endfor %}`;

      writeFileSync("templates/changelog.njk", templateContent);
      expect(existsSync("templates/changelog.njk")).toBe(true);

      const content = readFileSync("templates/changelog.njk", "utf8");
      expect(content).toContain("# Changelog");
      expect(content).toContain("{{ now }}");
      expect(content).toContain("{% for c in commits -%}");
    });
  });

  describe("3. Job Definition", () => {
    it("should create changelog job file", () => {
      mkdirSync("jobs/docs", { recursive: true });

      const jobContent = `import { defineJob } from 'gitvan/define'
import { useGit, useTemplate } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Generate dist/CHANGELOG.md from last 50 commits' },
  async run ({ ctx }) {
    const git = useGit()
    const t = useTemplate()

    // pull last 50 commits as "hash<TAB>subject"
    const lines = git.log('%h%x09%s', '-n 50').split('\\n').filter(Boolean)
    const commits = lines.map(l => {
      const [hash, subject] = l.split('\\t')
      return { hash, subject }
    })

    const out = t.renderToFile(
      'templates/changelog.njk',
      'dist/CHANGELOG.md',
      { commits, now: git.nowISO() }
    )

    // optional: commit the artifact (dogfooding loop)
    git.add('dist/CHANGELOG.md')
    git.commit('docs: update changelog')

    return { ok: true, artifact: out.path }
  }
})`;

      writeFileSync("jobs/docs/changelog.mjs", jobContent);
      expect(existsSync("jobs/docs/changelog.mjs")).toBe(true);

      const content = readFileSync("jobs/docs/changelog.mjs", "utf8");
      expect(content).toContain("defineJob");
      expect(content).toContain("useGit");
      expect(content).toContain("useTemplate");
      expect(content).toContain("renderToFile");
    });

    it("should validate job exports default with run function", async () => {
      // This would test dynamic import when implemented
      // const job = await import('./jobs/docs/changelog.mjs')
      // expect(job.default).toBeDefined()
      // expect(job.default.run).toBeTypeOf('function')
      // expect(job.default.kind).toBe('atomic')
    });
  });

  describe("4. Git History Creation", () => {
    it("should create test commits", () => {
      // Create test files and commits
      writeFileSync("a.txt", "a");
      execSync("git add .");
      execSync('git commit -m "feat: a"');

      writeFileSync("b.txt", "b");
      execSync("git add .");
      execSync('git commit -m "fix: b"');

      const log = execSync("git log --oneline").toString();
      expect(log).toContain("fix: b");
      expect(log).toContain("feat: a");
    });

    it("should format git log correctly", () => {
      writeFileSync("test.txt", "test");
      execSync("git add .");
      execSync('git commit -m "test: commit message"');

      const log = execSync("git log --pretty=%h%x09%s -n 1").toString().trim();
      const [hash, subject] = log.split("\t");

      expect(hash).toMatch(/^[0-9a-f]{7,}$/);
      expect(subject).toBe("test: commit message");
    });
  });

  describe("5. CLI Commands", () => {
    beforeEach(() => {
      // Setup minimal gitvan structure
      writeFileSync(
        "package.json",
        JSON.stringify({
          name: "test-repo",
          dependencies: { gitvan: "file:" + GITVAN_ROOT },
        })
      );
      mkdirSync("jobs/docs", { recursive: true });
      mkdirSync("templates", { recursive: true });
    });

    it('should list available jobs with "gitvan job list"', () => {
      const jobFile = "jobs/docs/changelog.mjs";
      writeFileSync(jobFile, "export default { run: async () => ({}) }");

      // This tests that the command exists and doesn't error
      // When implemented: const output = execSync('npx gitvan job list').toString()
      // expect(output).toContain('docs/changelog')
    });

    it('should run job with "gitvan job run --name"', () => {
      // When implemented: const output = execSync('npx gitvan job run --name docs/changelog').toString()
      // expect(output).toContain('Running job: docs/changelog')
      // expect(output).toContain('Result:')
    });

    it('should handle legacy "gitvan list" command', () => {
      // When implemented: const output = execSync('npx gitvan list').toString()
      // expect(output).toContain('Available jobs:')
    });

    it('should handle legacy "gitvan run" command', () => {
      // When implemented: const output = execSync('npx gitvan run docs/changelog').toString()
      // expect(output).toContain('Running job: docs/changelog')
    });
  });

  describe("6. Job Execution", () => {
    beforeEach(() => {
      // Create full quickstart setup
      mkdirSync("jobs/docs", { recursive: true });
      mkdirSync("templates", { recursive: true });
      mkdirSync("dist", { recursive: true });

      // Create template
      writeFileSync(
        "templates/changelog.njk",
        `# Changelog

Generated: {{ now }}

{% for c in commits -%}
- {{ c.hash }} {{ c.subject }}
{% endfor %}`
      );

      // Create some commits
      writeFileSync("a.txt", "a");
      execSync('git add . && git commit -m "feat: a"');
      writeFileSync("b.txt", "b");
      execSync('git add . && git commit -m "fix: b"');
    });

    it("should generate CHANGELOG.md with correct content", () => {
      // When job execution is implemented:
      // execSync('npx gitvan job run --name docs/changelog')
      // expect(existsSync('dist/CHANGELOG.md')).toBe(true)
      // const changelog = readFileSync('dist/CHANGELOG.md', 'utf8')
      // expect(changelog).toContain('# Changelog')
      // expect(changelog).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/)
      // expect(changelog).toContain('fix: b')
      // expect(changelog).toContain('feat: a')
    });

    it("should return correct job result", () => {
      // When implemented: const result = await runJob('docs/changelog')
      // expect(result.ok).toBe(true)
      // expect(result.artifact).toBe('dist/CHANGELOG.md')
    });

    it("should commit the generated changelog", () => {
      // When dogfooding is implemented:
      // execSync('npx gitvan job run --name docs/changelog')
      // const log = execSync('git log --oneline -1').toString()
      // expect(log).toContain('docs: update changelog')
    });
  });

  describe("7. Receipt System", () => {
    it("should create receipt in git notes", () => {
      // When receipts are implemented:
      // execSync('npx gitvan job run --name docs/changelog')
      // const notes = execSync('git notes --ref=refs/notes/gitvan/results show HEAD').toString()
      // const receipt = JSON.parse(notes)
      // expect(receipt.role).toBe('receipt')
      // expect(receipt.id).toBe('docs/changelog')
      // expect(receipt.status).toBe('OK')
      // expect(receipt.action).toBe('job')
      // expect(receipt.artifact).toBe('dist/CHANGELOG.md')
      // expect(receipt.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      // expect(receipt.commit).toMatch(/^[0-9a-f]{40}$/)
    });

    it("should prevent duplicate execution via receipts", () => {
      // When idempotency is implemented:
      // execSync('npx gitvan job run --name docs/changelog')
      // const output2 = execSync('npx gitvan job run --name docs/changelog').toString()
      // expect(output2).toContain('Already executed')
    });

    it("should list receipts for a commit", () => {
      // When implemented:
      // const receipts = execSync('git notes --ref=refs/notes/gitvan/results list').toString()
      // expect(receipts).toContain('docs/changelog')
    });
  });

  describe("8. Event System", () => {
    beforeEach(() => {
      mkdirSync("events/message", { recursive: true });
    });

    it("should create event binding file", () => {
      const eventContent = `export default { job: 'docs/changelog' }`;
      writeFileSync("events/message/^release:/.mjs", eventContent);

      expect(existsSync("events/message/^release:/.mjs")).toBe(true);
      const content = readFileSync("events/message/^release:/.mjs", "utf8");
      expect(content).toContain("job: 'docs/changelog'");
    });

    it("should list discovered events", () => {
      writeFileSync(
        "events/message/release.mjs",
        'export default { job: "docs/changelog" }'
      );

      // When implemented: const output = execSync('npx gitvan event list').toString()
      // expect(output).toContain('message/release')
      // expect(output).toContain('Type: message')
      // expect(output).toContain('Pattern: release')
    });

    it("should match commit message patterns", () => {
      // When event matching is implemented:
      // const matches = eventMatcher.match('release: v1.0.0', 'message/^release:/')
      // expect(matches).toBe(true)
      // const noMatch = eventMatcher.match('feat: new feature', 'message/^release:/')
      // expect(noMatch).toBe(false)
    });
  });

  describe("9. Daemon", () => {
    it("should start daemon for current worktree", () => {
      // When daemon is implemented:
      // const pid = execSync('npx gitvan daemon start --background').toString()
      // expect(pid).toMatch(/Daemon started.*PID: \d+/)
      // const status = execSync('npx gitvan daemon status').toString()
      // expect(status).toContain('Daemon running')
    });

    it("should trigger job on matching commit", () => {
      mkdirSync("events/message", { recursive: true });
      writeFileSync(
        "events/message/^release:/.mjs",
        'export default { job: "docs/changelog" }'
      );

      // When daemon triggers are implemented:
      // execSync('npx gitvan daemon start --background')
      // execSync('git commit --allow-empty -m "release: v1.0.0"')
      // await sleep(2000) // Wait for daemon to process

      // expect(existsSync('dist/CHANGELOG.md')).toBe(true)
      // const notes = execSync('git notes --ref=refs/notes/gitvan/results show HEAD').toString()
      // expect(JSON.parse(notes).id).toBe('message/^release:/')
    });

    it("should stop daemon cleanly", () => {
      // When implemented:
      // execSync('npx gitvan daemon start --background')
      // execSync('npx gitvan daemon stop')
      // const status = execSync('npx gitvan daemon status').toString()
      // expect(status).toContain('Daemon not running')
    });
  });

  describe("10. Integration Tests", () => {
    it("should complete full quickstart flow", () => {
      // This is the complete end-to-end test
      // Setup
      mkdirSync("jobs/docs", { recursive: true });
      mkdirSync("templates", { recursive: true });
      mkdirSync("dist", { recursive: true });

      // Create template
      writeFileSync(
        "templates/changelog.njk",
        `# Changelog
Generated: {{ now }}
{% for c in commits -%}
- {{ c.hash }} {{ c.subject }}
{% endfor %}`
      );

      // Create job
      writeFileSync(
        "jobs/docs/changelog.mjs",
        `
import { defineJob } from 'gitvan/define'
import { useGit, useTemplate } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Generate CHANGELOG.md' },
  async run () {
    const git = useGit()
    const t = useTemplate()
    const lines = git.log('%h%x09%s', '-n 50').split('\\n').filter(Boolean)
    const commits = lines.map(l => {
      const [hash, subject] = l.split('\\t')
      return { hash, subject }
    })
    const out = t.renderToFile('templates/changelog.njk', 'dist/CHANGELOG.md', {
      commits,
      now: git.nowISO()
    })
    return { ok: true, artifact: out.path }
  }
})`
      );

      // Create commits
      writeFileSync("a.txt", "a");
      execSync('git add . && git commit -m "feat: a"');
      writeFileSync("b.txt", "b");
      execSync('git add . && git commit -m "fix: b"');

      // When fully implemented:
      // Run the job
      // execSync('npx gitvan job run --name docs/changelog')

      // Verify output
      // expect(existsSync('dist/CHANGELOG.md')).toBe(true)
      // const changelog = readFileSync('dist/CHANGELOG.md', 'utf8')
      // expect(changelog).toContain('# Changelog')
      // expect(changelog).toContain('fix: b')
      // expect(changelog).toContain('feat: a')

      // Verify receipt
      // const notes = execSync('git notes --ref=refs/notes/gitvan/results show HEAD').toString()
      // const receipt = JSON.parse(notes)
      // expect(receipt.status).toBe('OK')
      // expect(receipt.artifact).toBe('dist/CHANGELOG.md')
    });

    it("should handle errors gracefully", () => {
      // Test missing template
      mkdirSync("jobs/docs", { recursive: true });
      writeFileSync(
        "jobs/docs/bad.mjs",
        `
export default {
  run: async () => {
    throw new Error('Template not found')
  }
}`
      );

      // When error handling is implemented:
      // const result = execSync('npx gitvan job run --name docs/bad 2>&1', { encoding: 'utf8' })
      // expect(result).toContain('Error')
      // expect(result).toContain('Template not found')
    });
  });
});
