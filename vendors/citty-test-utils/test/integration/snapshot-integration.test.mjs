import { describe, it, expect } from 'vitest'
import { runLocalCitty } from '../../src/local-runner.js'
import { scenario } from '../../src/scenario-dsl.js'

describe('Snapshot Testing Integration', () => {
  it('should work with snapshot assertions', async () => {
    // Create a simple test CLI that produces predictable output
    const testCliContent = `
console.log('USAGE: test-cli [options]')
console.log('OPTIONS:')
console.log('  --help     Show help')
console.log('  --version  Show version')
console.log('  --json     Output JSON')
console.log('')
console.log('COMMANDS:')
console.log('  greet <name>  Greet someone')
console.log('  math <op>     Math operations')
`

    // Write test CLI to a temporary location
    const { writeFileSync, mkdtempSync } = await import('node:fs')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')

    const tempDir = mkdtempSync(join(tmpdir(), 'citty-snapshot-demo-'))
    const testCliPath = join(tempDir, 'test-cli.mjs')
    writeFileSync(testCliPath, testCliContent, 'utf8')

    try {
      // Test snapshot with help output
      const result = await runLocalCitty(['--help'], {
        cwd: tempDir,
        env: { TEST_CLI: 'true' },
      })

      result.expectSuccess().expectSnapshotStdout('help-output')

      // Test snapshot with version output
      const versionCliContent = `
console.log('1.0.0')
`
      writeFileSync(testCliPath, versionCliContent, 'utf8')

      const versionResult = await runLocalCitty(['--version'], {
        cwd: tempDir,
        env: { TEST_CLI: 'true' },
      })

      versionResult.expectSuccess().expectSnapshotStdout('version-output')
    } finally {
      // Clean up
      const { rmSync } = await import('node:fs')
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should work with scenario snapshot testing', async () => {
    // Create a simple test CLI
    const testCliContent = `
console.log('USAGE: test-cli [options]')
console.log('OPTIONS:')
console.log('  --help     Show help')
console.log('  --version  Show version')
`

    const { writeFileSync, mkdtempSync } = await import('node:fs')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')

    const tempDir = mkdtempSync(join(tmpdir(), 'citty-snapshot-scenario-'))
    const testCliPath = join(tempDir, 'test-cli.mjs')
    writeFileSync(testCliPath, testCliContent, 'utf8')

    try {
      const result = await scenario('Snapshot scenario test')
        .step('Get help')
        .run('--help', { cwd: tempDir, env: { TEST_CLI: 'true' } })
        .expectSuccess()
        .expectSnapshotStdout('scenario-help')
        .execute()

      expect(result.success).toBe(true)
    } finally {
      // Clean up
      const { rmSync } = await import('node:fs')
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should work with snapshot steps', async () => {
    // Create a simple test CLI
    const testCliContent = `
console.log('USAGE: test-cli [options]')
console.log('OPTIONS:')
console.log('  --help     Show help')
console.log('  --version  Show version')
`

    const { writeFileSync, mkdtempSync } = await import('node:fs')
    const { join } = await import('node:path')
    const { tmpdir } = await import('node:os')

    const tempDir = mkdtempSync(join(tmpdir(), 'citty-snapshot-step-'))
    const testCliPath = join(tempDir, 'test-cli.mjs')
    writeFileSync(testCliPath, testCliContent, 'utf8')

    try {
      const result = await scenario('Snapshot step test')
        .step('Get help')
        .run('--help', { cwd: tempDir, env: { TEST_CLI: 'true' } })
        .expectSuccess()
        .snapshot('step-help')
        .execute()

      expect(result.success).toBe(true)
    } finally {
      // Clean up
      const { rmSync } = await import('node:fs')
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
