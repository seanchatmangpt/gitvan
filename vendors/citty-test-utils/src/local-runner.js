import { spawn, exec } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { wrapExpectation } from './assertions.js'

export function runLocalCitty(
  args,
  { cwd = process.cwd(), json = false, timeout = 5000, env = {} } = {}
) {
  return new Promise((resolve, reject) => {
    // Check if we should use the test CLI
    const useTestCli = env.TEST_CLI === 'true'

    let projectRoot, cliPath, command

    if (useTestCli) {
      // Use the test CLI for integration testing
      projectRoot = cwd
      // Check for test-cli.mjs first, then src/cli.mjs, then simple-test-cli.mjs
      const testCliPath = join(projectRoot, 'test-cli.mjs')
      const srcCliPath = join(projectRoot, 'src', 'cli.mjs')
      const simpleCliPath = join(projectRoot, 'simple-test-cli.mjs')

      if (existsSync(testCliPath)) {
        cliPath = testCliPath
        command = `node test-cli.mjs ${args.join(' ')}`
      } else if (existsSync(srcCliPath)) {
        cliPath = srcCliPath
        command = `node src/cli.mjs ${args.join(' ')}`
      } else if (existsSync(simpleCliPath)) {
        cliPath = simpleCliPath
        command = `node simple-test-cli.mjs ${args.join(' ')}`
      } else {
        reject(new Error(`No CLI found. Checked: ${testCliPath}, ${srcCliPath}, ${simpleCliPath}`))
        return
      }
    } else {
      // Find the GitVan project root by looking for package.json with "gitvan" name
      projectRoot = cwd
      while (projectRoot !== dirname(projectRoot)) {
        const packageJsonPath = join(projectRoot, 'package.json')
        if (existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
            if (packageJson.name === 'gitvan') {
              break
            }
          } catch (e) {
            // Continue searching
          }
        }
        projectRoot = dirname(projectRoot)
      }

      // Validate CLI path
      cliPath = join(projectRoot, 'src', 'cli.mjs')
      command = `node src/cli.mjs ${args.join(' ')}`
    }

    if (!existsSync(cliPath)) {
      reject(new Error(`CLI not found at ${cliPath}`))
      return
    }

    const envVars = {
      ...process.env,
      ...env,
      // Override test mode for CLI testing - these must come last to override everything
      NODE_ENV: 'development',
      GITVAN_TEST_MODE: 'false',
    }

    // Check if we're in a test environment and use spawn instead of exec
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

    if (isTestEnv) {
      // Use spawn for test environment to avoid vitest interference
      const child = spawn('node', [cliPath.split('/').pop(), ...args], {
        cwd: projectRoot,
        env: envVars,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        const result = {
          exitCode: code || 0,
          stdout: (stdout || '').trim(),
          stderr: (stderr || '').trim(),
          args,
          cwd: projectRoot,
          command: command,
          json: json
            ? safeJsonParse(stdout)
            : args.includes('--json')
            ? safeJsonParse(stdout)
            : undefined,
        }

        // Wrap in expectations layer
        const wrappedResult = wrapExpectation(result)
        resolve(wrappedResult)
      })

      child.on('error', (error) => {
        reject(error)
      })

      // Set timeout
      if (timeout > 0) {
        setTimeout(() => {
          child.kill()
          reject(new Error(`Command timed out after ${timeout}ms`))
        }, timeout)
      }
    } else {
      // Use exec for non-test environments
      exec(
        command,
        {
          cwd: projectRoot,
          env: envVars,
          timeout: timeout > 0 ? timeout : undefined,
        },
        (error, stdout, stderr) => {
          const result = {
            exitCode: error ? error.code || 1 : 0,
            stdout: (stdout || '').trim(),
            stderr: (stderr || '').trim(),
            args,
            cwd: projectRoot,
            command: command,
            json: json
              ? safeJsonParse(stdout)
              : args.includes('--json')
              ? safeJsonParse(stdout)
              : undefined,
          }

          // Wrap in expectations layer
          const wrappedResult = wrapExpectation(result)

          if (error) {
            reject(error)
          } else {
            resolve(wrappedResult)
          }
        }
      )
    }
  })
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (error) {
    return undefined // Return undefined instead of throwing
  }
}
