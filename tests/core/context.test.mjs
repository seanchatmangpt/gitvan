// Test for core context module
import { describe, it, expect, beforeEach } from 'vitest'
import { useGitVan, tryUseGitVan, withGitVan, bindContext } from '../../src/core/context.mjs'

describe('Core Context Module', () => {
  describe('bindContext()', () => {
    it('should return deterministic environment without context', () => {
      const result = bindContext()

      expect(result).toHaveProperty('ctx')
      expect(result).toHaveProperty('cwd')
      expect(result).toHaveProperty('env')

      // Should use process.cwd() when no context
      expect(result.cwd).toBe(process.cwd())

      // Should have deterministic environment
      expect(result.env.TZ).toBe('UTC')
      expect(result.env.LANG).toBe('C')
    })

    it('should merge context environment when available', async () => {
      const testContext = {
        cwd: '/test/path',
        env: { TEST_VAR: 'test_value' }
      }

      await withGitVan(testContext, () => {
        const result = bindContext()

        expect(result.ctx).toEqual(testContext)
        expect(result.cwd).toBe('/test/path')
        expect(result.env.TZ).toBe('UTC')
        expect(result.env.LANG).toBe('C')
        expect(result.env.TEST_VAR).toBe('test_value')
      })
    })

    it('should gracefully handle context access errors', () => {
      // Outside of withGitVan context
      const result = bindContext()

      // Should not throw and should use fallbacks
      expect(result.ctx).toBeNull()
      expect(result.cwd).toBe(process.cwd())
      expect(result.env.TZ).toBe('UTC')
      expect(result.env.LANG).toBe('C')
    })
  })

  describe('useGitVan()', () => {
    it('should throw outside context', () => {
      expect(() => useGitVan()).toThrow()
    })

    it('should return context within withGitVan', async () => {
      const testContext = { cwd: '/test', env: {} }

      await withGitVan(testContext, () => {
        const ctx = useGitVan()
        expect(ctx).toEqual(testContext)
      })
    })
  })

  describe('tryUseGitVan()', () => {
    it('should return null outside context', () => {
      expect(tryUseGitVan()).toBeNull()
    })

    it('should return context within withGitVan', async () => {
      const testContext = { cwd: '/test', env: {} }

      await withGitVan(testContext, () => {
        const ctx = tryUseGitVan()
        expect(ctx).toEqual(testContext)
      })
    })
  })
})