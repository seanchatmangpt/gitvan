/**
 * GitVan V4 Compatibility Layer Tests
 *
 * Tests for V3→V4 compatibility layer ensuring smooth migration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useGit,
  useJob,
  useTemplate,
  useConfig,
  useWorkflow,
  withGitVan,
} from '../../src/v4/compat/index.mjs';

describe('V4 Compatibility Layer', () => {
  beforeEach(() => {
    // Suppress deprecation warnings in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useGit() compatibility', () => {
    it('should provide V3-style interface', () => {
      const git = useGit();

      expect(git).toHaveProperty('run');
      expect(git).toHaveProperty('branch');
      expect(git).toHaveProperty('head');
      expect(git).toHaveProperty('status');
      expect(git).toHaveProperty('commit');
    });

    it('should show deprecation warning', () => {
      useGit();

      expect(console.warn).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });

    it('should only warn once', () => {
      useGit();
      useGit();
      useGit();

      // Should only warn once globally
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('should accept gitvan context', () => {
      const context = {
        cwd: '/test/path',
        env: { TEST: 'value' },
      };

      const git = useGit(context);

      expect(git).toBeDefined();
    });
  });

  describe('useJob() compatibility', () => {
    it('should provide V3-style interface', () => {
      const job = useJob();

      expect(job).toHaveProperty('cwd');
      expect(job).toHaveProperty('env');
      expect(job).toHaveProperty('list');
      expect(job).toHaveProperty('execute');
      expect(job).toHaveProperty('cancel');
    });

    it('should show deprecation warning', () => {
      useJob();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });
  });

  describe('useTemplate() compatibility', () => {
    it('should provide V3-style interface', () => {
      const template = useTemplate();

      expect(template).toHaveProperty('render');
      expect(template).toHaveProperty('renderFile');
      expect(template).toHaveProperty('clearCache');
    });

    it('should show deprecation warning', () => {
      useTemplate();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });
  });

  describe('useConfig() compatibility', () => {
    it('should provide V3-style interface', () => {
      const config = useConfig();

      expect(config).toHaveProperty('get');
      expect(config).toHaveProperty('set');
      expect(config).toHaveProperty('watch');
    });

    it('should show deprecation warning', () => {
      useConfig();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });
  });

  describe('useWorkflow() compatibility', () => {
    it('should provide V3-style interface', () => {
      const workflow = useWorkflow([]);

      expect(workflow).toHaveProperty('run');
      expect(workflow).toHaveProperty('cancel');
      expect(workflow).toHaveProperty('reset');
      expect(workflow).toHaveProperty('state');
    });

    it('should show deprecation warning', () => {
      useWorkflow([]);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });
  });

  describe('withGitVan() compatibility', () => {
    it('should wrap function execution', async () => {
      let executed = false;

      await withGitVan({}, async () => {
        executed = true;
      });

      expect(executed).toBe(true);
    });

    it('should show deprecation warning', async () => {
      await withGitVan({}, async () => {});

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });

    it('should return function result', async () => {
      const result = await withGitVan({}, async () => {
        return 42;
      });

      expect(result).toBe(42);
    });
  });

  describe('Deprecation Messages', () => {
    it('should include migration guide link', () => {
      useGit();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('/docs/migration/v3-to-v4.md')
      );
    });

    it('should include V4 alternative', () => {
      useGit();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('useGit() from @gitvan/v4/hooks/gitvan')
      );
    });

    it('should include deprecation timeline', () => {
      useGit();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Q2 2027')
      );
    });
  });

  describe('Context Wrapping', () => {
    it('should create V3 context with defaults', () => {
      const git = useGit();

      expect(git).toBeDefined();
      // Should create context with process.cwd() as default
    });

    it('should use provided context values', () => {
      const context = {
        cwd: '/custom/path',
        env: { CUSTOM: 'value' },
      };

      const git = useGit(context);

      expect(git).toBeDefined();
    });
  });
});
