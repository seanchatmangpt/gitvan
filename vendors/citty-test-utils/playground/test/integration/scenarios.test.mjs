import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { scenario, scenarios, setupCleanroom, teardownCleanroom } from 'citty-test-utils'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the playground directory path
const __filename = fileURLToPath(import.meta.url)
const playgroundDir = join(dirname(__filename), '../..')

describe('Playground Scenario Tests', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: playgroundDir, timeout: 30000 })
  })

  afterAll(async () => {
    await teardownCleanroom()
  })
  describe('Pre-built Scenarios', () => {
    it('should execute help scenario', async () => {
      const result = await scenarios.help('local').execute()

      expect(result.success).toBe(true)
      expect(result.result.stdout).toContain('playground')
      expect(result.result.stdout).toContain('COMMANDS')
    })

    it('should execute version scenario', async () => {
      const result = await scenarios.version('local').execute()

      expect(result.success).toBe(true)
      expect(result.result.stdout).toMatch(/1\.0\.0/)
    })

    it('should execute invalid command scenario', async () => {
      const result = await scenarios.invalidCommand('nonexistent', 'local').execute()

      expect(result.success).toBe(true)
    })

    it('should execute JSON output scenario', async () => {
      const result = await scenarios.jsonOutput(['greet', 'Test', '--json'], 'local').execute()

      expect(result.success).toBe(true)
      expect(result.result.json).toBeDefined()
      expect(result.result.json.message).toBe('Hello, Test!')
    })

    it('should execute subcommand scenario', async () => {
      const result = await scenarios.subcommand('math', ['add', '5', '3'], 'local').execute()

      expect(result.success).toBe(true)
      expect(result.result.stdout).toContain('5 + 3 = 8')
    })

    it('should execute idempotent scenario', async () => {
      const result = await scenarios.idempotent(['greet', 'Alice'], 'local').execute()

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].stdout).toBe(result.results[1].stdout)
    })

    it('should execute concurrent scenario', async () => {
      const runs = [
        { args: ['greet', 'Alice'], opts: {} },
        { args: ['greet', 'Bob'], opts: {} },
        { args: ['math', 'add', '1', '1'], opts: {} },
      ]

      const result = await scenarios.concurrent(runs, 'local').execute()

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(3)
    })
  })

  describe('Custom Scenarios', () => {
    it('should execute greet workflow', async () => {
      const greetScenario = scenario('Greet Workflow')
        .step('Greet Alice')
        .run(['greet', 'Alice'])
        .expectSuccess()
        .expectOutput(/Hello, Alice/)
        .step('Greet Bob with options')
        .run(['greet', 'Bob', '--count', '2', '--verbose'])
        .expectSuccess()
        .expectOutput(/Verbose mode enabled/)
        .expectOutput(/Hello, Bob! \(1\/2\)/)
        .expectOutput(/Hello, Bob! \(2\/2\)/)

      const result = await greetScenario.execute('local')

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
    })

    it('should execute math operations workflow', async () => {
      const mathScenario = scenario('Math Operations')
        .step('Add numbers')
        .run(['math', 'add', '5', '3'])
        .expectSuccess()
        .expectOutput(/5 \+ 3 = 8/)
        .step('Multiply numbers')
        .run(['math', 'multiply', '4', '7'])
        .expectSuccess()
        .expectOutput(/4 × 7 = 28/)

      const result = await mathScenario.execute('local')

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
    })

    it('should execute JSON output workflow', async () => {
      const jsonScenario = scenario('JSON Output')
        .step('Get JSON greeting')
        .run(['greet', 'Charlie', '--json'])
        .expectSuccess()
        .expectJson((json) => {
          expect(json.message).toBe('Hello, Charlie!')
          expect(json.count).toBe(1)
        })
        .step('Get JSON math result')
        .run(['math', 'add', '10', '20', '--json'])
        .expectSuccess()
        .expectJson((json) => {
          expect(json.operation).toBe('add')
          expect(json.result).toBe(30)
        })

      const result = await jsonScenario.execute('local')

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
    })

    it('should handle error scenarios', async () => {
      const errorScenario = scenario('Error Handling')
        .step('Generic error')
        .run(['error', 'generic'])
        .expectFailure()
        .expectStderr(/Generic error occurred/)
        .step('Validation error')
        .run(['error', 'validation'])
        .expectFailure()
        .expectStderr(/Validation error/)

      const result = await errorScenario.execute('local')

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
    })

    it('should execute complex workflow', async () => {
      const complexScenario = scenario('Complex Workflow')
        .step('Get help')
        .run(['--help'])
        .expectSuccess()
        .expectOutput(/playground/)
        .step('Greet user')
        .run(['greet', 'User'])
        .expectSuccess()
        .expectOutput(/Hello, User/)
        .step('Perform math')
        .run(['math', 'add', '10', '20'])
        .expectSuccess()
        .expectOutput(/10 \+ 20 = 30/)
        .step('Get info')
        .run(['info'])
        .expectSuccess()
        .expectOutput(/Playground CLI Information/)

      const result = await complexScenario.execute('local')

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(4)
    })
  })

  describe('Cleanroom Scenarios', () => {
    it('should execute cleanroom help scenario', async () => {
      const result = await scenarios.help('cleanroom').execute()

      expect(result.success).toBe(true)
      expect(result.result.stdout).toContain('playground')
    })

    it('should execute cleanroom version scenario', async () => {
      const result = await scenarios.version('cleanroom').execute()

      expect(result.success).toBe(true)
      expect(result.result.stdout).toMatch(/1\.0\.0/)
    })

    it('should execute complex cleanroom workflow', async () => {
      const cleanroomScenario = scenario('Cleanroom Workflow')
        .step('Get help in cleanroom')
        .run(['--help'])
        .expectSuccess()
        .expectOutput(/playground/)
        .step('Greet in cleanroom')
        .run(['greet', 'Cleanroom'])
        .expectSuccess()
        .expectOutput(/Hello, Cleanroom/)
        .step('Math in cleanroom')
        .run(['math', 'add', '15', '25'])
        .expectSuccess()
        .expectOutput(/15 \+ 25 = 40/)

      const result = await cleanroomScenario.execute('cleanroom')

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(3)
    })

    it('should execute JSON workflow in cleanroom', async () => {
      const jsonScenario = scenario('Cleanroom JSON Workflow')
        .step('JSON greeting')
        .run(['greet', 'Cleanroom', '--json'])
        .expectSuccess()
        .expectJson((json) => {
          expect(json.message).toBe('Hello, Cleanroom!')
        })
        .step('JSON math')
        .run(['math', 'multiply', '6', '7', '--json'])
        .expectSuccess()
        .expectJson((json) => {
          expect(json.operation).toBe('multiply')
          expect(json.result).toBe(42)
        })

      const result = await jsonScenario.execute('cleanroom')

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
    })
  })

  describe('Cross-Environment Consistency', () => {
    it('should produce consistent results between local and cleanroom', async () => {
      const localResult = await scenarios.version('local').execute()
      const cleanroomResult = await scenarios.version('cleanroom').execute()

      expect(localResult.success).toBe(true)
      expect(cleanroomResult.success).toBe(true)
      expect(localResult.result.stdout).toBe(cleanroomResult.result.stdout)
    })

    it('should handle JSON output consistently', async () => {
      const localResult = await scenarios.jsonOutput(['greet', 'Test', '--json'], 'local').execute()
      const cleanroomResult = await scenarios
        .jsonOutput(['greet', 'Test', '--json'], 'cleanroom')
        .execute()

      expect(localResult.success).toBe(true)
      expect(cleanroomResult.success).toBe(true)
      expect(localResult.result.json).toEqual(cleanroomResult.result.json)
    })

    it('should handle subcommands consistently', async () => {
      const localResult = await scenarios.subcommand('math', ['add', '5', '3'], 'local').execute()
      const cleanroomResult = await scenarios
        .subcommand('math', ['add', '5', '3'], 'cleanroom')
        .execute()

      expect(localResult.success).toBe(true)
      expect(cleanroomResult.success).toBe(true)
      expect(localResult.result.stdout).toBe(cleanroomResult.result.stdout)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle error cases', async () => {
      const result = await scenarios
        .errorCase(['error', 'generic'], /Generic error occurred/, 'local')
        .execute()

      expect(result.success).toBe(true)
    })

    it('should handle invalid commands', async () => {
      const result = await scenarios
        .errorCase(['invalid-command'], /Unknown command/, 'local')
        .execute()

      expect(result.success).toBe(true)
    })

    it('should handle missing arguments', async () => {
      const result = await scenarios.errorCase(['math', 'add'], /error/, 'local').execute()

      expect(result.success).toBe(true)
    })
  })
})
