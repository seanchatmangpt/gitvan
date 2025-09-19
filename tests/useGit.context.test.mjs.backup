/**
 * useGit() Context Binding Tests
 * Tests unctx integration and context handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the context module BEFORE importing anything else
vi.mock('../src/core/context.mjs', () => {
  const mockContext = {
    cwd: '/test/repo',
    env: {
      ...process.env,
      TZ: 'UTC',
      LANG: 'C',
      NODE_ENV: 'test',
      PATH: '/usr/local/bin:/usr/bin:/bin'
    }
  };

  return {
    useGitVan: vi.fn(() => mockContext),
    tryUseGitVan: vi.fn(() => mockContext),
    withGitVan: vi.fn((context, fn) => fn()),
    bindContext: vi.fn(() => mockContext) // This was missing!
  };
});

describe('useGit() Context Binding Tests', () => {
  let mockExecFile;
  let mockUseGitVan;
  let mockTryUseGitVan;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock execFile - this must be set up before any module imports
    // Mock as callback-style function (since it gets promisified)
    mockExecFile = vi.fn((cmd, args, opts, callback) => {
      // Simulate async callback
      setImmediate(() => callback(null, { stdout: 'mocked-output\n' }));
    });
    vi.doMock('node:child_process', () => ({
      execFile: mockExecFile
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful Context Binding', () => {
    beforeEach(() => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/context/repo',
        env: {
          CUSTOM_ENV: 'value',
          GIT_CONFIG: '/custom/git/config'
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
    });

    it('should use context cwd and env when available', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // The git object doesn't expose cwd/env directly, but we can test by calling operations
      await git.branch();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        {
          cwd: '/context/repo',
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config'
          }),
          maxBuffer: 12 * 1024 * 1024
        },
        expect.any(Function)
      );
    });

    it('should call useGitVan first for strict context', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      useGit();

      expect(mockUseGitVan).toHaveBeenCalledTimes(1);
      expect(mockTryUseGitVan).not.toHaveBeenCalled();
    });

    it('should preserve context across multiple operations', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      await git.branch();
      await git.head();
      await git.statusPorcelain();

      // All calls should use the same context
      expect(mockExecFile).toHaveBeenCalledTimes(3);
      mockExecFile.mock.calls.forEach(call => {
        expect(call[2].cwd).toBe('/context/repo');
        expect(call[2].env).toEqual(expect.objectContaining({
          CUSTOM_ENV: 'value',
          GIT_CONFIG: '/custom/git/config'
        }));
      });
    });
  });

  describe('Context Fallback Scenarios', () => {
    it('should fallback to tryUseGitVan when useGitVan throws', async () => {
      mockUseGitVan = vi.fn(() => {
        throw new Error('No active context');
      });

      mockTryUseGitVan = vi.fn(() => ({
        cwd: '/fallback/repo',
        env: { FALLBACK_VAR: 'true' }
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          // Simulate real bindContext behavior
          let ctx;
          try {
            ctx = mockUseGitVan();
          } catch {
            ctx = mockTryUseGitVan();
          }
          return {
            cwd: ctx?.cwd || process.cwd(),
            env: {
              TZ: 'UTC',
              LANG: 'C',
              ...(ctx?.env || {})
            }
          };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();
      await git.branch();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        {
          cwd: '/fallback/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            FALLBACK_VAR: 'true'
          },
          maxBuffer: 12 * 1024 * 1024
        },
        expect.any(Function)
      );

      expect(mockUseGitVan).toHaveBeenCalledTimes(1);
      expect(mockTryUseGitVan).toHaveBeenCalledTimes(1);
    });

    it('should use process.cwd() when no context available', async () => {
      mockUseGitVan = vi.fn(() => {
        throw new Error('No active context');
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

      const git = useGit();
      await git.branch();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        expect.objectContaining({
          cwd: process.cwd(),
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        }),
        expect.any(Function)
      );
    });

    it('should handle context without cwd', async () => {
      mockUseGitVan = vi.fn(() => ({
        env: { CONTEXT_VAR: 'no-cwd' }
        // No cwd property
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

      expect(git.cwd).toBe(process.cwd());
      expect(git.env).toEqual(expect.objectContaining({
        CONTEXT_VAR: 'no-cwd'
      }));
    });

    it('should handle context without env', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/no-env/repo'
        // No env property
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

      expect(git.cwd).toBe('/no-env/repo');
      expect(git.env).toEqual(expect.objectContaining({
        TZ: 'UTC',
        LANG: 'C'
      }));
    });

    it('should handle empty context object', async () => {
      mockUseGitVan = vi.fn(() => ({}));
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

      expect(git.cwd).toBe(process.cwd());
      expect(git.env).toEqual(expect.objectContaining({
        TZ: 'UTC',
        LANG: 'C'
      }));
    });
  });

  describe('Context Function Availability', () => {
    it('should handle missing useGitVan function', async () => {
      mockTryUseGitVan = vi.fn(() => ({
        cwd: '/try-only/repo',
        env: { TRY_ONLY: 'true' }
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        // useGitVan: undefined,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => {
          const ctx = mockTryUseGitVan();
          return {
            cwd: ctx?.cwd || process.cwd(),
            env: {
              TZ: 'UTC',
              LANG: 'C',
              ...process.env,
              ...(ctx?.env || {})
            }
          };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      expect(git.cwd).toBe('/try-only/repo');
      expect(git.env).toEqual(expect.objectContaining({
        TRY_ONLY: 'true'
      }));
    });

    it('should handle missing tryUseGitVan function', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/use-only/repo',
        env: { USE_ONLY: 'true' }
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        // tryUseGitVan: undefined
        bindContext: vi.fn(() => {
          const ctx = mockUseGitVan();
          return {
            cwd: ctx?.cwd || process.cwd(),
            env: {
              TZ: 'UTC',
              LANG: 'C',
              ...process.env,
              ...(ctx?.env || {})
            }
          };
        })
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      expect(git.cwd).toBe('/use-only/repo');
      expect(git.env).toEqual(expect.objectContaining({
        USE_ONLY: 'true'
      }));
    });

    it('should handle missing context module', async () => {
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

      expect(git.cwd).toBe(process.cwd());
      expect(git.env).toEqual(expect.objectContaining({
        TZ: 'UTC',
        LANG: 'C'
      }));
    });
  });

  describe('Environment Variable Handling', () => {
    it('should override process.env with context env', async () => {
      const originalPath = process.env.PATH;

      mockUseGitVan = vi.fn(() => ({
        cwd: '/override/repo',
        env: {
          PATH: '/custom/bin:/override/path',
          CUSTOM_VAR: 'custom-value',
          HOME: '/custom/home'
        }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      expect(git.env.PATH).toBe('/custom/bin:/override/path');
      expect(git.env.CUSTOM_VAR).toBe('custom-value');
      expect(git.env.HOME).toBe('/custom/home');
      expect(git.env.TZ).toBe('UTC');
      expect(git.env.LANG).toBe('C');

      // Original process.env should still have the original value
      expect(process.env.PATH).toBe(originalPath);
    });

    it('should preserve TZ and LANG overrides', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/tz-override/repo',
        env: {
          TZ: 'America/New_York',
          LANG: 'en_US.UTF-8'
        }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Context env should override the defaults
      expect(git.env.TZ).toBe('America/New_York');
      expect(git.env.LANG).toBe('en_US.UTF-8');
    });

    it('should handle null and undefined env values', async () => {
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
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      expect(git.env.NULL_VAR).toBe(null);
      expect(git.env.UNDEFINED_VAR).toBe(undefined);
      expect(git.env.EMPTY_VAR).toBe('');
      expect(git.env.ZERO_VAR).toBe(0);
      expect(git.env.FALSE_VAR).toBe(false);
    });
  });

  describe('Context Isolation', () => {
    it('should not modify original context object', async () => {
      const originalContext = {
        cwd: '/original/repo',
        env: { ORIGINAL: 'value' }
      };

      mockUseGitVan = vi.fn(() => originalContext);
      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Git should have extended env, but original should be unchanged
      expect(git.env).toEqual(expect.objectContaining({
        TZ: 'UTC',
        LANG: 'C',
        ORIGINAL: 'value'
      }));

      expect(originalContext.env).toEqual({ ORIGINAL: 'value' });
    });

    it('should create independent git instances', async () => {
      let callCount = 0;

      mockUseGitVan = vi.fn(() => {
        callCount++;
        return {
          cwd: `/instance-${callCount}/repo`,
          env: { INSTANCE: callCount.toString() }
        };
      });

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git1 = useGit();
      const git2 = useGit();

      expect(git1.cwd).toBe('/instance-1/repo');
      expect(git2.cwd).toBe('/instance-2/repo');

      expect(git1.env.INSTANCE).toBe('1');
      expect(git2.env.INSTANCE).toBe('2');

      expect(mockUseGitVan).toHaveBeenCalledTimes(2);
    });
  });

  describe('Context Error Handling', () => {
    it('should handle context function throwing different error types', async () => {
      const testErrors = [
        new Error('Generic error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        'String error',
        null,
        undefined,
        42
      ];

      for (const error of testErrors) {
        vi.resetModules();

        mockUseGitVan = vi.fn(() => {
          throw error;
        });

        mockTryUseGitVan = vi.fn(() => ({
          cwd: '/error-fallback/repo',
          env: { ERROR_FALLBACK: 'true' }
        }));

        vi.doMock('../src/core/context.mjs', () => ({
          useGitVan: mockUseGitVan,
          tryUseGitVan: mockTryUseGitVan,
          bindContext: vi.fn(() => {
            let ctx;
            try {
              ctx = mockUseGitVan();
            } catch {
              ctx = mockTryUseGitVan();
            }
            return {
              cwd: ctx?.cwd || process.cwd(),
              env: {
                TZ: 'UTC',
                LANG: 'C',
                ...process.env,
                ...(ctx?.env || {})
              }
            };
          })
        }));

        vi.doMock('node:child_process', () => ({
          execFile: mockExecFile
        }));

        const { useGit } = await import('../src/composables/git.mjs');

        const git = useGit();

        expect(git.cwd).toBe('/error-fallback/repo');
        expect(git.env).toEqual(expect.objectContaining({
          ERROR_FALLBACK: 'true'
        }));
      }
    });

    it('should handle tryUseGitVan throwing error', async () => {
      mockUseGitVan = vi.fn(() => {
        throw new Error('useGitVan failed');
      });

      mockTryUseGitVan = vi.fn(() => {
        throw new Error('tryUseGitVan also failed');
      });

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Should fallback to process.cwd and process.env
      expect(git.cwd).toBe(process.cwd());
      expect(git.env).toEqual({
        TZ: 'UTC',
        LANG: 'C',
        ...process.env
      });
    });
  });

  describe('Context Binding with Real Operations', () => {
    it('should pass context correctly to git operations', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/real-ops/repo',
        env: {
          GIT_AUTHOR_NAME: 'Context Author',
          GIT_AUTHOR_EMAIL: 'context@example.com',
          CUSTOM_GIT_VAR: 'custom-value'
        }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Test multiple operations
      await git.branch();
      await git.head();
      await git.add('test.txt');
      await git.commit('Test commit');
      await git.log('%h %s');

      // Verify all operations used the correct context
      expect(mockExecFile).toHaveBeenCalledTimes(5);

      mockExecFile.mock.calls.forEach(call => {
        expect(call[2]).toEqual({
          cwd: '/real-ops/repo',
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C',
            GIT_AUTHOR_NAME: 'Context Author',
            GIT_AUTHOR_EMAIL: 'context@example.com',
            CUSTOM_GIT_VAR: 'custom-value'
          }),
          maxBuffer: 12 * 1024 * 1024
        });
      });
    });

    it('should handle context changes between operations', async () => {
      let contextSwitched = false;

      mockUseGitVan = vi.fn(() => {
        if (contextSwitched) {
          return {
            cwd: '/switched/repo',
            env: { CONTEXT: 'switched' }
          };
        }
        return {
          cwd: '/original/repo',
          env: { CONTEXT: 'original' }
        };
      });

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      // First git instance
      const git1 = useGit();
      await git1.branch();

      // Switch context
      contextSwitched = true;

      // Second git instance should get new context
      const git2 = useGit();
      await git2.branch();

      // Verify different contexts were used
      expect(mockExecFile).toHaveBeenCalledTimes(2);

      expect(mockExecFile.mock.calls[0][2].cwd).toBe('/original/repo');
      expect(mockExecFile.mock.calls[0][2].env.CONTEXT).toBe('original');

      expect(mockExecFile.mock.calls[1][2].cwd).toBe('/switched/repo');
      expect(mockExecFile.mock.calls[1][2].env.CONTEXT).toBe('switched');
    });
  });

  describe('withGitVan Wrapper Tests', () => {
    let mockWithGitVan;

    beforeEach(() => {
      mockWithGitVan = vi.fn((ctx, fn) => {
        // Mock withGitVan to simulate context wrapping
        const originalUseGitVan = mockUseGitVan;
        mockUseGitVan = vi.fn(() => ctx);
        try {
          return fn();
        } finally {
          mockUseGitVan = originalUseGitVan;
        }
      });

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        withGitVan: mockWithGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));
    });

    it('should provide context through withGitVan wrapper', async () => {
      const { withGitVan } = await import('../src/core/context.mjs');
      const { useGit } = await import('../src/composables/git.mjs');

      const testContext = {
        cwd: '/wrapper/repo',
        env: { WRAPPER_TEST: 'true' }
      };

      const result = withGitVan(testContext, async () => {
        const git = useGit();
        await git.branch();
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockWithGitVan).toHaveBeenCalledWith(testContext, expect.any(Function));
    });

    it('should handle async operations within withGitVan', async () => {
      const { withGitVan, useGit } = await import('../src/composables/git.mjs');

      const testContext = {
        cwd: '/async/repo',
        env: { ASYNC_TEST: 'true' }
      };

      const result = await withGitVan(testContext, async () => {
        const git = useGit();

        // Simulate async git operations
        await git.branch();
        await new Promise(resolve => setTimeout(resolve, 10));
        await git.head();

        return git.cwd;
      });

      expect(result).toBe('/async/repo');
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });

    it('should maintain context isolation in withGitVan', async () => {
      const { withGitVan, useGit } = await import('../src/composables/git.mjs');

      const context1 = { cwd: '/context1', env: { CTX: '1' } };
      const context2 = { cwd: '/context2', env: { CTX: '2' } };

      const results = await Promise.all([
        withGitVan(context1, async () => {
          const git = useGit();
          await new Promise(resolve => setTimeout(resolve, 20));
          return git.cwd;
        }),
        withGitVan(context2, async () => {
          const git = useGit();
          await new Promise(resolve => setTimeout(resolve, 10));
          return git.cwd;
        })
      ]);

      expect(results).toEqual(['/context1', '/context2']);
    });

    it('should handle nested withGitVan calls', async () => {
      const { withGitVan, useGit } = await import('../src/composables/git.mjs');

      const outerContext = { cwd: '/outer', env: { LEVEL: 'outer' } };
      const innerContext = { cwd: '/inner', env: { LEVEL: 'inner' } };

      const result = withGitVan(outerContext, () => {
        const outerGit = useGit();
        expect(outerGit.cwd).toBe('/outer');
        expect(outerGit.env.LEVEL).toBe('outer');

        return withGitVan(innerContext, () => {
          const innerGit = useGit();
          expect(innerGit.cwd).toBe('/inner');
          expect(innerGit.env.LEVEL).toBe('inner');
          return 'nested-success';
        });
      });

      expect(result).toBe('nested-success');
    });

    it('should restore context after withGitVan execution', async () => {
      // Set up initial context
      mockUseGitVan = vi.fn(() => ({
        cwd: '/original',
        env: { ORIGINAL: 'true' }
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        withGitVan: mockWithGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { withGitVan, useGit } = await import('../src/composables/git.mjs');

      // Check original context
      const originalGit = useGit();
      expect(originalGit.cwd).toBe('/original');

      // Execute with different context
      const tempContext = { cwd: '/temporary', env: { TEMP: 'true' } };
      withGitVan(tempContext, () => {
        const tempGit = useGit();
        expect(tempGit.cwd).toBe('/temporary');
      });

      // Context should be restored
      const restoredGit = useGit();
      expect(restoredGit.cwd).toBe('/original');
    });
  });

  describe('Async Context Preservation', () => {
    it('should preserve context across async/await operations', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/async-preserve/repo',
        env: { ASYNC_ID: 'test-123' }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Context should be preserved across async operations
      await git.branch();
      await new Promise(resolve => setTimeout(resolve, 50));
      await git.head();
      await new Promise(resolve => setTimeout(resolve, 20));
      await git.statusPorcelain();

      // All operations should use the same context
      expect(mockExecFile).toHaveBeenCalledTimes(3);
      mockExecFile.mock.calls.forEach(call => {
        expect(call[2].cwd).toBe('/async-preserve/repo');
        expect(call[2].env.ASYNC_ID).toBe('test-123');
      });
    });

    it('should preserve context in Promise.all operations', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/parallel/repo',
        env: { PARALLEL_ID: 'test-456' }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Execute multiple git operations in parallel
      await Promise.all([
        git.branch(),
        git.head(),
        git.statusPorcelain()
      ]);

      // All operations should use the same context
      expect(mockExecFile).toHaveBeenCalledTimes(3);
      mockExecFile.mock.calls.forEach(call => {
        expect(call[2].cwd).toBe('/parallel/repo');
        expect(call[2].env.PARALLEL_ID).toBe('test-456');
      });
    });

    it('should handle context in deeply nested async operations', async () => {
      mockUseGitVan = vi.fn(() => ({
        cwd: '/deep-nested/repo',
        env: { NESTED_LEVEL: 'deep' }
      }));

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      const performDeepOperation = async () => {
        const git = useGit();
        await git.branch();

        await new Promise(resolve => setTimeout(resolve, 10));

        const nestedOperation = async () => {
          await git.head();
          await new Promise(resolve => setTimeout(resolve, 5));
          return git.statusPorcelain();
        };

        return await nestedOperation();
      };

      await performDeepOperation();

      // All nested operations should use the same context
      expect(mockExecFile).toHaveBeenCalledTimes(3);
      mockExecFile.mock.calls.forEach(call => {
        expect(call[2].cwd).toBe('/deep-nested/repo');
        expect(call[2].env.NESTED_LEVEL).toBe('deep');
      });
    });
  });

  describe('Context Memory Management', () => {
    it('should not leak context between separate useGit instances', async () => {
      let instanceCounter = 0;

      mockUseGitVan = vi.fn(() => {
        instanceCounter++;
        return {
          cwd: `/instance-${instanceCounter}`,
          env: { INSTANCE_ID: instanceCounter.toString() }
        };
      });

      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      // Create multiple instances
      const git1 = useGit();
      const git2 = useGit();
      const git3 = useGit();

      // Each should have its own context
      expect(git1.cwd).toBe('/instance-1');
      expect(git2.cwd).toBe('/instance-2');
      expect(git3.cwd).toBe('/instance-3');

      expect(git1.env.INSTANCE_ID).toBe('1');
      expect(git2.env.INSTANCE_ID).toBe('2');
      expect(git3.env.INSTANCE_ID).toBe('3');

      // Operations should maintain separate contexts
      await Promise.all([
        git1.branch(),
        git2.head(),
        git3.statusPorcelain()
      ]);

      expect(mockExecFile.mock.calls[0][2].cwd).toBe('/instance-1');
      expect(mockExecFile.mock.calls[1][2].cwd).toBe('/instance-2');
      expect(mockExecFile.mock.calls[2][2].cwd).toBe('/instance-3');
    });

    it('should handle concurrent context operations without interference', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        cwd: `/concurrent-${i}`,
        env: { CONCURRENT_ID: i.toString() }
      }));

      let contextIndex = 0;
      mockUseGitVan = vi.fn(() => contexts[contextIndex++]);
      mockTryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: mockUseGitVan,
        tryUseGitVan: mockTryUseGitVan,
        bindContext: vi.fn(() => ({
          cwd: '/context/repo',
          env: {
            TZ: 'UTC',
            LANG: 'C',
            CUSTOM_ENV: 'value',
            GIT_CONFIG: '/custom/git/config',
          }
        }))
      }));

      const { useGit } = await import('../src/composables/git.mjs');

      // Create multiple concurrent git operations
      const operations = contexts.map(async (_, index) => {
        const git = useGit();
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return git.cwd;
      });

      const results = await Promise.all(operations);

      // Each operation should maintain its own context
      results.forEach((result, index) => {
        expect(result).toBe(`/concurrent-${index}`);
      });
    });
  });
});