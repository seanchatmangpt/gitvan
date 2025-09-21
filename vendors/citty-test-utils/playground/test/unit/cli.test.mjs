import { describe, it, expect } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the playground directory path
const __filename = fileURLToPath(import.meta.url)
const playgroundDir = join(dirname(__filename), '../..')

describe('Playground Unit Tests', () => {
  describe('CLI Execution', () => {
    it('should execute basic commands', async () => {
      const result = await runLocalCitty(['greet', 'Test'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).toBe(0)
      expect(result.result.stdout).toContain('Hello, Test!')
      expect(result.result.stderr).toBe('')
    })

    it('should handle command arguments correctly', async () => {
      const result = await runLocalCitty(['greet', 'Alice', '--count', '2'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).toBe(0)
      expect(result.result.stdout).toContain('Hello, Alice! (1/2)')
      expect(result.result.stdout).toContain('Hello, Alice! (2/2)')
    })

    it('should handle boolean flags', async () => {
      const result = await runLocalCitty(['greet', 'Bob', '--verbose'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).toBe(0)
      expect(result.result.stdout).toContain('Verbose mode enabled')
      expect(result.result.stdout).toContain('Hello, Bob!')
    })

    it('should handle JSON output', async () => {
      const result = await runLocalCitty(['greet', 'Charlie', '--json'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
        json: true,
      })

      expect(result.result.exitCode).toBe(0)
      expect(result.result.json).toBeDefined()
      expect(result.result.json.message).toBe('Hello, Charlie!')
      expect(result.result.json.count).toBe(1)
      expect(result.result.json.verbose).toBe(false)
    })

    it('should handle subcommands', async () => {
      const result = await runLocalCitty(['math', 'add', '5', '3'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).toBe(0)
      expect(result.result.stdout).toContain('5 + 3 = 8')
    })

    it('should handle nested subcommands', async () => {
      const result = await runLocalCitty(['math', 'multiply', '4', '7'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).toBe(0)
      expect(result.result.stdout).toContain('4 × 7 = 28')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing required arguments', async () => {
      const result = await runLocalCitty(['math', 'add'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).not.toBe(0)
      expect(result.result.stderr).toContain('error')
    })

    it('should handle invalid commands', async () => {
      const result = await runLocalCitty(['invalid-command'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).not.toBe(0)
      expect(result.result.stderr).toContain('Unknown command')
    })

    it('should handle error simulation', async () => {
      const result = await runLocalCitty(['error', 'generic'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(result.result.exitCode).not.toBe(0)
      expect(result.result.stderr).toContain('Generic error occurred')
    })
  })

  describe('Fluent Assertions', () => {
    it('should support method chaining', async () => {
      const result = await runLocalCitty(['greet', 'Test'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result
        .expectSuccess()
        .expectOutput(/Hello, Test/)
        .expectNoStderr()
        .expectOutputLength(10, 50)
    })

    it('should provide meaningful error messages', async () => {
      const result = await runLocalCitty(['greet', 'Test'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      expect(() => {
        result.expectOutput(/Not Found/)
      }).toThrow('Expected stdout to match /Not Found/')
    })

    it('should handle JSON assertions', async () => {
      const result = await runLocalCitty(['greet', 'Test', '--json'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
        json: true,
      })

      result.expectSuccess().expectJson((json) => {
        expect(json.message).toBe('Hello, Test!')
        expect(json.count).toBe(1)
        expect(json.verbose).toBe(false)
      })
    })
  })
})
