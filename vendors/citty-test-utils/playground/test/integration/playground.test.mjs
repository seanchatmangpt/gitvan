import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  runLocalCitty,
  runCitty,
  setupCleanroom,
  teardownCleanroom,
  scenarios,
} from 'citty-test-utils'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the playground directory path
const __filename = fileURLToPath(import.meta.url)
const playgroundDir = join(dirname(__filename), '../..')

describe('Playground CLI Tests', () => {
  describe('Basic Commands', () => {
    it('should show help information', async () => {
      const result = await runLocalCitty(['--help'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result
        .expectSuccess()
        .expectOutput(/test-cli/)
        .expectOutput(/COMMANDS/)
    })

    it('should show version information', async () => {
      const result = await runLocalCitty(['--version'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result.expectSuccess().expectOutput(/1\.0\.0/)
    })

    it('should execute greet command', async () => {
      const result = await runLocalCitty(['greet', 'Alice'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result
        .expectSuccess()
        .expectOutput(/Hello, Alice/)
        .expectNoStderr()
    })

    it('should execute greet command with options', async () => {
      const result = await runLocalCitty(['greet', 'Bob', '--count', '3', '--verbose'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result
        .expectSuccess()
        .expectOutput(/Verbose mode enabled/)
        .expectOutput(/Hello, Bob! \(1\/3\)/)
        .expectOutput(/Hello, Bob! \(2\/3\)/)
        .expectOutput(/Hello, Bob! \(3\/3\)/)
    })

    it('should execute math add command', async () => {
      const result = await runLocalCitty(['math', 'add', '5', '3'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result
        .expectSuccess()
        .expectOutput(/5 \+ 3 = 8/)
        .expectNoStderr()
    })

    it('should execute math multiply command', async () => {
      const result = await runLocalCitty(['math', 'multiply', '4', '7'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result
        .expectSuccess()
        .expectOutput(/4 × 7 = 28/)
        .expectNoStderr()
    })

    it('should handle JSON output', async () => {
      const result = await runLocalCitty(['greet', 'Charlie', '--json'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
        json: true,
      })

      result.expectSuccess().expectJson((json) => {
        expect(json.message).toBe('Hello, Charlie!')
        expect(json.count).toBe(1)
        expect(json.verbose).toBe(false)
      })
    })

    it('should handle invalid commands gracefully', async () => {
      const result = await runLocalCitty(['invalid-command'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result.expectFailure().expectStderr(/Unknown command/)
    })
  })

  describe('Error Handling', () => {
    it('should handle generic errors', async () => {
      const result = await runLocalCitty(['error', 'generic'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result.expectFailure().expectStderr(/Generic error occurred/)
    })

    it('should handle validation errors', async () => {
      const result = await runLocalCitty(['error', 'validation'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result.expectFailure().expectStderr(/Validation error/)
    })

    it('should handle timeout errors', async () => {
      const result = await runLocalCitty(['error', 'timeout'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
        timeout: 1000,
      })

      result.expectFailure()
    }, 15000)
  })

  describe('Cleanroom Testing', () => {
    beforeAll(async () => {
      await setupCleanroom({ rootDir: playgroundDir, timeout: 30000 })
    })

    afterAll(async () => {
      await teardownCleanroom()
    })

    it('should run commands in cleanroom environment', async () => {
      const result = await runCitty(['greet', 'Cleanroom'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result
        .expectSuccess()
        .expectOutput(/Hello, Cleanroom/)
        .expectNoStderr()
    })

    it('should handle JSON output in cleanroom', async () => {
      const result = await runCitty(['math', 'add', '10', '20', '--json'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
        json: true,
      })

      result.expectSuccess().expectJson((json) => {
        expect(json.operation).toBe('add')
        expect(json.a).toBe(10)
        expect(json.b).toBe(20)
        expect(json.result).toBe(30)
      })
    })

    it('should handle errors in cleanroom', async () => {
      const result = await runCitty(['error', 'generic'], {
        cwd: playgroundDir,
        env: { TEST_CLI: 'true' },
      })

      result.expectFailure().expectStderr(/Generic error occurred/)
    })
  })
})
