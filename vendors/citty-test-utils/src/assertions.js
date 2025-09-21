import { matchSnapshot, snapshotUtils } from './snapshot.js'

export function wrapExpectation(result) {
  // Use the actual command that was executed
  const actualCommand = result.command || 'node src/cli.mjs'

  return {
    result,
    expectExit(code) {
      if (result.exitCode !== code) {
        throw new Error(
          `Expected exit code ${code}, got ${result.exitCode}\n` +
            `Command: ${actualCommand} ${result.args.join(' ')}\n` +
            `Working directory: ${result.cwd}\n` +
            `Stdout: ${result.stdout}\n` +
            `Stderr: ${result.stderr}`
        )
      }
      return this
    },
    expectOutput(match) {
      const ok =
        typeof match === 'string' ? result.stdout.includes(match) : match.test(result.stdout)
      if (!ok)
        throw new Error(
          `Expected stdout to match ${match}, got: ${result.stdout}\n` +
            `Command: ${actualCommand} ${result.args.join(' ')}`
        )
      return this
    },
    expectStderr(match) {
      const ok =
        typeof match === 'string' ? result.stderr.includes(match) : match.test(result.stderr)
      if (!ok)
        throw new Error(
          `Expected stderr to match ${match}, got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      return this
    },
    expectJson(fn) {
      if (!result.json) throw new Error('No JSON output available')
      if (fn) fn(result.json)
      return this
    },
    expectSuccess() {
      return this.expectExit(0)
    },
    expectFailure() {
      if (result.exitCode === 0) {
        throw new Error(
          `Expected command to fail, but it succeeded\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}\n` +
            `Output: ${result.stdout}`
        )
      }
      return this
    },
    expectNoOutput() {
      if (result.stdout.trim()) {
        throw new Error(
          `Expected no output, got: ${result.stdout}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      }
      return this
    },
    expectNoStderr() {
      if (result.stderr.trim()) {
        throw new Error(
          `Expected no stderr, got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      }
      return this
    },
    expectOutputLength(minLength, maxLength) {
      const length = result.stdout.length
      if (length < minLength || (maxLength && length > maxLength)) {
        throw new Error(
          `Expected output length between ${minLength} and ${
            maxLength || 'unlimited'
          }, got ${length}\n` + `Output: ${result.stdout}`
        )
      }
      return this
    },
    expectStderrLength(minLength, maxLength) {
      const length = result.stderr.length
      if (length < minLength || (maxLength && length > maxLength)) {
        throw new Error(
          `Expected stderr length between ${minLength} and ${
            maxLength || 'unlimited'
          }, got ${length}\n` + `Stderr: ${result.stderr}`
        )
      }
      return this
    },
    expectExitCodeIn(codes) {
      if (!Array.isArray(codes)) {
        throw new Error('Expected codes to be an array')
      }
      if (!codes.includes(result.exitCode)) {
        throw new Error(
          `Expected exit code to be one of [${codes.join(', ')}], got ${result.exitCode}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}\n` +
            `Stdout: ${result.stdout}\n` +
            `Stderr: ${result.stderr}`
        )
      }
      return this
    },
    expectOutputContains(text) {
      if (!result.stdout.includes(text)) {
        throw new Error(
          `Expected stdout to contain "${text}", got: ${result.stdout}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      }
      return this
    },
    expectStderrContains(text) {
      if (!result.stderr.includes(text)) {
        throw new Error(
          `Expected stderr to contain "${text}", got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      }
      return this
    },
    expectOutputNotContains(text) {
      if (result.stdout.includes(text)) {
        throw new Error(
          `Expected stdout to not contain "${text}", got: ${result.stdout}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      }
      return this
    },
    expectStderrNotContains(text) {
      if (result.stderr.includes(text)) {
        throw new Error(
          `Expected stderr to not contain "${text}", got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      }
      return this
    },
    expectDuration(maxDuration) {
      if (result.duration && result.duration > maxDuration) {
        throw new Error(
          `Expected command to complete within ${maxDuration}ms, took ${result.duration}ms\n` +
            `Command: node src/cli.mjs ${result.args.join(' ')}`
        )
      }
      return this
    },

    // Snapshot testing methods
    expectSnapshot(snapshotName, options = {}) {
      const testFile = options.testFile || getCallerFile()
      const snapshotType = options.type || 'stdout'
      const snapshotData = snapshotUtils.createSnapshotFromResult(result, snapshotType)

      const snapshotResult = matchSnapshot(snapshotData, testFile, snapshotName, {
        args: result.args,
        env: options.env,
        cwd: result.cwd,
        ...options,
      })

      if (!snapshotResult.match) {
        throw new Error(snapshotResult.error || `Snapshot mismatch: ${snapshotName}`)
      }

      if (snapshotResult.created) {
        console.log(`✅ Created snapshot: ${snapshotName}`)
      } else if (snapshotResult.updated) {
        console.log(`✅ Updated snapshot: ${snapshotName}`)
      }

      return this
    },

    expectSnapshotStdout(snapshotName, options = {}) {
      return this.expectSnapshot(snapshotName, { ...options, type: 'stdout' })
    },

    expectSnapshotStderr(snapshotName, options = {}) {
      return this.expectSnapshot(snapshotName, { ...options, type: 'stderr' })
    },

    expectSnapshotJson(snapshotName, options = {}) {
      return this.expectSnapshot(snapshotName, { ...options, type: 'json' })
    },

    expectSnapshotFull(snapshotName, options = {}) {
      return this.expectSnapshot(snapshotName, { ...options, type: 'full' })
    },

    expectSnapshotOutput(snapshotName, options = {}) {
      return this.expectSnapshot(snapshotName, { ...options, type: 'output' })
    },
  }
}

// Helper function to get caller file for snapshot testing
function getCallerFile() {
  const stack = new Error().stack
  const lines = stack.split('\n')

  // Find the first line that's not from this file
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('.test.') || line.includes('.spec.')) {
      const match = line.match(/\((.+):\d+:\d+\)/)
      if (match) {
        return match[1]
      }
    }
  }

  // Fallback to current working directory
  return process.cwd()
}
