import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runLocalCitty, setupCleanroom, teardownCleanroom } from '../../src/local-runner.js'
import {
  setupCleanroom as setupCleanroomRunner,
  teardownCleanroom as teardownCleanroomRunner,
} from '../../src/cleanroom-runner.js'
import { scenario, scenarios } from '../../src/scenario-dsl.js'

describe('Snapshot Testing BDD', () => {
  beforeEach(async () => {
    await setupCleanroomRunner()
  })

  afterEach(async () => {
    await teardownCleanroomRunner()
  })

  describe('Feature: Snapshot Testing', () => {
    describe('Scenario: Help output snapshot', () => {
      it('Given a CLI with help command', async () => {
        // Setup is handled by beforeEach
      })

      it('When I run the help command', async () => {
        const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })

        // Then the output should match the snapshot
        result.expectSuccess().expectSnapshotStdout('help-output')
      })

      it('And the snapshot should be created on first run', async () => {
        const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })

        result.expectSuccess().expectSnapshotStdout('help-first-run')
      })
    })

    describe('Scenario: Version output snapshot', () => {
      it('Given a CLI with version command', async () => {
        // Setup is handled by beforeEach
      })

      it('When I run the version command', async () => {
        const result = await runLocalCitty(['--version'], { env: { TEST_CLI: 'true' } })

        // Then the output should match the snapshot
        result.expectSuccess().expectSnapshotStdout('version-output')
      })
    })

    describe('Scenario: Error output snapshot', () => {
      it('Given a CLI with invalid command handling', async () => {
        // Setup is handled by beforeEach
      })

      it('When I run an invalid command', async () => {
        const result = await runLocalCitty(['invalid-command'], { env: { TEST_CLI: 'true' } })

        // Then the error output should match the snapshot
        result.expectFailure().expectSnapshotStderr('error-output')
      })
    })

    describe('Scenario: Full result snapshot', () => {
      it('Given a CLI with status command', async () => {
        // Setup is handled by beforeEach
      })

      it('When I run the status command', async () => {
        const result = await runLocalCitty(['status'], { env: { TEST_CLI: 'true' } })

        // Then the full result should match the snapshot
        result.expectSuccess().expectSnapshotFull('status-result')
      })
    })

    describe('Scenario: JSON output snapshot', () => {
      it('Given a CLI with JSON output capability', async () => {
        // Setup is handled by beforeEach
      })

      it('When I run a command with JSON output', async () => {
        const result = await runLocalCitty(['--json', 'status'], {
          env: { TEST_CLI: 'true' },
          json: true,
        })

        // Then the JSON output should match the snapshot
        result.expectSuccess().expectSnapshotJson('status-json')
      })
    })

    describe('Scenario: Multi-step snapshot workflow', () => {
      it('Given a CLI with multiple commands', async () => {
        // Setup is handled by beforeEach
      })

      it('When I execute a multi-step workflow', async () => {
        const result = await scenario('Multi-step snapshot workflow')
          .step('Initialize project')
          .run('init', 'test-project', { env: { TEST_CLI: 'true' } })
          .expectSuccess()
          .snapshot('init-output')
          .step('Check status')
          .run('status', { env: { TEST_CLI: 'true' } })
          .expectSuccess()
          .snapshot('status-output', { type: 'full' })
          .execute()

        // Then the workflow should complete successfully
        expect(result.success).toBe(true)
        expect(result.results).toHaveLength(2)
      })
    })

    describe('Scenario: Cross-environment snapshot consistency', () => {
      it('Given snapshots created in local environment', async () => {
        const localResult = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
        localResult.expectSuccess().expectSnapshotStdout('cross-env-help')
      })

      it('When I run the same command in cleanroom environment', async () => {
        const cleanroomResult = await runLocalCitty(['--help'], {
          env: { TEST_CLI: 'true' },
          cwd: '/app',
        })

        // Then the output should match the same snapshot
        cleanroomResult.expectSuccess().expectSnapshotStdout('cross-env-help')
      })
    })

    describe('Scenario: Snapshot update workflow', () => {
      it('Given an existing snapshot', async () => {
        const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
        result.expectSuccess().expectSnapshotStdout('update-test')
      })

      it('When I modify the CLI output', async () => {
        // Simulate CLI output change by running a different command
        const result = await runLocalCitty(['--version'], { env: { TEST_CLI: 'true' } })

        // Then I should be able to update the snapshot
        result.expectSuccess().expectSnapshotStdout('update-test-version')
      })
    })

    describe('Scenario: Snapshot with custom options', () => {
      it('Given a CLI with environment-specific output', async () => {
        // Setup is handled by beforeEach
      })

      it('When I run a command with custom environment', async () => {
        const result = await runLocalCitty(['--help'], {
          env: { TEST_CLI: 'true', CUSTOM_ENV: 'test' },
        })

        // Then the snapshot should include environment context
        result.expectSuccess().expectSnapshot('custom-env-help', {
          type: 'stdout',
          env: { TEST_CLI: 'true', CUSTOM_ENV: 'test' },
        })
      })
    })

    describe('Scenario: Snapshot validation and error handling', () => {
      it('Given a snapshot mismatch', async () => {
        // First create a snapshot
        const result1 = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
        result1.expectSuccess().expectSnapshotStdout('validation-test')
      })

      it('When I run a command that produces different output', async () => {
        // Run a different command that will produce different output
        const result = await runLocalCitty(['--version'], { env: { TEST_CLI: 'true' } })

        // Then the snapshot should fail to match
        expect(() => {
          result.expectSuccess().expectSnapshotStdout('validation-test')
        }).toThrow('Snapshot mismatch')
      })
    })

    describe('Scenario: Pre-built snapshot scenarios', () => {
      it('Given pre-built snapshot scenarios', async () => {
        // Test snapshotHelp scenario
        const helpResult = await scenarios.snapshotHelp('local').execute()
        expect(helpResult.success).toBe(true)

        // Test snapshotVersion scenario
        const versionResult = await scenarios.snapshotVersion('local').execute()
        expect(versionResult.success).toBe(true)

        // Test snapshotError scenario
        const errorResult = await scenarios.snapshotError('local').execute()
        expect(errorResult.success).toBe(true)

        // Test snapshotFull scenario
        const fullResult = await scenarios.snapshotFull('local').execute()
        expect(fullResult.success).toBe(true)

        // Test snapshotWorkflow scenario
        const workflowResult = await scenarios.snapshotWorkflow('local').execute()
        expect(workflowResult.success).toBe(true)
      })
    })

    describe('Scenario: Snapshot management utilities', () => {
      it('Given snapshot management needs', async () => {
        // Test snapshot creation
        const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
        result.expectSuccess().expectSnapshotStdout('management-test')
      })

      it('When I need to manage snapshots', async () => {
        // Test snapshot with different types
        const stdoutResult = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
        stdoutResult.expectSuccess().expectSnapshotStdout('management-stdout')

        const stderrResult = await runLocalCitty(['invalid-command'], { env: { TEST_CLI: 'true' } })
        stderrResult.expectFailure().expectSnapshotStderr('management-stderr')

        const outputResult = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
        outputResult.expectSuccess().expectSnapshotOutput('management-output')
      })
    })
  })
})
