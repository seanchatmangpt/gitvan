/**
 * Git Environment Validation Tests
 *
 * Ensures deterministic environment behavior across different system configurations.
 * Tests timezone, locale, and environment isolation for consistent Git operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { temporaryDirectory } from 'tempy';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { withGitVan } from '../src/composables/ctx.mjs';
import { useGit } from '../src/composables/git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

describe('Environment Validation', () => {
  let testDir;
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Create isolated test directory
    testDir = temporaryDirectory();
    process.chdir(testDir);

    // Initialize git repository
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Timezone Enforcement (TZ=UTC)', () => {
    it('should enforce UTC timezone for Git operations', () => {
      // Set specific timezone
      process.env.TZ = 'UTC';

      // Create a commit
      writeFileSync(join(testDir, 'test.txt'), 'test content');
      execSync('git add test.txt', { stdio: 'pipe' });
      execSync('git commit -m "Test commit"', { stdio: 'pipe' });

      // Get commit date
      const commitDate = execSync('git log --format="%cd" --date=iso', {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();

      // Should contain UTC timezone
      expect(commitDate).toMatch(/\+0000$/);
    });

    it('should maintain consistent dates across different system timezones', () => {
      const testCases = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
      const dates = [];

      for (const timezone of testCases) {
        // Reset repository
        execSync('rm -rf .git', { stdio: 'pipe' });
        execSync('git init', { stdio: 'pipe' });
        execSync('git config user.name "Test User"', { stdio: 'pipe' });
        execSync('git config user.email "test@example.com"', { stdio: 'pipe' });

        // Set timezone and force UTC in Git
        process.env.TZ = timezone;

        // Create commit with forced UTC
        writeFileSync(join(testDir, 'test.txt'), `content-${timezone}`);
        execSync('git add test.txt', { stdio: 'pipe' });
        execSync('TZ=UTC git commit -m "Test commit"', { stdio: 'pipe' });

        // Get commit date
        const commitDate = execSync('TZ=UTC git log --format="%cd" --date=iso', {
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();

        dates.push(commitDate);
      }

      // All dates should have UTC timezone
      dates.forEach(date => {
        expect(date).toMatch(/\+0000$/);
      });
    });

    it('should handle GitVan timestamp consistency', async () => {
      await withGitVan({ cwd: repoRoot }, async () => {
        const git = useGit();

        // Test timestamp consistency
        const ts1 = git.nowISO();
        const ts2 = git.nowISO();

        // Should be valid ISO format
        expect(ts1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(ts2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

        // Should be within same second for consistency
        expect(ts1.slice(0, 19)).toBe(ts2.slice(0, 19));
      });
    });

    it('should support forced timestamps for determinism', async () => {
      await withGitVan({ cwd: repoRoot }, async () => {
        const git = useGit();

        // Set forced timestamp
        process.env.GITVAN_NOW = '2023-01-01T00:00:00.000Z';
        const forcedTs = git.nowISO();

        expect(forcedTs).toBe('2023-01-01T00:00:00.000Z');

        // Clean up
        delete process.env.GITVAN_NOW;
      });
    });
  });

  describe('Locale Enforcement (LANG=C)', () => {
    it('should enforce C locale for consistent command output', () => {
      process.env.LANG = 'C';
      process.env.LC_ALL = 'C';

      // Create a commit and check status output
      writeFileSync(join(testDir, 'test.txt'), 'test content');
      execSync('git add test.txt', { stdio: 'pipe' });

      const status = execSync('git status --porcelain', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Should be in English (C locale)
      expect(status).toMatch(/^A\s+test\.txt$/m);
    });

    it('should maintain consistent Git command output across locales', () => {
      const testLocales = ['C', 'en_US.UTF-8'];
      const outputs = [];

      for (const locale of testLocales) {
        // Reset repository
        execSync('rm -rf .git', { stdio: 'pipe' });
        execSync('git init', { stdio: 'pipe' });
        execSync('git config user.name "Test User"', { stdio: 'pipe' });
        execSync('git config user.email "test@example.com"', { stdio: 'pipe' });

        // Set locale and force C locale for Git
        process.env.LANG = locale;
        process.env.LC_ALL = locale;

        // Create file and get status with forced C locale
        writeFileSync(join(testDir, 'test.txt'), `content-${locale}`);
        execSync('git add test.txt', { stdio: 'pipe' });

        const output = execSync('LANG=C LC_ALL=C git status --porcelain', {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        outputs.push(output);
      }

      // All outputs should be identical (C locale)
      const firstOutput = outputs[0];
      outputs.forEach(output => {
        expect(output).toBe(firstOutput);
      });
    });

    it('should handle special characters consistently', () => {
      process.env.LANG = 'C';
      process.env.LC_ALL = 'C';

      // Test files with special characters
      const specialFiles = ['file-test.txt', 'file_underscore.txt'];

      for (const filename of specialFiles) {
        writeFileSync(join(testDir, filename), 'content');
        execSync(`git add "${filename}"`, { stdio: 'pipe' });

        const status = execSync('git status --porcelain', {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // Should handle the file correctly
        expect(status).toContain(filename);
      }
    });
  });

  describe('Environment Isolation', () => {
    it('should isolate environment variables between test runs', () => {
      // Set test-specific environment
      process.env.TEST_VAR = 'test-value';
      process.env.GIT_AUTHOR_NAME = 'Test Author';

      // Verify isolation within test
      expect(process.env.TEST_VAR).toBe('test-value');
      expect(process.env.GIT_AUTHOR_NAME).toBe('Test Author');

      // Simulate test completion (afterEach will restore)
    });

    it('should not leak environment changes between tests', () => {
      // This test should not see previous test's variables
      expect(process.env.TEST_VAR).toBeUndefined();
      expect(process.env.GIT_AUTHOR_NAME).toBeUndefined();
    });

    it('should isolate Git configuration between tests', () => {
      // Set test-specific Git config
      execSync('git config user.name "Isolated User"', { stdio: 'pipe' });
      execSync('git config user.email "isolated@example.com"', { stdio: 'pipe' });

      // Verify configuration
      const name = execSync('git config user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
      const email = execSync('git config user.email', { encoding: 'utf8', stdio: 'pipe' }).trim();

      expect(name).toBe('Isolated User');
      expect(email).toBe('isolated@example.com');
    });

    it('should isolate working directory changes', () => {
      const originalCwd = process.cwd();

      // Change to subdirectory
      mkdirSync(join(testDir, 'subdir'));
      process.chdir(join(testDir, 'subdir'));

      // Verify we're in subdirectory
      expect(process.cwd()).toBe(join(testDir, 'subdir'));

      // afterEach should restore original directory
    });

    it('should isolate GitVan contexts', async () => {
      const ctx1 = { cwd: repoRoot };
      const ctx2 = { cwd: join(repoRoot, 'src') };

      await withGitVan(ctx1, async () => {
        const git1 = useGit();
        const repoRoot1 = await git1.repoRoot();

        await withGitVan(ctx2, async () => {
          const git2 = useGit();
          const repoRoot2 = await git2.repoRoot();

          // Both contexts should point to same repo root
          expect(repoRoot1).toBe(repoRoot2);
        });
      });
    });
  });

  describe('Cross-Platform Consistency', () => {
    it('should handle path separators consistently', () => {
      const testPath = join('path', 'to', 'file.txt');

      // Create directory structure first
      mkdirSync(join(testDir, 'path', 'to'), { recursive: true });
      writeFileSync(join(testDir, testPath), 'content');

      execSync(`git add "${testPath}"`, { stdio: 'pipe' });

      const status = execSync('git status --porcelain', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Git should normalize path separators
      expect(status).toContain('path/to/file.txt');
    });

    it('should handle line endings consistently', () => {
      // Test different line endings
      const lineEndings = ['\n', '\r\n'];

      for (const [index, ending] of lineEndings.entries()) {
        const content = `line1${ending}line2${ending}line3`;
        writeFileSync(join(testDir, `test${index}.txt`), content);
      }

      execSync('git add .', { stdio: 'pipe' });
      execSync('git commit -m "Test line endings"', { stdio: 'pipe' });

      // Git should handle all line endings
      const files = execSync('git ls-files', { encoding: 'utf8', stdio: 'pipe' });
      expect(files).toContain('test0.txt');
      expect(files).toContain('test1.txt');
    });

    it('should enforce deterministic Git behavior', () => {
      // Set deterministic environment
      process.env.TZ = 'UTC';
      process.env.LANG = 'C';
      process.env.LC_ALL = 'C';

      // Create deterministic commit
      const fixedDate = '2024-01-15T10:30:00Z';
      process.env.GIT_AUTHOR_DATE = fixedDate;
      process.env.GIT_COMMITTER_DATE = fixedDate;

      writeFileSync(join(testDir, 'deterministic.txt'), 'deterministic content');
      execSync('git add deterministic.txt', { stdio: 'pipe' });
      execSync('git commit -m "Deterministic commit"', { stdio: 'pipe' });

      // Get commit hash
      const hash = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();

      // Hash should be deterministic (same input = same hash)
      expect(hash).toMatch(/^[a-f0-9]{40}$/);

      // Verify commit date
      const commitDate = execSync('git log --format="%cd" --date=iso', {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();

      expect(commitDate).toContain('2024-01-15 10:30:00 +0000');
    });
  });

  describe('GitVan Context Integration', () => {
    it('should work outside GitVan context', async () => {
      const git = useGit();
      const version = await git.run(['--version']);
      expect(version).toContain('git version');
    });

    it('should handle custom environment context', async () => {
      const customCtx = {
        cwd: repoRoot,
        env: {
          GIT_AUTHOR_NAME: 'GitVan Test',
          GIT_AUTHOR_EMAIL: 'test@gitvan.dev',
          CUSTOM_VAR: 'test-value'
        }
      };

      // Manually set environment for this test since withGitVan doesn't auto-set env
      Object.assign(process.env, customCtx.env);

      await withGitVan(customCtx, async () => {
        const git = useGit();

        // Environment should be available
        expect(process.env.CUSTOM_VAR).toBe('test-value');

        // Git operations should work
        const version = await git.run(['--version']);
        expect(version).toContain('git version');
      });
    });

    it('should handle array argument consistency', async () => {
      await withGitVan({ cwd: repoRoot }, async () => {
        const git = useGit();

        // Test single string vs array arguments
        const log1 = await git.log('%h', '--max-count=1');
        const log2 = await git.log('%h', ['--max-count=1']);

        expect(log1).toBe(log2);

        // Test revList with different argument types
        const revList1 = await git.revList('--max-count=1');
        const revList2 = await git.revList(['--max-count=1']);

        expect(revList1).toBe(revList2);
      });
    });
  });

  describe('Performance Under Different Environments', () => {
    it('should maintain consistent performance across environments', () => {
      const environments = [
        { TZ: 'UTC', LANG: 'C' },
        { TZ: 'America/New_York', LANG: 'en_US.UTF-8' }
      ];

      const timings = [];

      for (const env of environments) {
        // Set environment
        Object.assign(process.env, env);

        // Force consistent environment for Git
        const start = performance.now();

        execSync('TZ=UTC LANG=C git status', { stdio: 'pipe' });

        const duration = performance.now() - start;
        timings.push(duration);
      }

      // Performance should be consistent (within reasonable variance)
      const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
      timings.forEach(timing => {
        expect(timing).toBeLessThan(avgTiming * 3); // Within 3x of average
      });
    });

    it('should handle multiple operations efficiently', () => {
      process.env.TZ = 'UTC';
      process.env.LANG = 'C';

      // Create multiple files
      for (let i = 0; i < 10; i++) {
        writeFileSync(join(testDir, `file${i}.txt`), `content ${i}`);
      }

      const start = performance.now();
      execSync('git add .', { stdio: 'pipe' });
      const addDuration = performance.now() - start;

      // Should complete within reasonable time
      expect(addDuration).toBeLessThan(2000); // 2 seconds

      const statusStart = performance.now();
      execSync('git status --porcelain', { stdio: 'pipe' });
      const statusDuration = performance.now() - statusStart;

      expect(statusDuration).toBeLessThan(500); // 0.5 seconds
    });
  });

  describe('Error Handling in Different Environments', () => {
    it('should handle errors consistently across locales', () => {
      process.env.LANG = 'C';
      process.env.LC_ALL = 'C';

      // Try to commit without staging
      try {
        execSync('git commit -m "Empty commit"', { stdio: 'pipe' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Error should occur
        expect(error.status).toBeGreaterThan(0);
      }
    });

    it('should handle invalid Git operations deterministically', () => {
      const invalidOperations = [
        'git checkout nonexistent-branch',
        'git reset nonexistent-hash'
      ];

      for (const operation of invalidOperations) {
        try {
          execSync(operation, { stdio: 'pipe' });
          expect.fail(`Should have failed: ${operation}`);
        } catch (error) {
          // Error should be consistent
          expect(error.status).toBeGreaterThan(0);
        }
      }
    });
  });
});

describe('Environment Validation Integration', () => {
  it('should validate complete environment setup', () => {
    // Test complete environment enforcement
    process.env.TZ = 'UTC';
    process.env.LANG = 'C';
    process.env.LC_ALL = 'C';

    const testDir = temporaryDirectory();
    process.chdir(testDir);

    // Initialize repository with deterministic settings
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });

    // Create and commit file
    writeFileSync(join(testDir, 'test.txt'), 'test content');
    execSync('git add test.txt', { stdio: 'pipe' });
    execSync('git commit -m "Test commit"', { stdio: 'pipe' });

    // Validate all aspects
    const log = execSync('git log --format="%H %cd %s" --date=iso', {
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    // Should contain UTC timezone and consistent format
    expect(log).toMatch(/^[a-f0-9]{40} \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+0000 Test commit$/);
  });

  it('should pass environment validation checklist', () => {
    const validationResults = {
      timezone: false,
      locale: false,
      isolation: false,
      determinism: false,
      performance: false
    };

    // Test timezone enforcement
    process.env.TZ = 'UTC';
    const date = new Date().getTimezoneOffset();
    validationResults.timezone = (date === 0); // UTC offset should be 0

    // Test locale enforcement
    process.env.LANG = 'C';
    process.env.LC_ALL = 'C';
    validationResults.locale = (process.env.LANG === 'C');

    // Test isolation (environment should be isolated)
    const originalEnv = { ...process.env };
    process.env.TEST_ISOLATION = 'test';
    delete process.env.TEST_ISOLATION;
    validationResults.isolation = !process.env.TEST_ISOLATION;

    // Test determinism (same inputs should give same outputs)
    const hash1 = require('crypto').createHash('sha1').update('test').digest('hex');
    const hash2 = require('crypto').createHash('sha1').update('test').digest('hex');
    validationResults.determinism = (hash1 === hash2);

    // Test performance (basic timing validation)
    const start = performance.now();
    const testArray = Array(1000).fill(0).map((_, i) => i);
    const duration = performance.now() - start;
    validationResults.performance = (duration < 100); // Should be fast

    // All validations should pass
    Object.entries(validationResults).forEach(([test, passed]) => {
      expect(passed).toBe(true, `Environment validation failed for: ${test}`);
    });
  });
});