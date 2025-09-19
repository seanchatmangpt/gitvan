#!/usr/bin/env node
// Comprehensive test of all useGit() functionality - Refactored with Hybrid Test Environment
import { describe, it, expect } from 'vitest';
import { withNativeGitTestEnvironment } from '../src/composables/test-environment.mjs';

describe('Comprehensive useGit() Test Suite - Hybrid Test Environment', () => {
  it('should test all basic Git operations', async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          'README.md': '# Comprehensive Test Repository\n',
          'src/index.js': 'console.log("Hello, World!");\n',
          'package.json': '{"name": "test-project", "version": "1.0.0"}\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe('native');

        // Test Git status
        const status = await env.gitStatus();
        expect(status).toBeDefined();

        // Test Git log
        const log = await env.gitLog();
        expect(log).toBeDefined();
        expect(log[0].message).toContain('Initial commit');

        // Test Git branch
        const branch = await env.gitCurrentBranch();
        expect(branch).toBe('master');

        // Test file operations
        env.files.write('src/utils.js', 'export const utils = {};\n');
        await env.gitAdd('src/utils.js');
        await env.gitCommit('Add utils module');

        // Verify commit
        const newLog = await env.gitLog();
        expect(newLog[0].message).toContain('Add utils module');
        expect(newLog[1].message).toContain('Initial commit');

        // Test multiple file operations
        env.files.write('src/components/Button.js', 'export const Button = () => {};\n');
        env.files.write('src/components/Modal.js', 'export const Modal = () => {};\n');
        env.files.write('tests/components/Button.test.js', 'describe("Button", () => {});\n');

        await env.gitAdd('.');
        await env.gitCommit('Add components and tests');

        // Verify final state
        const finalLog = await env.gitLog();
        expect(finalLog[0].message).toContain('Add components and tests');
        expect(finalLog[1].message).toContain('Add utils module');
        expect(finalLog[2].message).toContain('Initial commit');

        // Verify files exist
        expect(env.files.exists('src/utils.js')).toBe(true);
        expect(env.files.exists('src/components/Button.js')).toBe(true);
        expect(env.files.exists('src/components/Modal.js')).toBe(true);
        expect(env.files.exists('tests/components/Button.test.js')).toBe(true);
      }
    );
  });

  it('should test branch operations comprehensively', async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          'README.md': '# Branch Test Repository\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe('native');

        // Test branch creation and switching
        await env.gitCheckoutBranch('feature/auth');
        env.files.write('src/auth.js', 'export const auth = {};\n');
        await env.gitAdd('src/auth.js');
        await env.gitCommit('Add authentication module');

        await env.gitCheckoutBranch('feature/database');
        env.files.write('src/database.js', 'export const db = {};\n');
        await env.gitAdd('src/database.js');
        await env.gitCommit('Add database module');

        await env.gitCheckoutBranch('feature/api');
        env.files.write('src/api.js', 'export const api = {};\n');
        await env.gitAdd('src/api.js');
        await env.gitCommit('Add API module');

        // Switch back to main
        await env.gitCheckout('master');

        // Test branch listing
        const branches = await env.gitListBranches();
        expect(branches).toContain('master');
        expect(branches).toContain('feature/auth');
        expect(branches).toContain('feature/database');
        expect(branches).toContain('feature/api');

        // Merge all feature branches
        await env.gitMerge('feature/auth');
        await env.gitMerge('feature/database');
        await env.gitMerge('feature/api');

        // Verify final state
        const log = await env.gitLog();
        expect(log[0].message).toContain('Add API module');
        expect(log[1].message).toContain('Add database module');
        expect(log[2].message).toContain('Add authentication module');
        expect(log[3].message).toContain('Initial commit');

        // Verify all files exist
        expect(env.files.exists('src/auth.js')).toBe(true);
        expect(env.files.exists('src/database.js')).toBe(true);
        expect(env.files.exists('src/api.js')).toBe(true);
      }
    );
  });

  it('should test complex Git workflows', async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          'README.md': '# Complex Workflow Test\n',
          'package.json': '{"name": "complex-project", "version": "1.0.0"}\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe('native');

        // Create development branch
        await env.gitCheckoutBranch('develop');
        env.files.write('src/core.js', 'export const core = {};\n');
        await env.gitAdd('src/core.js');
        await env.gitCommit('Add core module');

        // Create feature branches from develop
        await env.gitCheckoutBranch('feature/user-management');
        env.files.write('src/users.js', 'export const users = {};\n');
        await env.gitAdd('src/users.js');
        await env.gitCommit('Add user management');

        await env.gitCheckoutBranch('feature/payment');
        env.files.write('src/payment.js', 'export const payment = {};\n');
        await env.gitAdd('src/payment.js');
        await env.gitCommit('Add payment system');

        // Merge features back to develop
        await env.gitCheckout('develop');
        await env.gitMerge('feature/user-management');
        await env.gitMerge('feature/payment');

        // Create release branch
        await env.gitCheckoutBranch('release/v1.0.0');
        env.files.write('CHANGELOG.md', '# Changelog\n\n## v1.0.0\n- Added user management\n- Added payment system\n');
        await env.gitAdd('CHANGELOG.md');
        await env.gitCommit('Prepare release v1.0.0');

        // Merge to main
        await env.gitCheckout('master');
        await env.gitMerge('release/v1.0.0');

        // Verify final state
        const log = await env.gitLog();
        expect(log[0].message).toContain('Prepare release v1.0.0');
        expect(log[1].message).toContain('Add payment system');
        expect(log[2].message).toContain('Add user management');
        expect(log[3].message).toContain('Add core module');
        expect(log[4].message).toContain('Initial commit');

        // Verify all files exist
        expect(env.files.exists('src/core.js')).toBe(true);
        expect(env.files.exists('src/users.js')).toBe(true);
        expect(env.files.exists('src/payment.js')).toBe(true);
        expect(env.files.exists('CHANGELOG.md')).toBe(true);
      }
    );
  });

  it('should demonstrate performance with many operations', async () => {
    const start = performance.now();

    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          'README.md': '# Performance Test\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe('native');

        // Create many files and commits
        for (let i = 0; i < 50; i++) {
          env.files.write(`src/module${i}.js`, `export const module${i} = {};\n`);
          await env.gitAdd(`src/module${i}.js`);
          await env.gitCommit(`Add module ${i}`);
        }

        // Create multiple branches
        for (let i = 0; i < 10; i++) {
          await env.gitCheckoutBranch(`feature/branch-${i}`);
          env.files.write(`src/feature${i}.js`, `export const feature${i} = {};\n`);
          await env.gitAdd(`src/feature${i}.js`);
          await env.gitCommit(`Add feature ${i}`);
          await env.gitCheckout('master');
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(20000); // Should complete within 20 seconds

        console.log(`✅ Performance test completed in ${duration.toFixed(2)}ms`);

        // Verify final state
        const log = await env.gitLog();
        expect(log.length).toBeGreaterThan(50); // Should have many commits

        // Verify files exist
        for (let i = 0; i < 50; i++) {
          expect(env.files.exists(`src/module${i}.js`)).toBe(true);
        }
      }
    );
  });

  it('should test Git error handling', async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          'README.md': '# Error Handling Test\n',
        },
      },
      async (env) => {
        // Verify backend type
        expect(env.getBackendType()).toBe('native');

        // Test Git operations that should work
        const status = await env.gitStatus();
        expect(status).toBeDefined();

        const log = await env.gitLog();
        expect(log).toBeDefined();

        const branch = await env.gitCurrentBranch();
        expect(branch).toBe('master');

        // Test file operations
        env.files.write('src/test.js', 'export const test = {};\n');
        await env.gitAdd('src/test.js');
        await env.gitCommit('Add test module');

        // Verify commit worked
        const newLog = await env.gitLog();
        expect(newLog[0].message).toContain('Add test module');

        // Test branch operations
        await env.gitCheckoutBranch('feature/test');
        expect(await env.gitCurrentBranch()).toBe('feature/test');

        // Switch back to main
        await env.gitCheckout('master');
        expect(await env.gitCurrentBranch()).toBe('master');

        // Test merge
        await env.gitMerge('feature/test');

        // Verify merge worked
        const finalLog = await env.gitLog();
        expect(finalLog[0].message).toContain('Add test module');
        expect(finalLog[1].message).toContain('Initial commit');
      }
    );
  });
});
