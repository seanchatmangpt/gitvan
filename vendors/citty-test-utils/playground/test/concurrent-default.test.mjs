import { describe, it, expect } from 'vitest'
import { scenario, concurrentScenario } from 'citty-test-utils'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the playground directory path
const __filename = fileURLToPath(import.meta.url)
const playgroundDir = join(dirname(__filename), '..')

describe('Concurrent Default Execution', () => {
  it('should execute steps concurrently when concurrent() is called', async () => {
    const startTime = Date.now()

    const result = await scenario('Concurrent Test')
      .concurrent()
      .step('Greet Alice')
      .run(['greet', 'Alice'])
      .expectSuccess()
      .step('Greet Bob')
      .run(['greet', 'Bob'])
      .expectSuccess()
      .step('Math Operation')
      .run(['math', 'add', '5', '3'])
      .expectSuccess()
      .execute('local')

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(result.success).toBe(true)
    expect(result.concurrent).toBe(true)
    expect(result.results).toHaveLength(3)
    expect(duration).toBeLessThan(200) // Should be fast due to concurrency
    console.log(`⏱️ Concurrent execution took ${duration}ms`)
  })

  it('should execute steps sequentially by default', async () => {
    const startTime = Date.now()

    const result = await scenario('Sequential Test')
      .step('Greet Alice')
      .run(['greet', 'Alice'])
      .expectSuccess()
      .step('Greet Bob')
      .run(['greet', 'Bob'])
      .expectSuccess()
      .step('Math Operation')
      .run(['math', 'add', '5', '3'])
      .expectSuccess()
      .execute('local')

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(result.success).toBe(true)
    expect(result.concurrent).toBe(false)
    expect(result.results).toHaveLength(3)
    console.log(`⏱️ Sequential execution took ${duration}ms`)
  })

  it('should use concurrentScenario factory for default concurrent execution', async () => {
    const startTime = Date.now()

    // Using the concurrentScenario factory
    const result = await concurrentScenario('Factory Concurrent Test')
      .step('Greet Alice')
      .run(['greet', 'Alice'])
      .expectSuccess()
      .step('Greet Bob')
      .run(['greet', 'Bob'])
      .expectSuccess()
      .step('Math Operation')
      .run(['math', 'add', '5', '3'])
      .expectSuccess()
      .execute('local')

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(result.success).toBe(true)
    expect(result.concurrent).toBe(true)
    expect(result.results).toHaveLength(3)
    expect(duration).toBeLessThan(200) // Should be fast due to concurrency
    console.log(`⏱️ Factory concurrent execution took ${duration}ms`)
  })

  it('should handle mixed concurrent and sequential execution', async () => {
    const startTime = Date.now()

    const result = await scenario('Mixed Execution Test')
      .concurrent()
      .step('Concurrent Step 1')
      .run(['greet', 'Alice'])
      .expectSuccess()
      .step('Concurrent Step 2')
      .run(['greet', 'Bob'])
      .expectSuccess()
      .sequential() // Switch back to sequential
      .step('Sequential Step')
      .run(['math', 'add', '5', '3'])
      .expectSuccess()
      .execute('local')

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(3)
    console.log(`⏱️ Mixed execution took ${duration}ms`)
  })

  it('should work with cleanroom (Docker) concurrent execution', async () => {
    const startTime = Date.now()

    // Setup cleanroom environment first
    const { setupCleanroom, teardownCleanroom } = await import('citty-test-utils')
    await setupCleanroom({ rootDir: '.', timeout: 60000 })

    try {
      const result = await concurrentScenario('Cleanroom Concurrent Test')
        .step('Greet Alice in Docker')
        .run(['greet', 'Alice'])
        .expectSuccess()
        .step('Greet Bob in Docker')
        .run(['greet', 'Bob'])
        .expectSuccess()
        .step('Math Operation in Docker')
        .run(['math', 'add', '5', '3'])
        .expectSuccess()
        .execute('cleanroom')

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.success).toBe(true)
      expect(result.concurrent).toBe(true)
      expect(result.results).toHaveLength(3)
      console.log(`⏱️ Cleanroom concurrent execution took ${duration}ms`)
    } finally {
      await teardownCleanroom()
    }
  })
})
