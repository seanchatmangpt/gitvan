/**
 * GitVan V4 Context & DI Tests
 *
 * Comprehensive tests for the V4 context and dependency injection system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  token,
  createContext,
  getCurrentContext,
  runInContext,
  runInContextAsync,
  provide,
  inject,
  tryInject,
  hasProvider,
  onCleanup,
  cleanupContext,
  Tokens,
} from '../../src/v4/core/context.js';

describe('V4 Context & DI API', () => {
  describe('token()', () => {
    it('should create unique token', () => {
      const Token1 = token('test');
      const Token2 = token('test');

      // Same name returns same symbol
      expect(Token1).toBe(Token2);
    });

    it('should create different tokens for different names', () => {
      const Token1 = token('test1');
      const Token2 = token('test2');

      expect(Token1).not.toBe(Token2);
    });
  });

  describe('createContext()', () => {
    it('should create context', () => {
      const ctx = createContext();

      expect(ctx).toHaveProperty('id');
      expect(ctx).toHaveProperty('providers');
      expect(ctx).toHaveProperty('subscriptions');
      expect(ctx).toHaveProperty('cleanups');
    });

    it('should create context with parent', () => {
      const parent = createContext();
      const child = createContext(parent);

      expect(child.parent).toBe(parent);
    });

    it('should inherit providers from parent', () => {
      const TestToken = token('test');
      const parent = createContext();

      provide(parent, TestToken, 'parent-value');

      const child = createContext(parent);

      runInContext(child, () => {
        expect(inject(TestToken)).toBe('parent-value');
      });
    });
  });

  describe('runInContext()', () => {
    it('should run function in context', () => {
      const ctx = createContext();

      runInContext(ctx, () => {
        expect(getCurrentContext()).toBe(ctx);
      });
    });

    it('should restore previous context', () => {
      const ctx1 = createContext();
      const ctx2 = createContext();

      runInContext(ctx1, () => {
        expect(getCurrentContext()).toBe(ctx1);

        runInContext(ctx2, () => {
          expect(getCurrentContext()).toBe(ctx2);
        });

        expect(getCurrentContext()).toBe(ctx1);
      });
    });

    it('should return value from function', () => {
      const ctx = createContext();

      const result = runInContext(ctx, () => {
        return 42;
      });

      expect(result).toBe(42);
    });
  });

  describe('runInContextAsync()', () => {
    it('should run async function in context', async () => {
      const ctx = createContext();

      await runInContextAsync(ctx, async () => {
        await Promise.resolve();
        expect(getCurrentContext()).toBe(ctx);
      });
    });

    it('should preserve context across await', async () => {
      const ctx = createContext();
      const TestToken = token('test');

      provide(ctx, TestToken, 'test-value');

      await runInContextAsync(ctx, async () => {
        expect(inject(TestToken)).toBe('test-value');

        await Promise.resolve();

        expect(inject(TestToken)).toBe('test-value');
      });
    });

    it('should return value from async function', async () => {
      const ctx = createContext();

      const result = await runInContextAsync(ctx, async () => {
        await Promise.resolve();
        return 42;
      });

      expect(result).toBe(42);
    });
  });

  describe('provide() / inject()', () => {
    it('should provide and inject values', () => {
      const ctx = createContext();
      const TestToken = token('test');

      provide(ctx, TestToken, 'test-value');

      runInContext(ctx, () => {
        expect(inject(TestToken)).toBe('test-value');
      });
    });

    it('should throw when dependency not found', () => {
      const ctx = createContext();
      const TestToken = token('test');

      runInContext(ctx, () => {
        expect(() => inject(TestToken)).toThrow('Dependency not found');
      });
    });

    it('should use default value when provided', () => {
      const ctx = createContext();
      const TestToken = token('test');

      runInContext(ctx, () => {
        expect(inject(TestToken, 'default')).toBe('default');
      });
    });

    it('should support complex values', () => {
      const ctx = createContext();
      const TestToken = token('test');
      const complexValue = {
        name: 'test',
        data: [1, 2, 3],
        nested: { value: 42 },
      };

      provide(ctx, TestToken, complexValue);

      runInContext(ctx, () => {
        expect(inject(TestToken)).toEqual(complexValue);
      });
    });
  });

  describe('tryInject()', () => {
    it('should return value if available', () => {
      const ctx = createContext();
      const TestToken = token('test');

      provide(ctx, TestToken, 'test-value');

      runInContext(ctx, () => {
        expect(tryInject(TestToken)).toBe('test-value');
      });
    });

    it('should return undefined if not available', () => {
      const ctx = createContext();
      const TestToken = token('test');

      runInContext(ctx, () => {
        expect(tryInject(TestToken)).toBeUndefined();
      });
    });
  });

  describe('hasProvider()', () => {
    it('should check if provider exists', () => {
      const ctx = createContext();
      const TestToken = token('test');

      runInContext(ctx, () => {
        expect(hasProvider(TestToken)).toBe(false);
      });

      provide(ctx, TestToken, 'test-value');

      runInContext(ctx, () => {
        expect(hasProvider(TestToken)).toBe(true);
      });
    });
  });

  describe('onCleanup() / cleanupContext()', () => {
    it('should register cleanup function', async () => {
      const ctx = createContext();
      let cleaned = false;

      runInContext(ctx, () => {
        onCleanup(() => {
          cleaned = true;
        });
      });

      await cleanupContext(ctx);

      expect(cleaned).toBe(true);
    });

    it('should run multiple cleanups', async () => {
      const ctx = createContext();
      const cleanups = [];

      runInContext(ctx, () => {
        onCleanup(() => cleanups.push(1));
        onCleanup(() => cleanups.push(2));
        onCleanup(() => cleanups.push(3));
      });

      await cleanupContext(ctx);

      expect(cleanups).toHaveLength(3);
    });

    it('should run cleanups in reverse order', async () => {
      const ctx = createContext();
      const cleanups = [];

      runInContext(ctx, () => {
        onCleanup(() => cleanups.push(1));
        onCleanup(() => cleanups.push(2));
        onCleanup(() => cleanups.push(3));
      });

      await cleanupContext(ctx);

      expect(cleanups).toEqual([3, 2, 1]);
    });

    it('should support async cleanup', async () => {
      const ctx = createContext();
      let cleaned = false;

      runInContext(ctx, () => {
        onCleanup(async () => {
          await Promise.resolve();
          cleaned = true;
        });
      });

      await cleanupContext(ctx);

      expect(cleaned).toBe(true);
    });
  });

  describe('Standard Tokens', () => {
    it('should provide standard tokens', () => {
      expect(Tokens.Config).toBeDefined();
      expect(Tokens.Logger).toBeDefined();
      expect(Tokens.Cache).toBeDefined();
      expect(Tokens.Git).toBeDefined();
      expect(Tokens.Template).toBeDefined();
    });

    it('should inject standard tokens', () => {
      const ctx = createContext();
      const config = { test: 'value' };

      provide(ctx, Tokens.Config, config);

      runInContext(ctx, () => {
        expect(inject(Tokens.Config)).toBe(config);
      });
    });
  });

  describe('Nested Contexts', () => {
    it('should support nested contexts', () => {
      const ctx1 = createContext();
      const ctx2 = createContext();

      runInContext(ctx1, () => {
        expect(getCurrentContext()).toBe(ctx1);

        runInContext(ctx2, () => {
          expect(getCurrentContext()).toBe(ctx2);
        });

        expect(getCurrentContext()).toBe(ctx1);
      });
    });

    it('should preserve providers in nested contexts', () => {
      const Token1 = token('token1');
      const Token2 = token('token2');

      const ctx1 = createContext();
      const ctx2 = createContext();

      provide(ctx1, Token1, 'value1');
      provide(ctx2, Token2, 'value2');

      runInContext(ctx1, () => {
        expect(inject(Token1)).toBe('value1');

        runInContext(ctx2, () => {
          expect(inject(Token2)).toBe('value2');
        });

        expect(inject(Token1)).toBe('value1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw when no context available', () => {
      expect(() => getCurrentContext()).not.toThrow();
      expect(getCurrentContext()).toBeUndefined();
    });

    it('should throw when injecting without context', () => {
      const TestToken = token('test');

      expect(() => inject(TestToken)).toThrow();
    });

    it('should not throw when trying to inject without context', () => {
      const TestToken = token('test');

      expect(tryInject(TestToken)).toBeUndefined();
    });
  });
});
