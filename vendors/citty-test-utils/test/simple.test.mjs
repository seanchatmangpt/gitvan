import { describe, it, expect } from 'vitest'
import { runLocalCitty } from '../index.js'

describe('Simple Test', () => {
  it('should work', async () => {
    const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
    expect(result.result.exitCode).toBe(0)
    expect(result.result.stdout).toContain('USAGE')
  })
})
