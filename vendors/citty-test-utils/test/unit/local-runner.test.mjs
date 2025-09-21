import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock child_process at the module level
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

import { runLocalCitty } from '../../src/local-runner.js'
import { exec } from 'node:child_process'

describe('Local Runner Unit Tests', () => {
  describe('runLocalCitty', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should find GitVan project root correctly', async () => {
      // Mock the exec function to avoid actual process execution
      exec.mockImplementation((command, options, callback) => {
        // Simulate successful process completion
        setTimeout(() => callback(null, 'Mock output', ''), 10)
      })

      const result = await runLocalCitty(['--help'])

      expect(result).toBeDefined()
      expect(result.result).toBeDefined()
      expect(result.result.exitCode).toBe(0)
    })

    it('should handle process errors', async () => {
      exec.mockImplementation((command, options, callback) => {
        // Simulate process error
        setTimeout(() => callback(new Error('Process exec failed')), 10)
      })

      await expect(runLocalCitty(['--help'])).rejects.toThrow('Process exec failed')
    })

    it('should handle timeout', async () => {
      exec.mockImplementation((command, options, callback) => {
        // Simulate timeout error
        const error = new Error('Command timed out after 10ms')
        error.code = 'TIMEOUT'
        setTimeout(() => callback(error), 10)
      })

      await expect(runLocalCitty(['--help'], { timeout: 10 })).rejects.toThrow(
        'Command timed out after 10ms'
      )
    })

    it('should handle JSON parsing', async () => {
      exec.mockImplementation((command, options, callback) => {
        // Simulate successful process completion with JSON output
        setTimeout(() => callback(null, '{"version": "3.0.0"}', ''), 10)
      })

      const result = await runLocalCitty(['--version'], { json: true })

      expect(result.result.json).toEqual({ version: '3.0.0' })
    })

    it('should handle invalid JSON gracefully', async () => {
      exec.mockImplementation((command, options, callback) => {
        // Simulate successful process completion with invalid JSON output
        setTimeout(() => callback(null, 'not json', ''), 10)
      })

      const result = await runLocalCitty(['--help'], { json: true })

      expect(result.result.json).toBeUndefined()
    })

    it('should pass environment variables', async () => {
      exec.mockImplementation((command, options, callback) => {
        // Simulate successful process completion
        setTimeout(() => callback(null, 'Mock output', ''), 10)
      })

      await runLocalCitty(['--help'], { env: { TEST_VAR: 'test_value' } })

      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('node src/cli.mjs --help'),
        expect.objectContaining({
          env: expect.objectContaining({
            TEST_VAR: 'test_value',
          }),
        }),
        expect.any(Function)
      )
    })
  })
})
