/**
 * Tests for createComposable factory pattern
 * Tests lifecycle hooks, metadata, and context preservation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createComposable,
  defineComposable,
  composeComposables,
  withContextPreservation,
  setComposableMetadata,
  getComposableMetadata,
} from '../src/composables/createComposable.mjs';
import { withGitVan } from '../src/composables/ctx.mjs';

describe('createComposable Factory', () => {
  const mockContext = {
    cwd: '/test/repo',
    env: { TEST: 'true' },
  };

  describe('createComposable() - Basic Factory', () => {
    it('should create a composable with name and factory', () => {
      const factory = vi.fn((ctx, base) => ({
        test: () => 'works',
      }));

      const composable = createComposable({
        name: 'useTest',
        version: '1.0.0',
        factory,
      });

      expect(composable).toBeDefined();
      expect(typeof composable).toBe('function');
    });

    it('should throw error without name', () => {
      expect(() => {
        createComposable({
          factory: () => ({}),
        });
      }).toThrow('Composable definition must include a name');
    });

    it('should throw error without factory', () => {
      expect(() => {
        createComposable({
          name: 'useTest',
        });
      }).toThrow('Composable definition must include a factory function');
    });

    it('should create instance with metadata', () => {
      const composable = createComposable({
        name: 'useMetadata',
        version: '2.0.0',
        dependencies: ['git', 'log'],
        factory: () => ({ method: () => 'test' }),
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(instance._metadata).toBeDefined();
      expect(instance._metadata.name).toBe('useMetadata');
      expect(instance._metadata.version).toBe('2.0.0');
      expect(instance._metadata.dependencies).toEqual(['git', 'log']);
    });

    it('should call onCreate hook if provided', () => {
      const onCreate = vi.fn();
      const composable = createComposable({
        name: 'useOnCreate',
        factory: () => ({ method: () => 'test' }),
        onCreate,
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(onCreate).toHaveBeenCalledWith(instance);
    });

    it('should add destroy method with onDestroy hook', () => {
      const onDestroy = vi.fn();
      const composable = createComposable({
        name: 'useDestroy',
        factory: () => ({ method: () => 'test' }),
        onDestroy,
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(instance.destroy).toBeDefined();
      expect(typeof instance.destroy).toBe('function');
    });

    it('should preserve context in instance', () => {
      const composable = createComposable({
        name: 'useContext',
        factory: () => ({ method: () => 'test' }),
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(instance._context).toBeDefined();
      expect(instance._base).toBeDefined();
      expect(instance._base.cwd).toBe('/test/repo');
    });
  });

  describe('defineComposable() - Alias', () => {
    it('should work as alias for createComposable', () => {
      const composable = defineComposable('useAlias', () => ({
        method: () => 'test',
      }));

      const instance = withGitVan(mockContext, () => composable());
      expect(instance._metadata.name).toBe('useAlias');
    });
  });

  describe('composeComposables() - Composition', () => {
    it('should merge multiple composables', () => {
      const comp1 = { method1: () => 'one', _metadata: { name: 'comp1' } };
      const comp2 = { method2: () => 'two', _metadata: { name: 'comp2' } };

      const merged = composeComposables([comp1, comp2]);

      expect(merged.method1).toBeDefined();
      expect(merged.method2).toBeDefined();
      expect(merged._metadata.type).toBe('composed');
    });

    it('should throw error without composables', () => {
      expect(() => {
        composeComposables([]);
      }).toThrow('composeComposables requires a non-empty array');
    });

    it('should handle key conflicts with "last" strategy', () => {
      const comp1 = {
        method: () => 'first',
        _metadata: { name: 'comp1' },
      };
      const comp2 = {
        method: () => 'second',
        _metadata: { name: 'comp2' },
      };

      const merged = composeComposables([comp1, comp2], { conflict: 'last' });

      expect(merged.method()).toBe('second');
    });

    it('should handle key conflicts with "first" strategy', () => {
      const comp1 = {
        method: () => 'first',
        _metadata: { name: 'comp1' },
      };
      const comp2 = {
        method: () => 'second',
        _metadata: { name: 'comp2' },
      };

      const merged = composeComposables([comp1, comp2], {
        conflict: 'first',
      });

      expect(merged.method()).toBe('first');
    });

    it('should throw error with "error" conflict strategy', () => {
      const comp1 = {
        method: () => 'first',
        _metadata: { name: 'comp1' },
      };
      const comp2 = {
        method: () => 'second',
        _metadata: { name: 'comp2' },
      };

      expect(() => {
        composeComposables([comp1, comp2], { conflict: 'error' });
      }).toThrow('Key conflict');
    });

    it('should optionally prefix methods', () => {
      const comp1 = { method: () => 'one', _metadata: { name: 'comp1' } };
      const comp2 = { method: () => 'two', _metadata: { name: 'comp2' } };

      const merged = composeComposables([comp1, comp2], { prefix: true });

      expect(merged.comp1Method).toBeDefined();
      expect(merged.comp2Method).toBeDefined();
    });

    it('should filter private methods starting with _', () => {
      const comp = {
        publicMethod: () => 'public',
        _privateMethod: () => 'private',
        _metadata: { name: 'comp' },
      };

      const merged = composeComposables([comp]);

      expect(merged.publicMethod).toBeDefined();
      expect(merged._privateMethod).toBeUndefined();
    });
  });

  describe('withContextPreservation() - Async Wrapping', () => {
    it('should wrap method to preserve context', () => {
      const instance = {
        method: vi.fn(async () => 'result'),
        _context: mockContext,
      };

      withContextPreservation(instance, 'method');

      expect(instance.method).toBeDefined();
    });

    it('should no-op if instance is null', () => {
      expect(() => {
        withContextPreservation(null, 'method');
      }).not.toThrow();
    });

    it('should no-op if method name is invalid', () => {
      const instance = { method: () => 'test' };
      expect(() => {
        withContextPreservation(instance, null);
      }).not.toThrow();
    });
  });

  describe('setComposableMetadata() - Metadata Management', () => {
    it('should set metadata on instance', () => {
      const instance = { method: () => 'test' };
      const metadata = { custom: 'value', version: '2.0.0' };

      setComposableMetadata(instance, metadata);

      expect(instance._metadata).toBeDefined();
      expect(instance._metadata.custom).toBe('value');
      expect(instance._metadata.version).toBe('2.0.0');
    });

    it('should merge metadata with existing', () => {
      const instance = {
        method: () => 'test',
        _metadata: { name: 'test', version: '1.0.0' },
      };

      setComposableMetadata(instance, { custom: 'value' });

      expect(instance._metadata.name).toBe('test');
      expect(instance._metadata.custom).toBe('value');
    });

    it('should no-op if instance is null', () => {
      expect(() => {
        setComposableMetadata(null, { key: 'value' });
      }).not.toThrow();
    });
  });

  describe('getComposableMetadata() - Metadata Retrieval', () => {
    it('should get metadata from instance', () => {
      const instance = {
        method: () => 'test',
        _metadata: { name: 'test', version: '1.0.0' },
      };

      const metadata = getComposableMetadata(instance);

      expect(metadata).toBeDefined();
      expect(metadata.name).toBe('test');
      expect(metadata.version).toBe('1.0.0');
    });

    it('should return null if instance is null', () => {
      const metadata = getComposableMetadata(null);
      expect(metadata).toBeNull();
    });

    it('should return null if no metadata', () => {
      const instance = { method: () => 'test' };
      const metadata = getComposableMetadata(instance);
      expect(metadata).toBeNull();
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should call onCreate and onDestroy in sequence', async () => {
      const onCreate = vi.fn();
      const onDestroy = vi.fn();

      const composable = createComposable({
        name: 'useLifecycle',
        factory: () => ({ method: () => 'test' }),
        onCreate,
        onDestroy,
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(onCreate).toHaveBeenCalled();

      if (instance.destroy) {
        await instance.destroy();
        expect(onDestroy).toHaveBeenCalled();
      }
    });

    it('should pass instance to onCreate hook', () => {
      const onCreate = vi.fn();

      const composable = createComposable({
        name: 'useLifecycle',
        factory: () => ({ method: () => 'test' }),
        onCreate,
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(onCreate).toHaveBeenCalledWith(instance);
    });

    it('should handle errors in onCreate hook', () => {
      const composable = createComposable({
        name: 'useLifecycleError',
        factory: () => ({ method: () => 'test' }),
        onCreate: () => {
          throw new Error('onCreate failed');
        },
      });

      expect(() => {
        withGitVan(mockContext, () => composable());
      }).toThrow('onCreate hook failed');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if factory returns non-object', () => {
      const composable = createComposable({
        name: 'useInvalid',
        factory: () => 'not an object',
      });

      expect(() => {
        withGitVan(mockContext, () => composable());
      }).toThrow('factory must return an object instance');
    });

    it('should throw error if factory throws', () => {
      const composable = createComposable({
        name: 'useError',
        factory: () => {
          throw new Error('Factory error');
        },
      });

      expect(() => {
        withGitVan(mockContext, () => composable());
      }).toThrow('Failed to create composable');
    });
  });

  describe('Environment Setup', () => {
    it('should set TZ=UTC and LANG=C', () => {
      const factory = vi.fn((ctx, base) => ({
        getEnv: () => base.env,
      }));

      const composable = createComposable({
        name: 'useEnv',
        factory,
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(instance._base.env.TZ).toBe('UTC');
      expect(instance._base.env.LANG).toBe('C');
    });

    it('should preserve cwd from context', () => {
      const factory = vi.fn((ctx, base) => ({
        getCwd: () => base.cwd,
      }));

      const composable = createComposable({
        name: 'useCwd',
        factory,
      });

      const instance = withGitVan(mockContext, () => composable());

      expect(instance._base.cwd).toBe('/test/repo');
    });
  });
});
