/**
 * London TDD Test Suite: JTBD (Jobs-To-Be-Done) Hooks
 * Tests job automation, hook orchestration, and workflow triggers
 *
 * London School TDD Approach:
 * - Mock job registry, hook loader, and workflow engine
 * - Test job execution and hook lifecycle
 * - Focus on automation patterns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('JTBD Hooks - London TDD Suite', () => {
  let mockLogger;
  let mockJobRegistry;
  let mockHookOrchestrator;
  let mockGitVanHookable;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    mockJobRegistry = {
      register: vi.fn(),
      getJob: vi.fn(),
      getJobsForHook: vi.fn().mockReturnValue([]),
      getAllJobs: vi.fn().mockReturnValue([]),
    };

    mockHookOrchestrator = {
      evaluate: vi.fn().mockResolvedValue({
        hooksTriggered: 0,
        hooksEvaluated: 0,
      }),
    };

    mockGitVanHookable = {
      callHook: vi.fn().mockResolvedValue({ processed: 0 }),
      registerGitSignalHooks: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Definition', () => {
    it('should define job with metadata and hooks', () => {
      // Arrange
      const defineJob = createDefineJob();

      // Act
      const job = defineJob({
        meta: {
          name: 'build-project',
          desc: 'Build and test project',
          tags: ['build', 'ci'],
        },
        hooks: ['post-commit', 'post-merge'],
        run: async (context) => {
          return { success: true };
        },
      });

      // Assert
      expect(job.meta.name).toBe('build-project');
      expect(job.hooks).toEqual(['post-commit', 'post-merge']);
      expect(job.run).toBeDefined();
    });

    it('should validate required job fields', () => {
      // Arrange
      const defineJob = createDefineJob();

      // Act & Assert
      expect(() => defineJob({ hooks: [] })).toThrow('must have meta.name');
    });

    it('should execute job with context', async () => {
      // Arrange
      const defineJob = createDefineJob();
      const runFn = vi.fn().mockResolvedValue({ success: true });
      const job = defineJob({
        meta: { name: 'test-job' },
        hooks: ['post-commit'],
        run: runFn,
      });

      // Act
      const result = await job.run({ cwd: '/test' });

      // Assert
      expect(result.success).toBe(true);
      expect(runFn).toHaveBeenCalledWith({ cwd: '/test' });
    });

    it('should handle job execution failures', async () => {
      // Arrange
      const defineJob = createDefineJob();
      const job = defineJob({
        meta: { name: 'failing-job' },
        hooks: ['post-commit'],
        run: async () => {
          throw new Error('Job failed');
        },
      });

      // Act & Assert
      await expect(job.run({})).rejects.toThrow('Job failed');
    });

    it('should track job execution time', async () => {
      // Arrange
      const defineJob = createDefineJob();
      const job = defineJob({
        meta: { name: 'timed-job' },
        hooks: ['post-commit'],
        run: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { success: true };
        },
      });

      // Act
      const start = Date.now();
      await job.run({});
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('JobRegistry', () => {
    it('should register job with hooks', () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const job = {
        meta: { name: 'test-job' },
        hooks: ['post-commit', 'pre-push'],
        run: async () => {},
      };

      // Act
      registry.register(job);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Registered job')
      );
    });

    it('should retrieve jobs for specific hook', () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const job1 = {
        meta: { name: 'build' },
        hooks: ['post-commit'],
        run: async () => {},
      };
      const job2 = {
        meta: { name: 'deploy' },
        hooks: ['post-commit', 'pre-push'],
        run: async () => {},
      };

      registry.register(job1);
      registry.register(job2);

      // Act
      const postCommitJobs = registry.getJobsForHook('post-commit');

      // Assert
      expect(postCommitJobs).toHaveLength(2);
      expect(postCommitJobs.map((j) => j.meta.name)).toContain('build');
      expect(postCommitJobs.map((j) => j.meta.name)).toContain('deploy');
    });

    it('should handle jobs without hooks', () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const job = {
        meta: { name: 'manual-job' },
        run: async () => {},
      };

      // Act
      registry.register(job);
      const jobs = registry.getAllJobs();

      // Assert
      expect(jobs).toHaveLength(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('no hooks defined')
      );
    });

    it('should get job by name', () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const job = {
        meta: { name: 'specific-job' },
        hooks: ['post-commit'],
        run: async () => {},
      };
      registry.register(job);

      // Act
      const retrieved = registry.getJob('specific-job');

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved.meta.name).toBe('specific-job');
    });

    it('should return empty array for hooks with no jobs', () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);

      // Act
      const jobs = registry.getJobsForHook('nonexistent-hook');

      // Assert
      expect(jobs).toEqual([]);
    });
  });

  describe('GitVan Hookable System', () => {
    it('should process Git signal and trigger Knowledge Hook evaluation', async () => {
      // Arrange
      const hookable = createGitVanHookable(mockHookOrchestrator, mockLogger);
      const context = {
        cwd: '/test/repo',
        changedFiles: ['src/index.js', 'tests/test.js'],
      };

      mockHookOrchestrator.evaluate.mockResolvedValue({
        hooksTriggered: 2,
        hooksEvaluated: 5,
        workflowsExecuted: 2,
      });

      // Act
      const result = await hookable.processGitSignal('post-commit', context);

      // Assert
      expect(result.processed).toBe(2);
      expect(result.knowledgeHooksTriggered).toBe(2);
      expect(mockHookOrchestrator.evaluate).toHaveBeenCalled();
    });

    it('should register Git signal hooks', () => {
      // Arrange
      const hookable = createGitVanHookable(mockHookOrchestrator, mockLogger);

      // Act
      hookable.registerGitSignalHooks();

      // Assert
      expect(hookable.hooks.size).toBeGreaterThan(0);
    });

    it('should extract Git context for signal type', async () => {
      // Arrange
      const hookable = createGitVanHookable(mockHookOrchestrator, mockLogger);
      const mockGit = {
        currentBranch: vi.fn().mockResolvedValue('main'),
        headSha: vi.fn().mockResolvedValue('abc123'),
        diff: vi.fn().mockResolvedValue('file1.js\nfile2.js'),
      };

      // Act
      const context = await hookable.extractGitContext('post-commit', {}, mockGit);

      // Assert
      expect(context.branch).toBe('main');
      expect(context.commitSha).toBe('abc123');
      expect(context.changedFiles).toHaveLength(2);
    });

    it('should cache changes for Knowledge Hook context', () => {
      // Arrange
      const hookable = createGitVanHookable(mockHookOrchestrator, mockLogger);

      // Act
      hookable.cacheChanges(['file1.js', 'file2.js'], 'post-commit');
      const cache = hookable.getChangeCache();

      // Assert
      expect(cache.changes.length).toBeGreaterThan(0);
      expect(cache.summary.totalChanges).toBeGreaterThan(0);
    });

    it('should handle no changes gracefully', async () => {
      // Arrange
      const hookable = createGitVanHookable(mockHookOrchestrator, mockLogger);
      const context = { cwd: '/test/repo', changedFiles: [] };

      // Act
      const result = await hookable.processGitSignal('post-commit', context);

      // Assert
      expect(result.processed).toBe(0);
      expect(result.knowledgeHooksTriggered).toBe(0);
    });

    it('should call hook and return result', async () => {
      // Arrange
      const hookable = createGitVanHookable(mockHookOrchestrator, mockLogger);
      hookable.hooks.set('test-hook', [vi.fn().mockResolvedValue({ success: true })]);

      // Act
      const result = await hookable.callHook('test-hook', { data: 'test' });

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('Hook-Job Integration', () => {
    it('should trigger jobs when Git hook fires', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const hookable = createGitVanHookable(mockHookOrchestrator, mockLogger);

      const buildJob = vi.fn().mockResolvedValue({ success: true });
      const testJob = vi.fn().mockResolvedValue({ success: true });

      registry.register({
        meta: { name: 'build' },
        hooks: ['post-commit'],
        run: buildJob,
      });

      registry.register({
        meta: { name: 'test' },
        hooks: ['post-commit'],
        run: testJob,
      });

      // Act
      const jobs = registry.getJobsForHook('post-commit');
      for (const job of jobs) {
        await job.run({ cwd: '/test' });
      }

      // Assert
      expect(buildJob).toHaveBeenCalled();
      expect(testJob).toHaveBeenCalled();
    });

    it('should execute jobs in priority order', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const executionOrder = [];

      registry.register({
        meta: { name: 'low-priority', priority: 3 },
        hooks: ['post-commit'],
        run: async () => executionOrder.push('low'),
      });

      registry.register({
        meta: { name: 'high-priority', priority: 1 },
        hooks: ['post-commit'],
        run: async () => executionOrder.push('high'),
      });

      // Act
      const jobs = registry.getJobsForHook('post-commit');
      const sorted = jobs.sort((a, b) => (a.meta.priority || 0) - (b.meta.priority || 0));

      for (const job of sorted) {
        await job.run({});
      }

      // Assert
      expect(executionOrder).toEqual(['high', 'low']);
    });

    it('should continue executing jobs when one fails', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const successJob = vi.fn().mockResolvedValue({ success: true });

      registry.register({
        meta: { name: 'failing' },
        hooks: ['post-commit'],
        run: async () => {
          throw new Error('Job failed');
        },
      });

      registry.register({
        meta: { name: 'success' },
        hooks: ['post-commit'],
        run: successJob,
      });

      // Act
      const jobs = registry.getJobsForHook('post-commit');
      const results = [];

      for (const job of jobs) {
        try {
          const result = await job.run({});
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
      expect(successJob).toHaveBeenCalled();
    });

    it('should pass Git context to jobs', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const contextCapture = vi.fn().mockResolvedValue({ success: true });

      registry.register({
        meta: { name: 'context-aware' },
        hooks: ['post-commit'],
        run: contextCapture,
      });

      // Act
      const jobs = registry.getJobsForHook('post-commit');
      const gitContext = {
        cwd: '/test/repo',
        branch: 'main',
        commit: 'abc123',
        changedFiles: ['src/index.js'],
      };

      for (const job of jobs) {
        await job.run(gitContext);
      }

      // Assert
      expect(contextCapture).toHaveBeenCalledWith(gitContext);
    });

    it('should support conditional job execution', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const conditionalJob = vi.fn().mockResolvedValue({ success: true });

      registry.register({
        meta: { name: 'conditional', condition: (context) => context.branch === 'main' },
        hooks: ['post-commit'],
        run: conditionalJob,
      });

      // Act
      const jobs = registry.getJobsForHook('post-commit');
      const mainContext = { branch: 'main' };
      const featureContext = { branch: 'feature' };

      for (const job of jobs) {
        if (!job.meta.condition || job.meta.condition(mainContext)) {
          await job.run(mainContext);
        }
      }

      for (const job of jobs) {
        if (!job.meta.condition || job.meta.condition(featureContext)) {
          await job.run(featureContext);
        }
      }

      // Assert
      expect(conditionalJob).toHaveBeenCalledTimes(1); // Only for main branch
    });
  });

  describe('JTBD Automation Patterns', () => {
    it('should automate CI/CD pipeline on push', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const steps = [];

      registry.register({
        meta: { name: 'lint' },
        hooks: ['pre-push'],
        run: async () => steps.push('lint'),
      });

      registry.register({
        meta: { name: 'test' },
        hooks: ['pre-push'],
        run: async () => steps.push('test'),
      });

      registry.register({
        meta: { name: 'build' },
        hooks: ['pre-push'],
        run: async () => steps.push('build'),
      });

      // Act
      const jobs = registry.getJobsForHook('pre-push');
      for (const job of jobs) {
        await job.run({});
      }

      // Assert
      expect(steps).toContain('lint');
      expect(steps).toContain('test');
      expect(steps).toContain('build');
    });

    it('should trigger documentation generation on commit', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      const docsGenerated = vi.fn();

      registry.register({
        meta: { name: 'generate-docs' },
        hooks: ['post-commit'],
        run: docsGenerated,
      });

      // Act
      const jobs = registry.getJobsForHook('post-commit');
      for (const job of jobs) {
        await job.run({ changedFiles: ['src/api.ts'] });
      }

      // Assert
      expect(docsGenerated).toHaveBeenCalled();
    });

    it('should enforce code quality checks pre-commit', async () => {
      // Arrange
      const registry = createJobRegistry(mockLogger);
      let qualityPassed = false;

      registry.register({
        meta: { name: 'quality-check' },
        hooks: ['pre-commit'],
        run: async () => {
          qualityPassed = true;
          return { success: true };
        },
      });

      // Act
      const jobs = registry.getJobsForHook('pre-commit');
      for (const job of jobs) {
        await job.run({});
      }

      // Assert
      expect(qualityPassed).toBe(true);
    });
  });
});

// Mock factories
function createDefineJob() {
  return function defineJob(config) {
    const { meta, hooks = [], run } = config;

    if (!meta || !meta.name) {
      throw new Error('Job must have meta.name defined');
    }

    return {
      meta: {
        name: meta.name,
        desc: meta.desc || '',
        tags: meta.tags || [],
        version: meta.version || '1.0.0',
        priority: meta.priority || 0,
        condition: meta.condition,
      },
      hooks,
      run: async (context) => {
        const startTime = Date.now();

        try {
          const result = await run(context);
          const duration = Date.now() - startTime;
          console.log(`✅ Job ${meta.name} completed in ${duration}ms`);
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`❌ Job ${meta.name} failed after ${duration}ms:`, error.message);
          throw error;
        }
      },
    };
  };
}

function createJobRegistry(logger) {
  const jobs = new Map();
  const hookJobs = new Map();

  return {
    register(job) {
      jobs.set(job.meta.name, job);

      if (job.hooks && Array.isArray(job.hooks)) {
        for (const hookName of job.hooks) {
          if (!hookJobs.has(hookName)) {
            hookJobs.set(hookName, []);
          }
          hookJobs.get(hookName).push(job.meta.name);
        }
        logger.info(`📝 Registered job: ${job.meta.name} (hooks: ${job.hooks.join(', ')})`);
      } else {
        logger.info(`📝 Registered job: ${job.meta.name} (no hooks defined)`);
      }
    },

    getJobsForHook(hookName) {
      const jobNames = hookJobs.get(hookName) || [];
      return jobNames.map((name) => jobs.get(name)).filter(Boolean);
    },

    getAllJobs() {
      return Array.from(jobs.values());
    },

    getJob(name) {
      return jobs.get(name);
    },
  };
}

function createGitVanHookable(orchestrator, logger) {
  const changeCache = new Map();
  const hooks = new Map();

  return {
    hooks,
    orchestrator,
    logger,

    registerGitSignalHooks() {
      const hookNames = ['pre-commit', 'post-commit', 'pre-push', 'post-merge', 'post-checkout'];
      for (const hookName of hookNames) {
        hooks.set(hookName, []);
      }
    },

    async processGitSignal(signalType, context) {
      logger.info(`🔍 GitVan: Processing Git signal '${signalType}'`);

      const changedFiles = context.changedFiles || [];

      if (changedFiles.length === 0) {
        logger.info('✅ No changes to process');
        return { processed: 0, changes: [], knowledgeHooksTriggered: 0 };
      }

      this.cacheChanges(changedFiles, signalType);

      const evaluationResult = await orchestrator.evaluate({
        gitSignal: signalType,
        gitContext: context,
        verbose: true,
      });

      logger.info(`🧠 Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`);
      logger.info(`⚡ Knowledge Hooks triggered: ${evaluationResult.hooksTriggered}`);

      return {
        processed: changedFiles.length,
        changes: changedFiles,
        knowledgeHooksTriggered: evaluationResult.hooksTriggered,
        evaluationResult,
      };
    },

    async extractGitContext(signalType, context, git) {
      const gitContext = {
        signalType,
        branch: await git.currentBranch(),
        commitSha: null,
        changedFiles: [],
        timestamp: Date.now(),
      };

      if (signalType === 'post-commit') {
        gitContext.commitSha = await git.headSha();
        const diff = await git.diff({ from: 'HEAD~1', to: 'HEAD', nameOnly: true });
        gitContext.changedFiles = diff.split('\n').filter((f) => f.trim());
      }

      return gitContext;
    },

    cacheChanges(changedFiles, signalType) {
      for (const file of changedFiles) {
        const changeKey = `${signalType}:${file}:${Date.now()}`;
        changeCache.set(changeKey, {
          file,
          signalType,
          timestamp: Date.now(),
        });
      }
    },

    getChangeCache() {
      return {
        changes: Array.from(changeCache.values()),
        summary: {
          totalChanges: changeCache.size,
        },
      };
    },

    async callHook(hookName, context = {}) {
      const handlers = hooks.get(hookName) || [];
      const results = [];

      for (const handler of handlers) {
        const result = await handler(context);
        results.push(result);
      }

      return results;
    },
  };
}
