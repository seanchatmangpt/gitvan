#!/usr/bin/env node

/**
 * Snapshot Testing Examples for Citty-Test-Utils
 *
 * This file demonstrates various snapshot testing patterns and usage examples.
 * Run with: node snapshot-examples.mjs
 */

import { runLocalCitty, scenario, scenarios, SnapshotManagerUtils } from '../src/index.js'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

async function createTestCli(content) {
  const tempDir = mkdtempSync(join(tmpdir(), 'citty-snapshot-example-'))
  const testCliPath = join(tempDir, 'test-cli.mjs')
  writeFileSync(testCliPath, content, 'utf8')
  return { tempDir, testCliPath }
}

async function cleanup(tempDir) {
  try {
    rmSync(tempDir, { recursive: true, force: true })
  } catch (error) {
    console.warn(`⚠️ Failed to cleanup ${tempDir}: ${error.message}`)
  }
}

async function basicSnapshotExample() {
  console.log('📸 Basic Snapshot Testing Example')
  console.log('================================')

  const { tempDir } = await createTestCli(`
console.log('USAGE: example-cli [options]')
console.log('OPTIONS:')
console.log('  --help     Show help')
console.log('  --version  Show version')
console.log('')
console.log('COMMANDS:')
console.log('  greet <name>  Greet someone')
console.log('  math <op>     Math operations')
`)

  try {
    // Test snapshot with help output
    const result = await runLocalCitty(['--help'], {
      cwd: tempDir,
      env: { TEST_CLI: 'true' },
    })

    result.expectSuccess().expectSnapshotStdout('basic-help')

    console.log('✅ Basic snapshot test completed')
  } finally {
    await cleanup(tempDir)
  }
}

async function scenarioSnapshotExample() {
  console.log('\n🎬 Scenario Snapshot Testing Example')
  console.log('===================================')

  const { tempDir } = await createTestCli(`
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log('USAGE: scenario-cli [options]')
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
`)

  try {
    const result = await scenario('Scenario snapshot example')
      .step('Get help')
      .run('--help', { cwd: tempDir, env: { TEST_CLI: 'true' } })
      .expectSuccess()
      .snapshot('scenario-help')
      .step('Get version')
      .run('--version', { cwd: tempDir, env: { TEST_CLI: 'true' } })
      .expectSuccess()
      .snapshot('scenario-version')
      .step('Get status')
      .run('--status', { cwd: tempDir, env: { TEST_CLI: 'true' } })
      .expectSuccess()
      .snapshot('scenario-status', { type: 'full' })
      .execute()

    console.log(`✅ Scenario snapshot test completed: ${result.success ? 'SUCCESS' : 'FAILED'}`)
  } finally {
    await cleanup(tempDir)
  }
}

async function snapshotTypesExample() {
  console.log('\n🔧 Snapshot Types Example')
  console.log('========================')

  const { tempDir } = await createTestCli(`
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log('USAGE: types-cli [options]')
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
`)

  try {
    // Test different snapshot types
    const stdoutResult = await runLocalCitty(['--help'], {
      cwd: tempDir,
      env: { TEST_CLI: 'true' },
    })
    stdoutResult.expectSuccess().expectSnapshotStdout('types-stdout')

    const stderrResult = await runLocalCitty(['invalid-command'], {
      cwd: tempDir,
      env: { TEST_CLI: 'true' },
    })
    stderrResult.expectFailure().expectSnapshotStderr('types-stderr')

    const jsonResult = await runLocalCitty(['--json'], {
      cwd: tempDir,
      env: { TEST_CLI: 'true' },
      json: true,
    })
    jsonResult.expectSuccess().expectSnapshotJson('types-json')

    const fullResult = await runLocalCitty(['--version'], {
      cwd: tempDir,
      env: { TEST_CLI: 'true' },
    })
    fullResult.expectSuccess().expectSnapshotFull('types-full')

    const outputResult = await runLocalCitty(['--help'], {
      cwd: tempDir,
      env: { TEST_CLI: 'true' },
    })
    outputResult.expectSuccess().expectSnapshotOutput('types-output')

    console.log('✅ All snapshot types tested successfully')
  } finally {
    await cleanup(tempDir)
  }
}

