import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { runLocalCitty } from '../../src/local-runner.js'

describe('Local Runner Unit Tests', () => {
  describe('runLocalCitty', () => {
    it('should find GitVan project root correctly', async () => {
      // Mock the spawn function to avoid actual process execution
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate successful process completion
            setTimeout(() => callback(0), 10)
          }
        }),
      })

      // Mock the child_process module
      vi.doMock('node:child_process', () => ({
        spawn: mockSpawn,
      }))

      const result = await runLocalCitty(['--help'])

      expect(result).toBeDefined()
      expect(result.result).toBeDefined()
      expect(result.result.exitCode).toBe(0)
    })

    it('should handle process errors', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Process spawn failed')), 10)
          }
        }),
      })

      vi.doMock('node:child_process', () => ({
        spawn: mockSpawn,
      }))

      await expect(runLocalCitty(['--help'])).rejects.toThrow('Process spawn failed')
    })

    it('should handle timeout', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      })

      vi.doMock('node:child_process', () => ({
        spawn: mockSpawn,
      }))

      await expect(runLocalCitty(['--help'], { timeout: 10 })).rejects.toThrow(
        'Command timed out after 10ms'
      )
    })

    it('should handle JSON parsing', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('{"version": "3.0.0"}'))
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10)
          }
        }),
      })

      vi.doMock('node:child_process', () => ({
        spawn: mockSpawn,
      }))

      const result = await runLocalCitty(['--version'], { json: true })

      expect(result.result.json).toEqual({ version: '3.0.0' })
    })

    it('should handle invalid JSON gracefully', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('not json'))
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10)
          }
        }),
      })

      vi.doMock('node:child_process', () => ({
        spawn: mockSpawn,
      }))

      const result = await runLocalCitty(['--help'], { json: true })

      expect(result.result.json).toBeUndefined()
    })

    it('should pass environment variables', async () => {
      const mockSpawn = vi.fn().mockReturnValue({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10)
          }
        }),
      })

      vi.doMock('node:child_process', () => ({
        spawn: mockSpawn,
      }))

      await runLocalCitty(['--help'], { env: { TEST_VAR: 'test_value' } })

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        ['src/cli.mjs', '--help'],
        expect.objectContaining({
          env: expect.objectContaining({
            TEST_VAR: 'test_value',
          }),
        })
      )
    })
  })
})
