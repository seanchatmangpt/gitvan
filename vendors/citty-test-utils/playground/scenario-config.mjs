// playground/scenario-config.mjs
import { runLocalCitty, runCitty } from 'citty-test-utils'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Get the playground directory path
const __filename = fileURLToPath(import.meta.url)
const playgroundDir = dirname(__filename)

// Create playground-specific scenarios with correct working directory
export const scenarios = {
  help(env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
        }
        const result = await exec(['--help'], options)
        result.expectSuccess().expectOutput(/USAGE|COMMANDS/i)
        return { success: true, result: result.result }
      },
    }
  },

  version(env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
        }
        const result = await exec(['--version'], options)
        result.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
        return { success: true, result: result.result }
      },
    }
  },

  invalidCommand(cmd = 'nonexistent', env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
        }
        const result = await exec([cmd], options)
        result.expectFailure()
        return { success: true, result: result.result }
      },
    }
  },

  jsonOutput(args, env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
          json: true,
        }
        const result = await exec(args, options)
        result.expectSuccess().expectJson(() => {})
        return { success: true, result: result.result }
      },
    }
  },

  subcommand(cmd, args = [], env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
        }
        const result = await exec([cmd, ...args], options)
        result.expectSuccess()
        return { success: true, result: result.result }
      },
    }
  },

  idempotent(args, env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
        }

        const result1 = await exec(args, options)
        const result2 = await exec(args, options)

        result1.expectSuccess()
        result2.expectSuccess()

        if (result1.result.stdout !== result2.result.stdout) {
          throw new Error('Idempotent operation produced different outputs')
        }

        return { success: true, results: [result1.result, result2.result] }
      },
    }
  },

  concurrent(runs, env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
        }

        const promises = runs.map((run) => exec(run.args, { ...options, ...run.opts }))
        const results = await Promise.all(promises)

        results.forEach((result) => result.expectSuccess())

        return { success: true, results: results.map((r) => r.result) }
      },
    }
  },

  errorCase(args, msgOrRe, env = 'local') {
    return {
      async execute() {
        const exec = env === 'cleanroom' ? runCitty : runLocalCitty
        const options = {
          cwd: env === 'cleanroom' ? undefined : playgroundDir,
          env: { TEST_CLI: 'true' },
        }
        const result = await exec(args, options)
        result.expectFailure()
        if (msgOrRe) {
          result.expectStderr(msgOrRe)
        }
        return { success: true, result: result.result }
      },
    }
  },
}
