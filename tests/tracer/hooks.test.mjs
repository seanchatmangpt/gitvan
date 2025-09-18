/**
 * GitVan v2 Hooks Tests
 * Tests hookable hook system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHooks } from 'hookable';

describe('Hooks System', () => {
  let hooks;
  let mockJob;
  let mockContext;

  beforeEach(() => {
    hooks = createHooks();

    mockJob = {
      meta: {
        id: 'test-job-123',
        name: 'Test Job',
        kind: 'commit',
        description: 'A test job for validation'
      },
      ctx: {
        cwd: '/test/directory',
        git: {
          branch: 'main',
          commit: 'abc123',
          isDirty: false
        }
      }
    };

    mockContext = {
      sessionId: 'session-456',
      timestamp: new Date(),
      user: {
        name: 'Test User',
        email: 'test@example.com'
      }
    };
  });

  afterEach(() => {
    hooks.removeAllHooks();
  });

  describe('Tracer Lifecycle Hooks', () => {
    it('should call tracer:init hook during initialization', async () => {
      const initSpy = vi.fn();
      hooks.hook('tracer:init', initSpy);

      await hooks.callHook('tracer:init');

      expect(initSpy).toHaveBeenCalledOnce();
    });

    it('should call tracer:ready hook when tracer is ready', async () => {
      const readySpy = vi.fn();
      hooks.hook('tracer:ready', readySpy);

      await hooks.callHook('tracer:ready');

      expect(readySpy).toHaveBeenCalledOnce();
    });

    it('should call tracer:shutdown hook during shutdown', async () => {
      const shutdownSpy = vi.fn();
      hooks.hook('tracer:shutdown', shutdownSpy);

      await hooks.callHook('tracer:shutdown');

      expect(shutdownSpy).toHaveBeenCalledOnce();
    });

    it('should execute lifecycle hooks in order', async () => {
      const callOrder = [];

      hooks.hook('tracer:init', () => callOrder.push('init'));
      hooks.hook('tracer:ready', () => callOrder.push('ready'));
      hooks.hook('tracer:shutdown', () => callOrder.push('shutdown'));

      await hooks.callHook('tracer:init');
      await hooks.callHook('tracer:ready');
      await hooks.callHook('tracer:shutdown');

      expect(callOrder).toEqual(['init', 'ready', 'shutdown']);
    });
  });

  describe('Job Lifecycle Hooks', () => {
    it('should call job:discovered when job is found', async () => {
      const discoveredSpy = vi.fn();
      hooks.hook('job:discovered', discoveredSpy);

      await hooks.callHook('job:discovered', mockJob);

      expect(discoveredSpy).toHaveBeenCalledWith(mockJob);
    });

    it('should call job:validate before job validation', async () => {
      const validateSpy = vi.fn();
      hooks.hook('job:validate', validateSpy);

      await hooks.callHook('job:validate', mockJob);

      expect(validateSpy).toHaveBeenCalledWith(mockJob);
    });

    it('should call job:before before execution', async () => {
      const beforeSpy = vi.fn();
      hooks.hook('job:before', beforeSpy);

      await hooks.callHook('job:before', mockJob, mockContext);

      expect(beforeSpy).toHaveBeenCalledWith(mockJob, mockContext);
    });

    it('should call job:progress during execution', async () => {
      const progressSpy = vi.fn();
      hooks.hook('job:progress', progressSpy);

      const progressData = {
        stage: 'validation',
        percentage: 25,
        message: 'Validating job configuration'
      };

      await hooks.callHook('job:progress', mockJob, progressData);

      expect(progressSpy).toHaveBeenCalledWith(mockJob, progressData);
    });

    it('should call job:success on successful execution', async () => {
      const successSpy = vi.fn();
      hooks.hook('job:success', successSpy);

      const result = {
        success: true,
        exitCode: 0,
        duration: 1500,
        stdout: 'Job completed successfully'
      };

      await hooks.callHook('job:success', mockJob, result);

      expect(successSpy).toHaveBeenCalledWith(mockJob, result);
    });

    it('should call job:error on failed execution', async () => {
      const errorSpy = vi.fn();
      hooks.hook('job:error', errorSpy);

      const error = new Error('Job execution failed');

      await hooks.callHook('job:error', mockJob, error);

      expect(errorSpy).toHaveBeenCalledWith(mockJob, error);
    });

    it('should call job:after regardless of success or failure', async () => {
      const afterSpy = vi.fn();
      hooks.hook('job:after', afterSpy);

      const successResult = { success: true, exitCode: 0 };
      const failureResult = { success: false, exitCode: 1 };

      await hooks.callHook('job:after', mockJob, successResult);
      await hooks.callHook('job:after', mockJob, failureResult);

      expect(afterSpy).toHaveBeenCalledTimes(2);
      expect(afterSpy).toHaveBeenNthCalledWith(1, mockJob, successResult);
      expect(afterSpy).toHaveBeenNthCalledWith(2, mockJob, failureResult);
    });
  });

  describe('Receipt Hooks', () => {
    it('should call receipt:before before generating receipt', async () => {
      const beforeSpy = vi.fn();
      hooks.hook('receipt:before', beforeSpy);

      const result = { success: true, exitCode: 0 };

      await hooks.callHook('receipt:before', mockJob, result);

      expect(beforeSpy).toHaveBeenCalledWith(mockJob, result);
    });

    it('should call receipt:after after generating receipt', async () => {
      const afterSpy = vi.fn();
      hooks.hook('receipt:after', afterSpy);

      const receipt = {
        version: '1.0',
        meta: { id: 'receipt-123', timestamp: new Date() },
        execution: { job: mockJob }
      };

      await hooks.callHook('receipt:after', receipt);

      expect(afterSpy).toHaveBeenCalledWith(receipt);
    });

    it('should call receipt:written when receipt is saved', async () => {
      const writtenSpy = vi.fn();
      hooks.hook('receipt:written', writtenSpy);

      const receipt = { version: '1.0', meta: { id: 'receipt-123' } };
      const filePath = '/test/.gitvan/receipts/receipt-123.json';

      await hooks.callHook('receipt:written', receipt, filePath);

      expect(writtenSpy).toHaveBeenCalledWith(receipt, filePath);
    });
  });

  describe('Configuration Hooks', () => {
    it('should call config:load before loading configuration', async () => {
      const loadSpy = vi.fn();
      hooks.hook('config:load', loadSpy);

      const configPath = '/test/gitvan.config.js';

      await hooks.callHook('config:load', configPath);

      expect(loadSpy).toHaveBeenCalledWith(configPath);
    });

    it('should call config:loaded after configuration is loaded', async () => {
      const loadedSpy = vi.fn();
      hooks.hook('config:loaded', loadedSpy);

      const config = {
        version: '2.0',
        tracer: { enabled: true }
      };

      await hooks.callHook('config:loaded', config);

      expect(loadedSpy).toHaveBeenCalledWith(config);
    });

    it('should call config:changed when configuration changes', async () => {
      const changedSpy = vi.fn();
      hooks.hook('config:changed', changedSpy);

      const oldConfig = { tracer: { enabled: false } };
      const newConfig = { tracer: { enabled: true } };

      await hooks.callHook('config:changed', newConfig, oldConfig);

      expect(changedSpy).toHaveBeenCalledWith(newConfig, oldConfig);
    });
  });

  describe('Git Hooks', () => {
    it('should call git:before before git operations', async () => {
      const beforeSpy = vi.fn();
      hooks.hook('git:before', beforeSpy);

      await hooks.callHook('git:before', 'status', ['--porcelain']);

      expect(beforeSpy).toHaveBeenCalledWith('status', ['--porcelain']);
    });

    it('should call git:after after git operations', async () => {
      const afterSpy = vi.fn();
      hooks.hook('git:after', afterSpy);

      const result = { exitCode: 0, stdout: 'clean working directory' };

      await hooks.callHook('git:after', 'status', result);

      expect(afterSpy).toHaveBeenCalledWith('status', result);
    });

    it('should call git:error on git operation errors', async () => {
      const errorSpy = vi.fn();
      hooks.hook('git:error', errorSpy);

      const error = new Error('Not a git repository');

      await hooks.callHook('git:error', 'status', error);

      expect(errorSpy).toHaveBeenCalledWith('status', error);
    });
  });

  describe('Template Hooks', () => {
    it('should call template:render before rendering templates', async () => {
      const renderSpy = vi.fn();
      hooks.hook('template:render', renderSpy);

      const templatePath = 'job-report.njk';
      const data = { job: mockJob, result: { success: true } };

      await hooks.callHook('template:render', templatePath, data);

      expect(renderSpy).toHaveBeenCalledWith(templatePath, data);
    });

    it('should call template:rendered after rendering templates', async () => {
      const renderedSpy = vi.fn();
      hooks.hook('template:rendered', renderedSpy);

      const templatePath = 'job-report.njk';
      const output = '<html>Rendered content</html>';

      await hooks.callHook('template:rendered', templatePath, output);

      expect(renderedSpy).toHaveBeenCalledWith(templatePath, output);
    });
  });

  describe('File System Hooks', () => {
    it('should call fs:change on file system changes', async () => {
      const changeSpy = vi.fn();
      hooks.hook('fs:change', changeSpy);

      await hooks.callHook('fs:change', 'create', '/test/new-file.js');
      await hooks.callHook('fs:change', 'modify', '/test/existing-file.js');
      await hooks.callHook('fs:change', 'delete', '/test/old-file.js');

      expect(changeSpy).toHaveBeenCalledTimes(3);
      expect(changeSpy).toHaveBeenNthCalledWith(1, 'create', '/test/new-file.js');
      expect(changeSpy).toHaveBeenNthCalledWith(2, 'modify', '/test/existing-file.js');
      expect(changeSpy).toHaveBeenNthCalledWith(3, 'delete', '/test/old-file.js');
    });
  });

  describe('CLI Hooks', () => {
    it('should call cli:command on CLI command execution', async () => {
      const commandSpy = vi.fn();
      hooks.hook('cli:command', commandSpy);

      await hooks.callHook('cli:command', 'trace', ['--job', 'test-job']);

      expect(commandSpy).toHaveBeenCalledWith('trace', ['--job', 'test-job']);
    });

    it('should call cli:error on CLI errors', async () => {
      const errorSpy = vi.fn();
      hooks.hook('cli:error', errorSpy);

      const error = new Error('Invalid command');

      await hooks.callHook('cli:error', 'invalid-command', error);

      expect(errorSpy).toHaveBeenCalledWith('invalid-command', error);
    });
  });

  describe('Logging Hooks', () => {
    it('should call logging hooks for different levels', async () => {
      const debugSpy = vi.fn();
      const infoSpy = vi.fn();
      const warnSpy = vi.fn();
      const errorSpy = vi.fn();

      hooks.hook('debug', debugSpy);
      hooks.hook('info', infoSpy);
      hooks.hook('warn', warnSpy);
      hooks.hook('error', errorSpy);

      await hooks.callHook('debug', 'Debug message', { extra: 'data' });
      await hooks.callHook('info', 'Info message');
      await hooks.callHook('warn', 'Warning message');
      await hooks.callHook('error', 'Error message', new Error('Test error'));

      expect(debugSpy).toHaveBeenCalledWith('Debug message', { extra: 'data' });
      expect(infoSpy).toHaveBeenCalledWith('Info message');
      expect(warnSpy).toHaveBeenCalledWith('Warning message');
      expect(errorSpy).toHaveBeenCalledWith('Error message', expect.any(Error));
    });
  });

  describe('Hook Composition and Async Handling', () => {
    it('should handle async hooks properly', async () => {
      const asyncHook1 = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'hook1';
      });

      const asyncHook2 = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'hook2';
      });

      hooks.hook('job:before', asyncHook1);
      hooks.hook('job:before', asyncHook2);

      await hooks.callHook('job:before', mockJob, mockContext);

      expect(asyncHook1).toHaveBeenCalled();
      expect(asyncHook2).toHaveBeenCalled();
    });

    it('should handle hook errors gracefully', async () => {
      const workingHook = vi.fn();
      const errorHook = vi.fn(() => {
        throw new Error('Hook error');
      });

      hooks.hook('job:before', workingHook);
      hooks.hook('job:before', errorHook);

      // By default, hookable stops on first error
      await expect(
        hooks.callHook('job:before', mockJob, mockContext)
      ).rejects.toThrow('Hook error');

      expect(workingHook).toHaveBeenCalled();
      expect(errorHook).toHaveBeenCalled();
    });

    it('should support hook removal', async () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();

      const unsubscribe1 = hooks.hook('job:before', hook1);
      const unsubscribe2 = hooks.hook('job:before', hook2);

      await hooks.callHook('job:before', mockJob, mockContext);

      expect(hook1).toHaveBeenCalledOnce();
      expect(hook2).toHaveBeenCalledOnce();

      // Remove first hook
      unsubscribe1();

      await hooks.callHook('job:before', mockJob, mockContext);

      expect(hook1).toHaveBeenCalledOnce(); // Still once
      expect(hook2).toHaveBeenCalledTimes(2); // Called again

      // Remove second hook
      unsubscribe2();

      await hooks.callHook('job:before', mockJob, mockContext);

      expect(hook1).toHaveBeenCalledOnce();
      expect(hook2).toHaveBeenCalledTimes(2);
    });

    it('should support hook priorities', async () => {
      const callOrder = [];

      hooks.hook('job:before', () => callOrder.push('normal'), { priority: 0 });
      hooks.hook('job:before', () => callOrder.push('high'), { priority: 100 });
      hooks.hook('job:before', () => callOrder.push('low'), { priority: -100 });

      await hooks.callHook('job:before', mockJob, mockContext);

      expect(callOrder).toEqual(['high', 'normal', 'low']);
    });
  });

  describe('Hook Context and Data Flow', () => {
    it('should maintain context across hook calls', async () => {
      let receivedContext = null;

      hooks.hook('job:before', (job, ctx) => {
        receivedContext = ctx;
        ctx.modifiedByHook = true;
      });

      hooks.hook('job:after', (job, result) => {
        expect(receivedContext).toBeDefined();
        expect(receivedContext.modifiedByHook).toBe(true);
      });

      await hooks.callHook('job:before', mockJob, mockContext);
      await hooks.callHook('job:after', mockJob, { success: true });
    });

    it('should support hook data transformation', async () => {
      let transformedJob = null;

      hooks.hook('job:discovered', (job) => {
        job.meta.processed = true;
        job.meta.processedAt = new Date();
        transformedJob = job;
      });

      await hooks.callHook('job:discovered', mockJob);

      expect(transformedJob.meta.processed).toBe(true);
      expect(transformedJob.meta.processedAt).toBeInstanceOf(Date);
    });
  });
});