import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { scenario, testUtils } from '../../src/scenario-dsl.js'

describe('Scenario DSL Unit Tests', () => {
  describe('scenario', () => {
    it('should create a scenario builder', () => {
      const testScenario = scenario('Test Scenario')
      expect(testScenario).toBeDefined()
      expect(typeof testScenario.step).toBe('function')
      expect(typeof testScenario.run).toBe('function')
      expect(typeof testScenario.expect).toBe('function')
      expect(typeof testScenario.execute).toBe('function')
    })

    it('should build steps correctly', () => {
      const testScenario = scenario('Test Scenario')
        .step('First step')
        .run(['--help'])
        .expect(() => {})
        .step('Second step')
        .run(['--version'])
        .expect(() => {})

      // Access internal steps for testing
      const steps = testScenario._steps || []
      expect(steps).toHaveLength(2)
      expect(steps[0].description).toBe('First step')
      expect(steps[0].command.args).toEqual(['--help'])
      expect(steps[1].description).toBe('Second step')
      expect(steps[1].command.args).toEqual(['--version'])
    })

    it('should execute steps in order', async () => {
      const mockRunner = vi.fn().mockResolvedValue({
        result: { exitCode: 0, stdout: 'success', stderr: '' },
        expectSuccess: vi.fn().mockReturnThis(),
        expectOutput: vi.fn().mockReturnThis(),
      })

      const testScenario = scenario('Test Scenario')
        .step('First step')
        .run(['--help'])
        .expect((result) => result.expectSuccess())
        .step('Second step')
        .run(['--version'])
        .expect((result) => result.expectSuccess())

      const results = await testScenario.execute(mockRunner)

      expect(mockRunner).toHaveBeenCalledTimes(2)
      expect(mockRunner).toHaveBeenNthCalledWith(1, ['--help'], {})
      expect(mockRunner).toHaveBeenNthCalledWith(2, ['--version'], {})
      expect(results).toHaveLength(2)
    })

    it('should throw error for step without command', async () => {
      const mockRunner = vi.fn()

      const testScenario = scenario('Test Scenario').step('Step without command')

      await expect(testScenario.execute(mockRunner)).rejects.toThrow(
        'Step "Step without command" has no command'
      )
    })

    it('should throw error for step without expectations', async () => {
      const mockRunner = vi.fn().mockResolvedValue({
        result: { exitCode: 0, stdout: 'success', stderr: '' },
      })

      const testScenario = scenario('Test Scenario')
        .step('Step without expectations')
        .run(['--help'])

      await expect(testScenario.execute(mockRunner)).rejects.toThrow(
        'Step "Step without expectations" has no expectations'
      )
    })
  })

  describe('testUtils', () => {
    describe('waitFor', () => {
      it('should resolve when condition is met', async () => {
        let attempts = 0
        const condition = () => {
          attempts++
          return attempts >= 2
        }

        const result = await testUtils.waitFor(condition, 1000, 10)
        expect(result).toBe(true)
        expect(attempts).toBe(2)
      })

      it('should timeout when condition is not met', async () => {
        const condition = () => false

        await expect(testUtils.waitFor(condition, 100, 10)).rejects.toThrow(
          'Condition not met within 100ms'
        )
      })

      it('should work with async conditions', async () => {
        let attempts = 0
        const condition = async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          attempts++
          return attempts >= 2
        }

        const result = await testUtils.waitFor(condition, 1000, 10)
        expect(result).toBe(true)
      })
    })

    describe('retry', () => {
      it('should succeed on first attempt', async () => {
        const mockFn = vi.fn().mockResolvedValue('success')

        const result = await testUtils.retry(mockFn)

        expect(result).toBe('success')
        expect(mockFn).toHaveBeenCalledTimes(1)
      })

      it('should retry on failure and eventually succeed', async () => {
        const mockFn = vi
          .fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockRejectedValueOnce(new Error('Second failure'))
          .mockResolvedValue('success')

        const result = await testUtils.retry(mockFn, 3, 10)

        expect(result).toBe('success')
        expect(mockFn).toHaveBeenCalledTimes(3)
      })

      it('should fail after max attempts', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('Persistent failure'))

        await expect(testUtils.retry(mockFn, 2, 10)).rejects.toThrow('Persistent failure')
        expect(mockFn).toHaveBeenCalledTimes(2)
      })
    })

    describe('createTempFile', () => {
      let tempFiles = []

      afterEach(async () => {
        if (tempFiles.length > 0) {
          await testUtils.cleanupTempFiles(tempFiles)
          tempFiles = []
        }
      })

      it('should create a temporary file', async () => {
        const tempFile = await testUtils.createTempFile('test content', '.txt')
        tempFiles.push(tempFile)

        expect(tempFile).toContain('citty-test-')
        expect(tempFile).toContain('.txt')

        const { readFileSync } = await import('node:fs')
        const content = readFileSync(tempFile, 'utf8')
        expect(content).toBe('test content')
      })

      it('should create file with default extension', async () => {
        const tempFile = await testUtils.createTempFile('test content')
        tempFiles.push(tempFile)

        expect(tempFile).toContain('.txt')
      })
    })

    describe('cleanupTempFiles', () => {
      it('should clean up temporary files', async () => {
        const tempFile = await testUtils.createTempFile('test content', '.txt')

        const { existsSync } = await import('node:fs')
        expect(existsSync(tempFile)).toBe(true)

        await testUtils.cleanupTempFiles([tempFile])
        expect(existsSync(tempFile)).toBe(false)
      })

      it('should handle non-existent files gracefully', async () => {
        await expect(testUtils.cleanupTempFiles(['/non/existent/file'])).resolves.not.toThrow()
      })
    })
  })
})
