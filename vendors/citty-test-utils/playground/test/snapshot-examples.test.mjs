import { describe, it, expect } from 'vitest'
import { runLocalCitty, scenario, scenarios } from '../../src/local-runner.js'
import { scenario as scenarioDSL, scenarios as scenariosDSL } from '../../src/scenario-dsl.js'

describe('Playground Snapshot Examples', () => {
  describe('Basic Snapshot Testing', () => {
    it('should demonstrate basic snapshot testing', async () => {
      // Create a simple test CLI that produces predictable output
      const testCliContent = `
console.log('USAGE: playground-cli [options]')
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

      const tempDir = mkdtempSync(join(tmpdir(), 'citty-playground-snapshot-'))
      const testCliPath = join(tempDir, 'test-cli.mjs')
      writeFileSync(testCliPath, testCliContent, 'utf8')

      try {
        // Test snapshot with help output
        const result = await runLocalCitty(['--help'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })

        result.expectSuccess().expectSnapshotStdout('playground-help')

        // Test snapshot with version output
        const versionCliContent = `
console.log('1.0.0')
`
        writeFileSync(testCliPath, versionCliContent, 'utf8')

        const versionResult = await runLocalCitty(['--version'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })

        versionResult.expectSuccess().expectSnapshotStdout('playground-version')
      } finally {
        // Clean up
        const { rmSync } = await import('node:fs')
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('Scenario Snapshot Testing', () => {
    it('should demonstrate scenario-based snapshot testing', async () => {
      // Create a simple test CLI
      const testCliContent = `
console.log('USAGE: playground-cli [options]')
console.log('OPTIONS:')
console.log('  --help     Show help')
console.log('  --version  Show version')
`

      const { writeFileSync, mkdtempSync } = await import('node:fs')
      const { join } = await import('node:path')
      const { tmpdir } = await import('node:os')

      const tempDir = mkdtempSync(join(tmpdir(), 'citty-playground-scenario-'))
      const testCliPath = join(tempDir, 'test-cli.mjs')
      writeFileSync(testCliPath, testCliContent, 'utf8')

      try {
        const result = await scenarioDSL('Playground scenario snapshot test')
          .step('Get help')
          .run('--help', { cwd: tempDir, env: { TEST_CLI: 'true' } })
          .expectSuccess()
          .expectSnapshotStdout('playground-scenario-help')
          .execute()

        expect(result.success).toBe(true)
      } finally {
        // Clean up
        const { rmSync } = await import('node:fs')
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('Multi-step Snapshot Workflow', () => {
    it('should demonstrate multi-step snapshot workflow', async () => {
      // Create a test CLI with multiple commands
      const testCliContent = `
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log('USAGE: playground-cli [options]')
  console.log('OPTIONS:')
  console.log('  --help     Show help')
  console.log('  --version  Show version')
  console.log('  --status   Show status')
} else if (args.includes('--version')) {
  console.log('1.0.0')
} else if (args.includes('--status')) {
  console.log('Status: Running')
  console.log('Version: 1.0.0')
  console.log('Environment: test')
} else {
  console.log('Unknown command')
  process.exit(1)
}
`

      const { writeFileSync, mkdtempSync } = await import('node:fs')
      const { join } = await import('node:path')
      const { tmpdir } = await import('node:os')

      const tempDir = mkdtempSync(join(tmpdir(), 'citty-playground-workflow-'))
      const testCliPath = join(tempDir, 'test-cli.mjs')
      writeFileSync(testCliPath, testCliContent, 'utf8')

      try {
        const result = await scenarioDSL('Playground multi-step snapshot workflow')
          .step('Get help')
          .run('--help', { cwd: tempDir, env: { TEST_CLI: 'true' } })
          .expectSuccess()
          .snapshot('workflow-help')
          .step('Get version')
          .run('--version', { cwd: tempDir, env: { TEST_CLI: 'true' } })
          .expectSuccess()
          .snapshot('workflow-version')
          .step('Get status')
          .run('--status', { cwd: tempDir, env: { TEST_CLI: 'true' } })
          .expectSuccess()
          .snapshot('workflow-status', { type: 'full' })
          .execute()

        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(3)
      } finally {
        // Clean up
        const { rmSync } = await import('node:fs')
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('Pre-built Snapshot Scenarios', () => {
    it('should demonstrate pre-built snapshot scenarios', async () => {
      // Create a test CLI
      const testCliContent = `
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log('USAGE: playground-cli [options]')
  console.log('OPTIONS:')
  console.log('  --help     Show help')
  console.log('  --version  Show version')
} else if (args.includes('--version')) {
  console.log('1.0.0')
} else {
  console.log('Unknown command')
  process.exit(1)
}
`

      const { writeFileSync, mkdtempSync } = await import('node:fs')
      const { join } = await import('node:path')
      const { tmpdir } = await import('node:os')

      const tempDir = mkdtempSync(join(tmpdir(), 'citty-playground-scenarios-'))
      const testCliPath = join(tempDir, 'test-cli.mjs')
      writeFileSync(testCliPath, testCliContent, 'utf8')

      try {
        // Test snapshotHelp scenario
        const helpResult = await scenariosDSL.snapshotHelp('local').execute()
        expect(helpResult.success).toBe(true)

        // Test snapshotVersion scenario
        const versionResult = await scenariosDSL.snapshotVersion('local').execute()
        expect(versionResult.success).toBe(true)

        // Test snapshotError scenario
        const errorResult = await scenariosDSL.snapshotError('local').execute()
        expect(errorResult.success).toBe(true)
      } finally {
        // Clean up
        const { rmSync } = await import('node:fs')
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('Snapshot Types Demonstration', () => {
    it('should demonstrate different snapshot types', async () => {
      // Create a test CLI with different output types
      const testCliContent = `
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log('USAGE: playground-cli [options]')
  console.log('OPTIONS:')
  console.log('  --help     Show help')
  console.log('  --version  Show version')
  console.log('  --json     Output JSON')
} else if (args.includes('--version')) {
  console.log('1.0.0')
} else if (args.includes('--json')) {
  console.log(JSON.stringify({ version: '1.0.0', status: 'running' }))
} else {
  console.error('Unknown command')
  process.exit(1)
}
`

      const { writeFileSync, mkdtempSync } = await import('node:fs')
      const { join } = await import('node:path')
      const { tmpdir } = await import('node:os')

      const tempDir = mkdtempSync(join(tmpdir(), 'citty-playground-types-'))
      const testCliPath = join(tempDir, 'test-cli.mjs')
      writeFileSync(testCliPath, testCliContent, 'utf8')

      try {
        // Test stdout snapshot
        const stdoutResult = await runLocalCitty(['--help'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })
        stdoutResult.expectSuccess().expectSnapshotStdout('types-stdout')

        // Test stderr snapshot
        const stderrResult = await runLocalCitty(['invalid-command'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })
        stderrResult.expectFailure().expectSnapshotStderr('types-stderr')

        // Test JSON snapshot
        const jsonResult = await runLocalCitty(['--json'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
          json: true,
        })
        jsonResult.expectSuccess().expectSnapshotJson('types-json')

        // Test full result snapshot
        const fullResult = await runLocalCitty(['--version'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })
        fullResult.expectSuccess().expectSnapshotFull('types-full')

        // Test combined output snapshot
        const outputResult = await runLocalCitty(['--help'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })
        outputResult.expectSuccess().expectSnapshotOutput('types-output')
      } finally {
        // Clean up
        const { rmSync } = await import('node:fs')
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })

  describe('Snapshot Management Examples', () => {
    it('should demonstrate snapshot management utilities', async () => {
      const { SnapshotManagerUtils } = await import('../../src/snapshot-management.js')

      // Create a test CLI
      const testCliContent = `
console.log('USAGE: playground-cli [options]')
console.log('OPTIONS:')
console.log('  --help     Show help')
console.log('  --version  Show version')
`

      const { writeFileSync, mkdtempSync } = await import('node:fs')
      const { join } = await import('node:path')
      const { tmpdir } = await import('node:os')

      const tempDir = mkdtempSync(join(tmpdir(), 'citty-playground-management-'))
      const testCliPath = join(tempDir, 'test-cli.mjs')
      writeFileSync(testCliPath, testCliContent, 'utf8')

      try {
        // Create some snapshots
        const result1 = await runLocalCitty(['--help'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })
        result1.expectSuccess().expectSnapshotStdout('management-help')

        const result2 = await runLocalCitty(['--version'], {
          cwd: tempDir,
          env: { TEST_CLI: 'true' },
        })
        result2.expectSuccess().expectSnapshotStdout('management-version')

        // Test snapshot management utilities
        const manager = new SnapshotManagerUtils()

        // List snapshots
        const snapshots = manager.listSnapshots(tempDir)
        expect(snapshots.length).toBeGreaterThan(0)

        // Get snapshot statistics
        const stats = manager.getSnapshotStats(tempDir)
        expect(stats.count).toBeGreaterThan(0)
        expect(stats.totalSize).toBeGreaterThan(0)

        // Validate snapshots
        const validation = manager.validateSnapshots(tempDir)
        expect(validation.length).toBeGreaterThan(0)
        expect(validation.every((v) => v.valid)).toBe(true)

        // Generate report
        const report = manager.generateReport(tempDir)
        expect(report.summary.totalSnapshots).toBeGreaterThan(0)
        expect(report.summary.validSnapshots).toBeGreaterThan(0)
      } finally {
        // Clean up
        const { rmSync } = await import('node:fs')
        rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })
})
