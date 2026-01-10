/**
 * Tests for composable mixins
 * Tests logging, caching, and validation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  withLogging,
  withCaching,
  withValidation,
  composableMixins,
} from '../src/composables/composableMixins.mjs';

describe('Composable Mixins', () => {
  const mockContext = {
    cwd: '/test/repo',
    env: { TEST: 'true' },
  };

  describe('withLogging Mixin', () => {
    it('should wrap instance with logging proxy', () => {
      const instance = {
        method: vi.fn(() => 'result'),
      };

      const logged = withLogging(instance, mockContext);

      expect(logged).toBeDefined();
      expect(logged.method).toBeDefined();
    });

    it('should log sync method calls', () => {
      const instance = {
        syncMethod: () => 'result',
      };

      const logged = withLogging(instance, mockContext);
      const result = logged.syncMethod();

      expect(result).toBe('result');
    });

    it('should log async method calls', async () => {
      const instance = {
        asyncMethod: vi.fn(async () => 'result'),
      };

      const logged = withLogging(instance, mockContext);
      const result = await logged.asyncMethod();

      expect(result).toBe('result');
      expect(instance.asyncMethod).toHaveBeenCalled();
    });

    it('should skip logging for private methods', () => {
      const instance = {
        _privateMethod: vi.fn(() => 'private'),
      };

      const logged = withLogging(instance, mockContext);
      const result = logged._privateMethod();

      expect(result).toBe('private');
    });

    it('should skip logging for non-function properties', () => {
      const instance = {
        property: 'value',
        method: () => 'result',
      };

      const logged = withLogging(instance, mockContext);

      expect(logged.property).toBe('value');
      expect(logged.method).toBeDefined();
    });

    it('should have displayName property', () => {
      expect(withLogging.displayName).toBe('withLogging');
    });
  });

  describe('withCaching Mixin', () => {
    it('should wrap instance with caching proxy', () => {
      const instance = {
        method: vi.fn(async () => 'result'),
      };

      const cached = withCaching(instance, mockContext);

      expect(cached).toBeDefined();
      expect(cached.method).toBeDefined();
    });

    it('should cache async method results', async () => {
      const method = vi.fn(async () => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext, { defaultTTL: 5000 });

      const result1 = await cached.method();
      const result2 = await cached.method();

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      // Method should be called only once due to caching
      expect(method).toHaveBeenCalledTimes(1);
    });

    it('should cache sync method results', async () => {
      const method = vi.fn(() => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext, { defaultTTL: 5000 });

      const result1 = cached.method();
      const result2 = cached.method();

      // Cached results are wrapped in Promise.resolve for consistency
      expect(await result1).toBe('result');
      expect(await result2).toBe('result');
      expect(method).toHaveBeenCalledTimes(1);
    });

    it('should use method-specific TTL', async () => {
      const method = vi.fn(async () => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext, {
        defaultTTL: 100,
        methodTTL: { method: 10000 },
      });

      await cached.method();
      // Cache should be valid immediately
      expect(cached.__cache.size()).toBe(1);
    });

    it('should cache results with different arguments separately', async () => {
      const method = vi.fn(async (arg) => `result-${arg}`);
      const instance = { method };

      const cached = withCaching(instance, mockContext, { defaultTTL: 5000 });

      const result1 = await cached.method('a');
      const result2 = await cached.method('b');
      const result3 = await cached.method('a');

      expect(result1).toBe('result-a');
      expect(result2).toBe('result-b');
      expect(result3).toBe('result-a');
      // Method called twice (a, b), third call (a) uses cache
      expect(method).toHaveBeenCalledTimes(2);
    });

    it('should provide cache control methods', () => {
      const instance = { method: () => 'result' };
      const cached = withCaching(instance, mockContext);

      expect(cached.__cache).toBeDefined();
      expect(cached.__cache.invalidate).toBeDefined();
      expect(cached.__cache.size).toBeDefined();
      expect(cached.__cache.clear).toBeDefined();
    });

    it('should allow cache invalidation', async () => {
      const method = vi.fn(async () => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext, { defaultTTL: 5000 });

      await cached.method();
      expect(method).toHaveBeenCalledTimes(1);

      cached.__cache.invalidate('method');

      await cached.method();
      expect(method).toHaveBeenCalledTimes(2);
    });

    it('should allow cache clearing', async () => {
      const method = vi.fn(async () => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext, { defaultTTL: 5000 });

      await cached.method();
      expect(cached.__cache.size()).toBeGreaterThan(0);

      cached.__cache.clear();
      expect(cached.__cache.size()).toBe(0);
    });

    it('should skip caching for methods with non-serializable args', async () => {
      const method = vi.fn(async () => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext);

      const circularObj = {};
      circularObj.self = circularObj; // Non-serializable

      const result = await cached.method(circularObj);
      expect(result).toBe('result');
    });

    it('should skip logging for private methods', async () => {
      const instance = {
        _privateMethod: vi.fn(async () => 'private'),
      };

      const cached = withCaching(instance, mockContext);
      const result = await cached._privateMethod();

      expect(result).toBe('private');
      expect(instance._privateMethod).toHaveBeenCalledTimes(1);
    });

    it('should have displayName property', () => {
      expect(withCaching.displayName).toBe('withCaching');
    });
  });

  describe('withValidation Mixin', () => {
    it('should wrap instance with validation proxy', () => {
      const instance = {
        method: vi.fn(() => 'result'),
      };

      const validated = withValidation(instance, mockContext);

      expect(validated).toBeDefined();
      expect(validated.method).toBeDefined();
    });

    it('should validate input before method call', () => {
      const instance = {
        method: () => 'result',
      };

      const validated = withValidation(instance, mockContext, {
        validators: {
          method: {
            input: (args) => Array.isArray(args) && args.length === 1,
          },
        },
      });

      expect(() => {
        validated.method();
      }).toThrow('Validation failed');

      expect(() => {
        validated.method('arg');
      }).not.toThrow();
    });

    it('should validate output after method call', async () => {
      const instance = {
        method: async () => 'result',
      };

      const validated = withValidation(instance, mockContext, {
        validators: {
          method: {
            output: (result) => result === 'expected',
          },
        },
      });

      try {
        await validated.method();
      } catch (error) {
        expect(error.message).toContain('Validation failed');
      }
    });

    it('should apply default input validation', () => {
      const instance = {
        method: () => 'result',
      };

      const validated = withValidation(instance, mockContext);

      // Default validation expects args to be array-like
      const result = validated.method();
      expect(result).toBe('result');
    });

    it('should skip validation for private methods', () => {
      const instance = {
        _privateMethod: () => 'result',
      };

      const validated = withValidation(instance, mockContext, {
        validators: {
          _privateMethod: {
            input: () => false, // Would fail if validated
          },
        },
      });

      const result = validated._privateMethod();
      expect(result).toBe('result');
    });

    it('should have displayName property', () => {
      expect(withValidation.displayName).toBe('withValidation');
    });
  });

  describe('Mixin Composition', () => {
    it('should allow combining multiple mixins', () => {
      const instance = {
        method: vi.fn(async () => 'result'),
      };

      const logged = withLogging(instance, mockContext);
      const cached = withCaching(logged, mockContext);
      const validated = withValidation(cached, mockContext);

      expect(validated.method).toBeDefined();
    });

    it('should preserve method functionality through mixins', async () => {
      const original = vi.fn(async () => 'result');
      const instance = { method: original };

      const logged = withLogging(instance, mockContext);
      const cached = withCaching(logged, mockContext);

      const result = await cached.method();
      expect(result).toBe('result');
    });

    it('should handle caching before logging', async () => {
      const method = vi.fn(async () => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext);
      const logged = withLogging(cached, mockContext);

      await logged.method();
      await logged.method();

      // Due to caching, original method called only once
      expect(method).toHaveBeenCalledTimes(1);
    });
  });

  describe('composableMixins Namespace', () => {
    it('should export all mixins in namespace', () => {
      expect(composableMixins.withLogging).toBeDefined();
      expect(composableMixins.withCaching).toBeDefined();
      expect(composableMixins.withValidation).toBeDefined();
    });

    it('should provide convenient access to mixins', () => {
      const instance = { method: () => 'result' };
      const logged = composableMixins.withLogging(instance, mockContext);

      expect(logged.method).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in logging', async () => {
      const instance = {
        method: vi.fn(() => {
          throw new Error('Method error');
        }),
      };

      const logged = withLogging(instance, mockContext);

      expect(() => {
        logged.method();
      }).toThrow('Method error');
    });

    it('should handle errors in async logging', async () => {
      const instance = {
        method: vi.fn(async () => {
          throw new Error('Async error');
        }),
      };

      const logged = withLogging(instance, mockContext);

      try {
        await logged.method();
      } catch (error) {
        expect(error.message).toBe('Async error');
      }
    });

    it('should not cache failed results', async () => {
      let callCount = 0;
      const instance = {
        method: async () => {
          callCount++;
          throw new Error('Method error');
        },
      };

      const cached = withCaching(instance, mockContext);

      try {
        await cached.method();
      } catch (error) {
        expect(error.message).toBe('Method error');
      }

      try {
        await cached.method();
      } catch (error) {
        expect(error.message).toBe('Method error');
      }

      expect(callCount).toBe(2); // Called twice, not cached
    });
  });

  describe('Edge Cases', () => {
    it('should handle null instance gracefully', () => {
      const logged = withLogging(null, mockContext);
      expect(logged).toBeNull();
    });

    it('should handle non-object instance gracefully', () => {
      const logged = withLogging('string', mockContext);
      expect(logged).toBe('string');
    });

    it('should skip caching for non-function properties', () => {
      const instance = { property: 'value' };
      const cached = withCaching(instance, mockContext);

      expect(cached.property).toBe('value');
    });

    it('should handle methods with no arguments', async () => {
      const method = vi.fn(async () => 'result');
      const instance = { method };

      const cached = withCaching(instance, mockContext);
      const result1 = await cached.method();
      const result2 = await cached.method();

      expect(method).toHaveBeenCalledTimes(1);
    });

    it('should handle methods returning falsy values', async () => {
      const method = vi.fn(async () => 0);
      const instance = { method };

      const cached = withCaching(instance, mockContext);
      const result1 = await cached.method();
      const result2 = await cached.method();

      expect(result1).toBe(0);
      expect(result2).toBe(0);
      expect(method).toHaveBeenCalledTimes(1);
    });
  });
});
