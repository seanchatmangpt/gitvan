import { spawn } from 'node:child_process'
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

    let projectRoot, cliPath, cliArgs

    if (useTestCli) {
      // Use the test CLI for integration testing
      projectRoot = cwd
      cliPath = join(projectRoot, 'test-cli.mjs')
      cliArgs = ['test-cli.mjs', ...args]
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
      cliArgs = ['src/cli.mjs', ...args]
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

    const proc = spawn('node', cliArgs, {
      cwd: projectRoot,
      env: envVars,
    })

    let stdout = ''
    let stderr = ''
    let timeoutId

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        proc.kill('SIGTERM')
        reject(new Error(`Command timed out after ${timeout}ms`))
      }, timeout)
    }

    proc.stdout.on('data', (d) => (stdout += d))
    proc.stderr.on('data', (d) => (stderr += d))

    proc.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId)

      const result = {
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        args,
        cwd: projectRoot,
        json: json ? safeJsonParse(stdout) : undefined,
      }

      // Wrap in expectations layer
      const wrappedResult = wrapExpectation(result)
      resolve(wrappedResult)
    })

    proc.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId)
      reject(new Error(`Process spawn failed: ${error.message}`))
    })
  })
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (error) {
    return undefined // Return undefined instead of throwing
  }
}