async function preBuiltScenariosExample() {
  console.log('\n🏗️ Pre-built Scenarios Example')
  console.log('==============================')

  const { tempDir } = await createTestCli(`
const args = process.argv.slice(2)

if (args.includes('--help')) {
  console.log('USAGE: scenarios-cli [options]')
  console.log('OPTIONS:')
  console.log('  --help     Show help')
  console.log('  --version  Show version')
} else if (args.includes('--version')) {
  console.log('1.0.0')
} else {
  console.log('Unknown command')
  process.exit(1)
}
`)

  try {
    // Test pre-built snapshot scenarios
    const helpResult = await scenarios.snapshotHelp('local').execute()
    console.log(`✅ Snapshot help scenario: ${helpResult.success ? 'SUCCESS' : 'FAILED'}`)

    const versionResult = await scenarios.snapshotVersion('local').execute()
    console.log(`✅ Snapshot version scenario: ${versionResult.success ? 'SUCCESS' : 'FAILED'}`)

    const errorResult = await scenarios.snapshotError('local').execute()
    console.log(`✅ Snapshot error scenario: ${errorResult.success ? 'SUCCESS' : 'FAILED'}`)

    const fullResult = await scenarios.snapshotFull('local').execute()
    console.log(`✅ Snapshot full scenario: ${fullResult.success ? 'SUCCESS' : 'FAILED'}`)

    const workflowResult = await scenarios.snapshotWorkflow('local').execute()
    console.log(`✅ Snapshot workflow scenario: ${workflowResult.success ? 'SUCCESS' : 'FAILED'}`)
  } finally {
    await cleanup(tempDir)
  }
}

async function snapshotManagementExample() {
  console.log('\n🛠️ Snapshot Management Example')
  console.log('==============================')

  const { tempDir } = await createTestCli(`
console.log('USAGE: management-cli [options]')
console.log('OPTIONS:')
console.log('  --help     Show help')
console.log('  --version  Show version')
`)

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
    console.log(`📁 Found ${snapshots.length} snapshots`)

    // Get snapshot statistics
    const stats = manager.getSnapshotStats(tempDir)
    console.log(`📊 Snapshot stats: ${stats.count} files, ${stats.totalSize} bytes`)

    // Validate snapshots
    const validation = manager.validateSnapshots(tempDir)
    const validCount = validation.filter((v) => v.valid).length
    console.log(`✅ Validation: ${validCount}/${validation.length} snapshots valid`)

    // Generate report
    const report = manager.generateReport(tempDir)
    console.log(`📋 Report generated: ${report.summary.totalSnapshots} snapshots`)
  } finally {
    await cleanup(tempDir)
  }
}

async function main() {
  console.log('🎯 Citty-Test-Utils Snapshot Testing Examples')
  console.log('==============================================')

  try {
    await basicSnapshotExample()
    await scenarioSnapshotExample()
    await snapshotTypesExample()
    await preBuiltScenariosExample()
    await snapshotManagementExample()

    console.log('\n🎉 All snapshot testing examples completed successfully!')
    console.log('\n💡 Key Takeaways:')
    console.log('   • Use expectSnapshotStdout() for command output')
    console.log('   • Use expectSnapshotStderr() for error messages')
    console.log('   • Use expectSnapshotJson() for structured data')
    console.log('   • Use expectSnapshotFull() for complete results')
    console.log('   • Use scenario DSL for multi-step workflows')
    console.log('   • Use pre-built scenarios for common patterns')
    console.log('   • Use snapshot management utilities for maintenance')
  } catch (error) {
    console.error('❌ Example failed:', error.message)
    process.exit(1)
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
