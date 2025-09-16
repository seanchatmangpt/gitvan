/**
 * UNCTX Integration Validation Tests
 * Core validation of unctx context preservation and functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('UNCTX Integration Validation', () => {
  let mockExecFile;
  let mockUseGitVan;
  let mockTryUseGitVan;
  let mockWithGitVan;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock execFile
    mockExecFile = vi.fn().mockResolvedValue({ stdout: 'mocked-output\n' });
    vi.doMock('node:child_process', () => ({
      execFile: mockExecFile
    }));

    // Mock the context module BEFORE importing anything else
    vi.doMock('../src/core/context.mjs', () => {
      const mockContext = {
        cwd: '/test/repo',
        env: {
          ...process.env,
          TZ: 'UTC',
          LANG: 'C',
          NODE_ENV: 'test'
        }
      };

      return {
        useGitVan: vi.fn(() => mockContext),
        tryUseGitVan: vi.fn(() => mockContext),
        withGitVan: vi.fn((context, fn) => fn()),
        bindContext: vi.fn(() => mockContext) // This was missing!
      };
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Core Context Functionality', () => {
    it('should bind context correctly during git operations', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/test/context/repo',
        env: {
          GITVAN_TEST: 'context-bound',
          GIT_AUTHOR_NAME: 'Context User'
        }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();
      await git.branch();

      // Verify context was used in execFile call
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        expect.objectContaining({
          cwd: '/test/context/repo',
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C',
            GITVAN_TEST: 'context-bound',
            GIT_AUTHOR_NAME: 'Context User'
          })
        })
      );

      expect(mockUseGitVan).toHaveBeenCalledTimes(1);
    });

    it('should fallback gracefully when context is unavailable', async () => {
      mockUseGitVan = vi.fn(() => {
        throw new Error('No context available');
      });

      mockTryUseGitVan = vi.fn(() => ({
        cwd: '/fallback/repo',
        env: { FALLBACK_CONTEXT: 'true' }
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();
      await git.head();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', 'HEAD'],
        expect.objectContaining({
          cwd: '/fallback/repo',
          env: expect.objectContaining({
            FALLBACK_CONTEXT: 'true'
          })
        })
      );

      expect(mockUseGitVan).toHaveBeenCalledTimes(1);
      expect(mockTryUseGitVan).toHaveBeenCalledTimes(1);
    });

    it('should use process defaults when no context functions available', async () => {
      vi.doMock('../src/core/context.mjs', () => ({
        bindContext: vi.fn(() => {
          const cwd = process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
          };
          return { ctx: null, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();
      await git.statusPorcelain();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['status', '--porcelain'],
        expect.objectContaining({
          cwd: process.cwd(),
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        })
      );
    });
  });

  describe('Async Context Preservation', () => {
    it('should preserve context across async operations', async () => {
      const contextId = `async-test-${Date.now()}`;

      mockUseGitVan = vi.fn(() => ({
        cwd: '/async/test/repo',
        env: { ASYNC_CONTEXT_ID: contextId }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Execute multiple async operations
      await git.branch();
      await new Promise(resolve => setTimeout(resolve, 10));
      await git.head();
      await new Promise(resolve => setTimeout(resolve, 5));
      await git.statusPorcelain();

      // All operations should use the same context
      expect(mockExecFile).toHaveBeenCalledTimes(3);

      mockExecFile.mock.calls.forEach(call => {
        expect(call[2].cwd).toBe('/async/test/repo');
        expect(call[2].env.ASYNC_CONTEXT_ID).toBe(contextId);
      });
    });

    it('should handle concurrent operations with separate contexts', async () => {
      let callCount = 0;

      mockUseGitVan = vi.fn(() => {
        callCount++;
        return {
          cwd: `/concurrent/repo-${callCount}`,
          env: { CONCURRENT_ID: callCount.toString() }
        };
      });

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      // Create concurrent git operations
      const operations = [
        (async () => {
          const git = useGit();
          await new Promise(resolve => setTimeout(resolve, 20));
          return git.branch();
        })(),
        (async () => {
          const git = useGit();
          await new Promise(resolve => setTimeout(resolve, 10));
          return git.head();
        })(),
        (async () => {
          const git = useGit();
          await new Promise(resolve => setTimeout(resolve, 15));
          return git.statusPorcelain();
        })()
      ];

      await Promise.all(operations);

      // Each operation should have used its own context
      expect(mockExecFile).toHaveBeenCalledTimes(3);
      expect(mockUseGitVan).toHaveBeenCalledTimes(3);

      // Verify each call used different contexts
      const cwds = mockExecFile.mock.calls.map(call => call[2].cwd);
      const uniqueCwds = new Set(cwds);
      expect(uniqueCwds.size).toBe(3);
    });
  });

  describe('withGitVan Wrapper Integration', () => {
    beforeEach(() => {
      mockWithGitVan = vi.fn((ctx, fn) => {
        const originalUseGitVan = mockUseGitVan;
        mockUseGitVan = vi.fn(() => ctx);
        try {
          return fn();
        } finally {
          mockUseGitVan = originalUseGitVan;
        }
      });
    });

    it('should provide context through withGitVan wrapper', async () => {
      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        withGitVan: mockWithGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { withGitVan } = await import('../src/core/context.mjs');
      const { useGit } = await import('../src/composables/git.mjs');

      const testContext = {
        cwd: '/wrapper/test/repo',
        env: { WRAPPER_TEST: 'active' }
      };

      const result = withGitVan(testContext, async () => {
        const git = useGit();
        await git.branch();
        return 'wrapper-success';
      });

      expect(await result).toBe('wrapper-success');
      expect(mockWithGitVan).toHaveBeenCalledWith(testContext, expect.any(Function));

      // Verify the wrapped context was used
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        expect.objectContaining({
          cwd: '/wrapper/test/repo',
          env: expect.objectContaining({
            WRAPPER_TEST: 'active'
          })
        })
      );
    });

    it('should handle nested withGitVan calls', async () => {
      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        withGitVan: mockWithGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { withGitVan } = await import('../src/core/context.mjs');
      const { useGit } = await import('../src/composables/git.mjs');

      const outerContext = { cwd: '/outer/repo', env: { LEVEL: 'outer' } };
      const innerContext = { cwd: '/inner/repo', env: { LEVEL: 'inner' } };

      const result = withGitVan(outerContext, () => {
        return withGitVan(innerContext, async () => {
          const git = useGit();
          await git.head();
          return 'nested-success';
        });
      });

      expect(await result).toBe('nested-success');

      // The inner context should have been used
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', 'HEAD'],
        expect.objectContaining({
          cwd: '/inner/repo',
          env: expect.objectContaining({
            LEVEL: 'inner'
          })
        })
      );
    });
  });

  describe('Context Isolation and Memory Management', () => {
    it('should not leak context between operations', async () => {
      const contexts = [
        { cwd: '/isolated/repo1', env: { ISOLATION_TEST: '1' } },
        { cwd: '/isolated/repo2', env: { ISOLATION_TEST: '2' } },
        { cwd: '/isolated/repo3', env: { ISOLATION_TEST: '3' } }
      ];

      let contextIndex = 0;
      mockUseGitVan = vi.fn(() => contexts[contextIndex++]);
      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      // Create separate git instances
      const git1 = useGit();
      const git2 = useGit();
      const git3 = useGit();

      // Execute operations
      await Promise.all([
        git1.branch(),
        git2.head(),
        git3.statusPorcelain()
      ]);

      // Verify each used its own context
      expect(mockExecFile).toHaveBeenCalledTimes(3);

      expect(mockExecFile.mock.calls[0][2]).toEqual(expect.objectContaining({
        cwd: '/isolated/repo1',
        env: expect.objectContaining({ ISOLATION_TEST: '1' })
      }));

      expect(mockExecFile.mock.calls[1][2]).toEqual(expect.objectContaining({
        cwd: '/isolated/repo2',
        env: expect.objectContaining({ ISOLATION_TEST: '2' })
      }));

      expect(mockExecFile.mock.calls[2][2]).toEqual(expect.objectContaining({
        cwd: '/isolated/repo3',
        env: expect.objectContaining({ ISOLATION_TEST: '3' })
      }));
    });

    it('should handle context errors gracefully', async () => {
      const errorTypes = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        'String error',
        null,
        undefined,
        42
      ];

      for (const error of errorTypes) {
        vi.resetModules();

        mockUseGitVan = vi.fn(() => {
          throw error;
        });

        mockTryUseGitVan = vi.fn(() => ({
          cwd: '/error-recovery/repo',
          env: { ERROR_RECOVERY: 'true' }
        }));

        vi.doMock('../src/core/context.mjs', () => ({
          useGitVan: mockUseGitVan,
          tryUseGitVan: mockTryUseGitVan,
          bindContext: vi.fn(() => {
            let ctx;
            try {
              ctx = mockUseGitVan?.();
            } catch {
              ctx = mockTryUseGitVan?.();
            }
            const cwd = (ctx && ctx.cwd) || process.cwd();
            const env = {
              ...process.env,
              TZ: "UTC",
              LANG: "C",
              ...(ctx && ctx.env ? ctx.env : {}),
            };
            return { ctx, cwd, env };
          })
        }));

        vi.doMock('node:child_process', () => ({
          execFile: mockExecFile
        }));

        const { useGit } = await import('../src/composables/git.mjs');

        const git = useGit();
        await git.branch();

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-parse', '--abbrev-ref', 'HEAD'],
          expect.objectContaining({
            cwd: '/error-recovery/repo',
            env: expect.objectContaining({
              ERROR_RECOVERY: 'true'
            })
          })
        );
      }
    });
  });

  describe('Environment Variable Handling', () => {
    it('should correctly merge environment variables', async () => {
      const originalEnv = process.env.ORIGINAL_VAR;
      process.env.ORIGINAL_VAR = 'original-value';

      mockUseGitVan = vi.fn(() => ({
        cwd: '/env/test/repo',
        env: {
          CUSTOM_VAR: 'custom-value',
          OVERRIDE_VAR: 'overridden',
          TZ: 'Europe/London' // Should override default UTC
        }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();
      await git.log();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['log', '--pretty=%h%x09%s'],
        expect.objectContaining({
          env: expect.objectContaining({
            TZ: 'Europe/London', // Context override
            LANG: 'C', // Default
            CUSTOM_VAR: 'custom-value', // From context
            OVERRIDE_VAR: 'overridden', // From context
            ORIGINAL_VAR: 'original-value' // From process.env
          })
        })
      );

      // Restore original environment
      if (originalEnv !== undefined) {
        process.env.ORIGINAL_VAR = originalEnv;
      } else {
        delete process.env.ORIGINAL_VAR;
      }
    });

    it('should handle missing or null environment values', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/null-env/repo',
        env: {
          NULL_VAR: null,
          UNDEFINED_VAR: undefined,
          EMPTY_VAR: '',
          ZERO_VAR: 0,
          FALSE_VAR: false
        }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = mockUseGitVan?.();
          } catch {
            ctx = mockTryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();
      await git.branch();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        expect.objectContaining({
          env: expect.objectContaining({
            NULL_VAR: null,
            UNDEFINED_VAR: undefined,
            EMPTY_VAR: '',
            ZERO_VAR: 0,
            FALSE_VAR: false
          })
        })
      );
    });
  });
});