// vendors/citty-test-utils/scenarios.js
import { runLocalCitty } from './local-runner.js'
import { runCitty } from './cleanroom-runner.js'

// tiny runner selector
async function exec(env, args, opts = {}) {
  const options = { ...opts }
  if (env === 'local') {
    options.env = { ...options.env, TEST_CLI: 'true' }
    // For local execution, we need to set the correct working directory
    // Try to detect if we're in a playground test and set cwd accordingly
    if (!options.cwd) {
      // Check if we're running from playground tests
      const stack = new Error().stack
      if (stack.includes('playground/test/')) {
        // Extract playground directory from stack trace
        const lines = stack.split('\n')
        for (const line of lines) {
          if (line.includes('playground/test/')) {
            const match = line.match(/\((.+?\/playground)\/test\//)
            if (match) {
              options.cwd = match[1]
              break
            }
          }
        }
      }
      // Fallback to process.cwd() if not in playground
      if (!options.cwd) {
        options.cwd = process.cwd()
      }
    }
  }
  return env === 'cleanroom' ? runCitty(args, options) : runLocalCitty(args, options)
}

export const scenarios = {
  help(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['--help'])
        r.expectSuccess().expectOutput(/USAGE|COMMANDS/i)
        // Don't check for no stderr as there might be deprecation warnings
        return { success: true, result: r.result }
      },
    }
  },

  version(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['--version'])
        r.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
        // Don't check for no stderr as there might be deprecation warnings
        return { success: true, result: r.result }
      },
    }
  },

  invalidCommand(cmd = 'nope', env = 'local') {
    return {
      async execute() {
        const r = await exec(env, [cmd])
        // Check that command failed (non-zero exit code)
        if (r.result.exitCode === 0) {
          throw new Error('Expected failure but command succeeded')
        }
        // Check for error message in output
        const out = r.result.stdout + r.result.stderr
        if (!/unknown|invalid|not found|error/i.test(out)) {
          throw new Error(`Unexpected error text: ${out}`)
        }
        return { success: true }
      },
    }
  },

  initProject(name, env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['init'])
        r.expectSuccess().expectOutput(/GitVan project initialization complete/i)
        // Don't check for no stderr as there might be deprecation warnings
        return { success: true, result: r.result }
      },
    }
  },

  configGet(key, env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['config', 'get', key], { json: true })
        r.expectSuccess().expectJson((j) => {
          if (j.key !== key) throw new Error('wrong key')
        })
        return { success: true, result: r.result }
      },
    }
  },

  configSet(key, value, env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['config', 'set', key, value])
        r.expectSuccess().expectOutput(new RegExp(key))
        // Don't check for no stderr as there might be deprecation warnings
        return { success: true, result: r.result }
      },
    }
  },

  subcommand(cmd, args = [], env = 'local') {
    return {
      async execute() {
        const r = await exec(env, [cmd, ...args])
        r.expectExit(0)
        return { success: true, result: r.result }
      },
    }
  },

  jsonOutput(args, env = 'local') {
    return {
      async execute() {
        const r = await exec(env, args, { json: true })
        r.expectSuccess().expectJson(() => {})
        return { success: true, result: r.result }
      },
    }
  },

  fileGenerated(args, expectPath, env = 'local') {
    return {
      async execute() {
        const r = await exec(env, args)
        r.expectSuccess()
        // simple check: CLI echoes generated path
        r.expectOutput(new RegExp(expectPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        return { success: true, result: r.result }
      },
    }
  },

  idempotent(args, env = 'local') {
    return {
      async execute() {
        const r1 = await exec(env, args)
        r1.expectSuccess()
        const r2 = await exec(env, args)
        // second run should not error
        r2.expectExit(0)
        return { success: true, results: [r1.result, r2.result] }
      },
    }
  },

  concurrent(runs, env = 'local') {
    return {
      async execute() {
        const results = await Promise.all(
          runs.map((r) =>
            exec(env, r.args, r.opts).then(
              (ok) => ({ ok: true, res: ok }),
              (err) => ({ ok: false, err })
            )
          )
        )
        const allOk = results.every((x) => x.ok)
        if (!allOk) {
          const first = results.find((x) => !x.ok)
          throw new Error(`Concurrent run failed: ${first.err.stderr || first.err.stdout}`)
        }
        return { success: true, results: results.map((x) => x.res.result) }
      },
    }
  },

  // Default concurrent execution for multiple operations
  async executeConcurrent(operations, env = 'local') {
    const results = await Promise.all(
      operations.map(async (op) => {
        if (typeof op === 'string') {
          // Simple command string
          return await exec(env, op.split(' '))
        } else if (Array.isArray(op)) {
          // Command array
          return await exec(env, op)
        } else if (op.args) {
          // Command object with args and options
          return await exec(env, op.args, op.opts || {})
        } else {
          throw new Error('Invalid operation format')
        }
      })
    )
    return { success: true, results }
  },

  interactive(script, env = 'local') {
    // Assumes CLI reads from stdin; local-runner would need a stdin-enabled variant if not present
    return {
      async execute() {
        const r = await exec(env, ['--interactive'], { stdin: script })
        r.expectExit(0)
        return { success: true, result: r.result }
      },
    }
  },

  errorCase(args, msgOrRe, env = 'local') {
    return {
      async execute() {
        const r = await exec(env, args)
        // Check that command failed (non-zero exit code)
        if (r.result.exitCode === 0) {
          throw new Error('Expected failure but command succeeded')
        }
        // Check for error message in output
        const out = r.result.stdout + r.result.stderr
        const ok = typeof msgOrRe === 'string' ? out.includes(msgOrRe) : msgOrRe.test(out)
        if (!ok) throw new Error(`Missing expected error: ${msgOrRe}\nGot:\n${out}`)
        return { success: true }
      },
    }
  },

  // Snapshot testing scenarios
  snapshotHelp(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['--help'])
        r.expectSuccess().expectSnapshotStdout('help-output')
        return { success: true, result: r.result }
      },
    }
  },

  snapshotVersion(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['--version'])
        r.expectSuccess().expectSnapshotStdout('version-output')
        return { success: true, result: r.result }
      },
    }
  },

  snapshotError(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['invalid-command'])
        r.expectFailure().expectSnapshotStderr('error-output')
        return { success: true, result: r.result }
      },
    }
  },

  snapshotFull(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['status'])
        r.expectSuccess().expectSnapshotFull('status-result')
        return { success: true, result: r.result }
      },
    }
  },

  snapshotWorkflow(env = 'local') {
    return {
      async execute() {
        // Initialize project
        const initResult = await exec(env, ['init', 'test-project'])
        initResult.expectSuccess().expectSnapshotStdout('init-output')

        // Check status
        const statusResult = await exec(env, ['status'])
        statusResult.expectSuccess().expectSnapshotFull('status-output')

        return {
          success: true,
          results: [initResult.result, statusResult.result],
        }
      },
    }
  },

  snapshotJson(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['--json', 'status'], { json: true })
        r.expectSuccess().expectSnapshotJson('status-json')
        return { success: true, result: r.result }
      },
    }
  },

  snapshotOutput(env = 'local') {
    return {
      async execute() {
        const r = await exec(env, ['--help'])
        r.expectSuccess().expectSnapshotOutput('help-combined')
        return { success: true, result: r.result }
      },
    }
  },
}
