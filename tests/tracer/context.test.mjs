/**
 * GitVan v2 Context Tests
 * Tests unctx context management system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createContext, useContext, runWithContext } from 'unctx';

describe('Context System', () => {
  let tracerContext;
  let jobContext;
  let configContext;

  beforeEach(() => {
    // Create separate contexts for different concerns
    tracerContext = createContext('gitvan:tracer');
    jobContext = createContext('gitvan:job');
    configContext = createContext('gitvan:config');
  });

  afterEach(() => {
    // Clean up contexts
    tracerContext = null;
    jobContext = null;
    configContext = null;
  });

  describe('Tracer Context', () => {
    it('should provide tracer instance across the application', async () => {
      const mockTracer = {
        id: 'tracer-123',
        version: '2.0.0',
        startTime: new Date(),
        isRunning: true,
        hooks: new Map(),
        config: {}
      };

      await runWithContext(tracerContext, mockTracer, () => {
        const tracer = useContext(tracerContext);
        expect(tracer).toBeDefined();
        expect(tracer.id).toBe('tracer-123');
        expect(tracer.version).toBe('2.0.0');
        expect(tracer.isRunning).toBe(true);
      });
    });

    it('should handle nested context access', async () => {
      const parentTracer = {
        id: 'parent-tracer',
        level: 'parent'
      };

      const childTracer = {
        id: 'child-tracer',
        level: 'child',
        parent: 'parent-tracer'
      };

      await runWithContext(tracerContext, parentTracer, async () => {
        const parent = useContext(tracerContext);
        expect(parent.level).toBe('parent');

        await runWithContext(tracerContext, childTracer, () => {
          const child = useContext(tracerContext);
          expect(child.level).toBe('child');
          expect(child.parent).toBe('parent-tracer');
        });

        // Parent context should be restored
        const restoredParent = useContext(tracerContext);
        expect(restoredParent.level).toBe('parent');
      });
    });

    it('should throw when accessing context outside of context scope', () => {
      expect(() => {
        useContext(tracerContext);
      }).toThrow();
    });
  });

  describe('Job Context', () => {
    it('should provide job execution context', async () => {
      const jobCtx = {
        job: {
          meta: {
            id: 'job-123',
            name: 'test-job',
            kind: 'commit'
          }
        },
        cwd: '/test/directory',
        env: { NODE_ENV: 'test' },
        git: {
          branch: 'main',
          commit: 'abc123',
          isDirty: false
        },
        user: {
          name: 'Test User',
          email: 'test@example.com'
        },
        timestamp: new Date(),
        sessionId: 'session-456'
      };

      await runWithContext(jobContext, jobCtx, () => {
        const ctx = useContext(jobContext);
        expect(ctx.job.meta.id).toBe('job-123');
        expect(ctx.cwd).toBe('/test/directory');
        expect(ctx.git.branch).toBe('main');
        expect(ctx.sessionId).toBe('session-456');
      });
    });

    it('should handle job context updates during execution', async () => {
      const initialCtx = {
        job: { meta: { id: 'job-123', name: 'test-job' } },
        status: 'pending',
        progress: 0
      };

      await runWithContext(jobContext, initialCtx, () => {
        const ctx = useContext(jobContext);
        expect(ctx.status).toBe('pending');
        expect(ctx.progress).toBe(0);

        // Simulate job progress update
        ctx.status = 'running';
        ctx.progress = 50;

        const updatedCtx = useContext(jobContext);
        expect(updatedCtx.status).toBe('running');
        expect(updatedCtx.progress).toBe(50);
      });
    });

    it('should support concurrent job contexts', async () => {
      const job1Ctx = {
        job: { meta: { id: 'job-1', name: 'job-one' } },
        status: 'running'
      };

      const job2Ctx = {
        job: { meta: { id: 'job-2', name: 'job-two' } },
        status: 'pending'
      };

      const promises = [
        runWithContext(jobContext, job1Ctx, async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          const ctx = useContext(jobContext);
          expect(ctx.job.meta.id).toBe('job-1');
          expect(ctx.status).toBe('running');
        }),
        runWithContext(jobContext, job2Ctx, async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          const ctx = useContext(jobContext);
          expect(ctx.job.meta.id).toBe('job-2');
          expect(ctx.status).toBe('pending');
        })
      ];

      await Promise.all(promises);
    });
  });

  describe('Config Context', () => {
    it('should provide configuration across the application', async () => {
      const config = {
        version: '2.0',
        tracer: {
          enabled: true,
          outputDir: '.gitvan/receipts'
        },
        jobs: {
          timeout: 30000,
          patterns: ['**/*.job.js']
        },
        logging: {
          level: 'info',
          format: 'text'
        }
      };

      await runWithContext(configContext, config, () => {
        const cfg = useContext(configContext);
        expect(cfg.version).toBe('2.0');
        expect(cfg.tracer.enabled).toBe(true);
        expect(cfg.jobs.timeout).toBe(30000);
        expect(cfg.logging.level).toBe('info');
      });
    });

    it('should handle config updates and reloading', async () => {
      const initialConfig = {
        version: '2.0',
        tracer: { enabled: true },
        logging: { level: 'info' }
      };

      await runWithContext(configContext, initialConfig, () => {
        const config = useContext(configContext);
        expect(config.logging.level).toBe('info');

        // Simulate config reload
        config.logging.level = 'debug';
        config.tracer.enabled = false;

        const updatedConfig = useContext(configContext);
        expect(updatedConfig.logging.level).toBe('debug');
        expect(updatedConfig.tracer.enabled).toBe(false);
      });
    });
  });

  describe('Cross-Context Communication', () => {
    it('should access multiple contexts simultaneously', async () => {
      const tracer = { id: 'tracer-123', version: '2.0.0' };
      const config = { version: '2.0', tracer: { enabled: true } };
      const job = { meta: { id: 'job-456', name: 'test-job' } };

      await runWithContext(tracerContext, tracer, async () => {
        await runWithContext(configContext, config, async () => {
          await runWithContext(jobContext, job, () => {
            const tracerCtx = useContext(tracerContext);
            const configCtx = useContext(configContext);
            const jobCtx = useContext(jobContext);

            expect(tracerCtx.id).toBe('tracer-123');
            expect(configCtx.version).toBe('2.0');
            expect(jobCtx.meta.id).toBe('job-456');

            // Verify context isolation
            expect(tracerCtx.version).toBe('2.0.0');
            expect(configCtx.version).toBe('2.0');
          });
        });
      });
    });

    it('should handle context cleanup on errors', async () => {
      const tracer = { id: 'tracer-123' };

      try {
        await runWithContext(tracerContext, tracer, () => {
          const ctx = useContext(tracerContext);
          expect(ctx.id).toBe('tracer-123');

          throw new Error('Test error');
        });
      } catch (error) {
        expect(error.message).toBe('Test error');
      }

      // Context should be cleaned up after error
      expect(() => {
        useContext(tracerContext);
      }).toThrow();
    });
  });

  describe('Context Utilities', () => {
    it('should provide context existence checking', async () => {
      // Outside of context
      expect(() => useContext(tracerContext, { strict: false })).not.toThrow();
      expect(useContext(tracerContext, { strict: false })).toBeUndefined();

      const tracer = { id: 'tracer-123' };
      await runWithContext(tracerContext, tracer, () => {
        // Inside context
        expect(useContext(tracerContext, { strict: false })).toBeDefined();
        expect(useContext(tracerContext).id).toBe('tracer-123');
      });
    });

    it('should support context composition patterns', async () => {
      const createJobRunner = (jobData) => {
        return runWithContext(jobContext, jobData, () => {
          const job = useContext(jobContext);
          return {
            id: job.meta.id,
            execute: () => {
              const currentJob = useContext(jobContext);
              return `Executed job: ${currentJob.meta.name}`;
            }
          };
        });
      };

      const job1 = { meta: { id: 'job-1', name: 'First Job' } };
      const job2 = { meta: { id: 'job-2', name: 'Second Job' } };

      const runner1 = await createJobRunner(job1);
      const runner2 = await createJobRunner(job2);

      expect(runner1.id).toBe('job-1');
      expect(runner2.id).toBe('job-2');

      await runWithContext(jobContext, job1, () => {
        expect(runner1.execute()).toBe('Executed job: First Job');
      });

      await runWithContext(jobContext, job2, () => {
        expect(runner2.execute()).toBe('Executed job: Second Job');
      });
    });
  });
});