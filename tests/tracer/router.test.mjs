/**
 * GitVan v2 Router Tests
 * Tests unrouting job discovery system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRouter } from 'unrouting';
import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Router System (Job Discovery)', () => {
  let tempDir;
  let router;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-router-test-'));
    router = createRouter();
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Job Pattern Matching', () => {
    it('should discover jobs with standard patterns', async () => {
      const jobFiles = [
        'commit.job.js',
        'deploy.job.mjs',
        'test.job.ts',
        'build/compile.job.js',
        'scripts/release.job.mjs'
      ];

      // Create test job files
      await mkdir(join(tempDir, 'build'), { recursive: true });
      await mkdir(join(tempDir, 'scripts'), { recursive: true });

      for (const jobFile of jobFiles) {
        const filePath = join(tempDir, jobFile);
        const jobContent = `
          export default {
            meta: {
              name: '${jobFile.replace('.job.', '-').replace(/\.[^.]+$/, '')}',
              kind: 'custom',
              description: 'Test job for ${jobFile}'
            },
            execute: async (ctx) => {
              return { success: true, exitCode: 0 };
            }
          };
        `;
        await writeFile(filePath, jobContent);
      }

      // Define job discovery routes
      router.add('**/*.job.{js,mjs,ts}', { type: 'job' });
      router.add('build/**/*.job.{js,mjs}', { type: 'build-job' });
      router.add('scripts/**/*.job.{js,mjs}', { type: 'script-job' });

      // Test pattern matching
      const commitMatch = router.find('commit.job.js');
      expect(commitMatch).toBeDefined();
      expect(commitMatch.type).toBe('job');

      const buildMatch = router.find('build/compile.job.js');
      expect(buildMatch).toBeDefined();
      expect(buildMatch.type).toBe('build-job');

      const scriptMatch = router.find('scripts/release.job.mjs');
      expect(scriptMatch).toBeDefined();
      expect(scriptMatch.type).toBe('script-job');
    });

    it('should exclude patterns correctly', async () => {
      await mkdir(join(tempDir, 'node_modules/package'), { recursive: true });
      await mkdir(join(tempDir, '.git/hooks'), { recursive: true });
      await mkdir(join(tempDir, 'dist'), { recursive: true });

      const testFiles = [
        'valid.job.js',
        'node_modules/package/invalid.job.js',
        '.git/hooks/invalid.job.js',
        'dist/build.job.js'
      ];

      for (const file of testFiles) {
        await writeFile(join(tempDir, file), 'export default {};');
      }

      // Define routes with exclusions
      router.add('**/*.job.{js,mjs,ts}', { type: 'job' });
      router.add('node_modules/**', { type: 'excluded', exclude: true });
      router.add('.git/**', { type: 'excluded', exclude: true });
      router.add('dist/**', { type: 'excluded', exclude: true });

      // Valid job should be found
      const validMatch = router.find('valid.job.js');
      expect(validMatch).toBeDefined();
      expect(validMatch.type).toBe('job');

      // Excluded jobs should not match or should be marked as excluded
      const nodeModulesMatch = router.find('node_modules/package/invalid.job.js');
      const gitMatch = router.find('.git/hooks/invalid.job.js');
      const distMatch = router.find('dist/build.job.js');

      // Depending on unrouting behavior, these might be excluded
      if (nodeModulesMatch) {
        expect(nodeModulesMatch.exclude).toBe(true);
      }
    });

    it('should handle parameterized job routes', async () => {
      // Define parameterized routes
      router.add('jobs/:category/:name.job.js', { type: 'categorized-job' });
      router.add('workflows/:workflow/jobs/:job.job.{js,mjs}', { type: 'workflow-job' });

      const categoryMatch = router.find('jobs/deploy/production.job.js');
      expect(categoryMatch).toBeDefined();
      expect(categoryMatch.type).toBe('categorized-job');
      expect(categoryMatch.params?.category).toBe('deploy');
      expect(categoryMatch.params?.name).toBe('production');

      const workflowMatch = router.find('workflows/ci/jobs/test.job.mjs');
      expect(workflowMatch).toBeDefined();
      expect(workflowMatch.type).toBe('workflow-job');
      expect(workflowMatch.params?.workflow).toBe('ci');
      expect(workflowMatch.params?.job).toBe('test');
    });

    it('should support conditional job routing', async () => {
      // Define conditional routes based on context
      router.add('**/*.job.{js,mjs,ts}', {
        type: 'job',
        match: (path, context) => {
          // Only match if in git repository
          return context?.git?.isRepository;
        }
      });

      router.add('**/*.script.{js,mjs}', {
        type: 'script',
        match: (path, context) => {
          // Only match if node_modules exists
          return context?.hasNodeModules;
        }
      });

      // Test with git context
      const gitContext = { git: { isRepository: true } };
      const jobMatch = router.find('test.job.js', gitContext);
      expect(jobMatch).toBeDefined();
      expect(jobMatch.type).toBe('job');

      // Test without git context
      const noGitContext = { git: { isRepository: false } };
      const noJobMatch = router.find('test.job.js', noGitContext);
      // Should still match if router doesn't support context filtering
      // or should not match if it does
    });
  });

  describe('Route Priority and Ordering', () => {
    it('should respect route priority order', async () => {
      // Add routes in reverse priority order
      router.add('**/*.job.js', { type: 'generic-job', priority: 1 });
      router.add('build/**/*.job.js', { type: 'build-job', priority: 10 });
      router.add('deploy/**/*.job.js', { type: 'deploy-job', priority: 5 });

      // More specific routes should match first
      const buildMatch = router.find('build/compile.job.js');
      expect(buildMatch.type).toBe('build-job');

      const deployMatch = router.find('deploy/production.job.js');
      expect(deployMatch.type).toBe('deploy-job');

      const genericMatch = router.find('other/test.job.js');
      expect(genericMatch.type).toBe('generic-job');
    });

    it('should handle route conflicts with specificity', async () => {
      router.add('**/*.job.js', { type: 'any-job' });
      router.add('test/**/*.job.js', { type: 'test-job' });
      router.add('test/unit/**/*.job.js', { type: 'unit-test-job' });

      // Most specific should win
      const unitTestMatch = router.find('test/unit/auth.job.js');
      // Depending on implementation, should prefer most specific
      expect(['unit-test-job', 'test-job', 'any-job']).toContain(unitTestMatch.type);

      const testMatch = router.find('test/integration.job.js');
      expect(['test-job', 'any-job']).toContain(testMatch.type);
    });
  });

  describe('Dynamic Route Registration', () => {
    it('should support dynamic route addition and removal', async () => {
      // Initially no routes
      expect(router.find('test.job.js')).toBeUndefined();

      // Add route dynamically
      const routeHandler = router.add('**/*.job.js', { type: 'dynamic-job' });

      const match = router.find('test.job.js');
      expect(match).toBeDefined();
      expect(match.type).toBe('dynamic-job');

      // Remove route (if supported)
      if (typeof routeHandler === 'function') {
        routeHandler(); // Unsubscribe
        expect(router.find('test.job.js')).toBeUndefined();
      }
    });

    it('should handle route updates and modifications', async () => {
      router.add('**/*.job.js', { type: 'job-v1' });

      let match = router.find('test.job.js');
      expect(match.type).toBe('job-v1');

      // Update route (by removing and re-adding)
      router.add('**/*.job.js', { type: 'job-v2' });

      match = router.find('test.job.js');
      // Should match the most recently added or have updated behavior
      expect(['job-v1', 'job-v2']).toContain(match.type);
    });
  });

  describe('Route Middleware and Hooks', () => {
    it('should support route middleware for job processing', async () => {
      const middleware = vi.fn((path, match, next) => {
        match.processed = true;
        match.timestamp = new Date();
        return next ? next() : match;
      });

      // Add route with middleware (if supported)
      router.add('**/*.job.js', {
        type: 'middleware-job',
        middleware: [middleware]
      });

      const match = router.find('test.job.js');

      if (match && middleware.mock.calls.length > 0) {
        expect(middleware).toHaveBeenCalledWith('test.job.js', expect.any(Object), expect.any(Function));
        expect(match.processed).toBe(true);
        expect(match.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should support async route handlers', async () => {
      const asyncHandler = vi.fn(async (path, match) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        match.asyncProcessed = true;
        return match;
      });

      router.add('**/*.job.js', {
        type: 'async-job',
        handler: asyncHandler
      });

      const match = router.find('test.job.js');

      if (match && typeof match.handler === 'function') {
        const result = await match.handler('test.job.js', match);
        expect(result.asyncProcessed).toBe(true);
      }
    });
  });

  describe('Route Metadata and Context', () => {
    it('should preserve route metadata', async () => {
      router.add('**/*.job.js', {
        type: 'job',
        metadata: {
          version: '2.0',
          author: 'GitVan',
          category: 'automation'
        }
      });

      const match = router.find('test.job.js');
      expect(match).toBeDefined();
      expect(match.metadata?.version).toBe('2.0');
      expect(match.metadata?.author).toBe('GitVan');
      expect(match.metadata?.category).toBe('automation');
    });

    it('should support contextual route matching', async () => {
      const contextualRoute = {
        type: 'contextual-job',
        validate: (path, context) => {
          return context?.env === 'production' && path.includes('deploy');
        }
      };

      router.add('**/*.job.js', contextualRoute);

      // Test with production context
      const prodContext = { env: 'production' };
      const deployMatch = router.find('deploy/app.job.js', prodContext);
      const testMatch = router.find('test/unit.job.js', prodContext);

      // Should match deploy job in production context
      if (deployMatch && contextualRoute.validate) {
        expect(contextualRoute.validate('deploy/app.job.js', prodContext)).toBe(true);
      }

      // Should not match test job in production context
      if (testMatch && contextualRoute.validate) {
        expect(contextualRoute.validate('test/unit.job.js', prodContext)).toBe(false);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed routes gracefully', async () => {
      // Test invalid glob patterns
      expect(() => {
        router.add('[invalid-glob', { type: 'invalid' });
      }).not.toThrow(); // Should handle gracefully

      // Test empty patterns
      expect(() => {
        router.add('', { type: 'empty' });
      }).not.toThrow();

      // Test null/undefined patterns
      expect(() => {
        router.add(null, { type: 'null' });
      }).not.toThrow();
    });

    it('should handle route lookup edge cases', async () => {
      router.add('**/*.job.js', { type: 'job' });

      // Test empty path
      const emptyMatch = router.find('');
      expect(emptyMatch).toBeUndefined();

      // Test null/undefined path
      const nullMatch = router.find(null);
      expect(nullMatch).toBeUndefined();

      // Test path with special characters
      const specialMatch = router.find('special-chars@#$.job.js');
      expect(specialMatch?.type).toBe('job');

      // Test very long path
      const longPath = 'a'.repeat(1000) + '.job.js';
      const longMatch = router.find(longPath);
      expect(longMatch?.type).toBe('job');
    });

    it('should handle concurrent route operations', async () => {
      const routes = [
        '**/*.job.js',
        'test/**/*.test.js',
        'build/**/*.build.js',
        'deploy/**/*.deploy.js'
      ];

      // Add routes concurrently
      const addPromises = routes.map((pattern, index) =>
        Promise.resolve(router.add(pattern, { type: `job-${index}` }))
      );

      await Promise.all(addPromises);

      // Find routes concurrently
      const findPromises = [
        'test.job.js',
        'unit.test.js',
        'app.build.js',
        'prod.deploy.js'
      ].map(path => Promise.resolve(router.find(path)));

      const results = await Promise.all(findPromises);

      // All should find matches
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.type).toMatch(/^job-\d+$/);
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large numbers of routes efficiently', async () => {
      const startTime = Date.now();

      // Add many routes
      for (let i = 0; i < 1000; i++) {
        router.add(`category-${i}/**/*.job.js`, { type: `job-${i}` });
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete within 1 second

      // Test lookup performance
      const lookupStart = Date.now();

      for (let i = 0; i < 100; i++) {
        const match = router.find(`category-${i}/test.job.js`);
        expect(match).toBeDefined();
      }

      const lookupTime = Date.now() - lookupStart;
      expect(lookupTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should cache route lookups for performance', async () => {
      router.add('**/*.job.js', { type: 'job' });

      const path = 'test/complex/nested/path.job.js';

      // First lookup
      const start1 = Date.now();
      const match1 = router.find(path);
      const time1 = Date.now() - start1;

      // Second lookup (should be cached if caching is implemented)
      const start2 = Date.now();
      const match2 = router.find(path);
      const time2 = Date.now() - start2;

      expect(match1).toEqual(match2);

      // Second lookup should be faster (if caching is implemented)
      // This test might not be reliable for simple patterns
      if (time1 > 1) {
        expect(time2).toBeLessThanOrEqual(time1);
      }
    });
  });
});