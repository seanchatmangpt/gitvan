import { GenericContainer } from 'testcontainers'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
let singleton

async function checkDockerAvailable() {
  try {
    await execAsync('docker --version')
    return true
  } catch (error) {
    return false
  }
}

export async function setupCleanroom({ rootDir = '.', nodeImage = 'node:20-alpine' } = {}) {
  if (!singleton) {
    // Check Docker availability first
    const dockerAvailable = await checkDockerAvailable()
    if (!dockerAvailable) {
      throw new Error('Docker is not available. Please ensure Docker is installed and running.')
    }

    try {
      const container = await new GenericContainer(nodeImage)
        .withCopyDirectoriesToContainer([{ source: rootDir, target: '/app' }])
        .withWorkingDir('/app')
        .withCommand(['sleep', 'infinity'])
        .start()

      singleton = { container }
    } catch (error) {
      throw new Error(
        `Failed to setup cleanroom: ${error.message}. Make sure Docker is running and accessible.`
      )
    }
  }
  return singleton
}

export async function runCitty(
  args,
  { json = false, cwd = '/app', timeout = 10000, env = {} } = {}
) {
  if (!singleton) throw new Error('Cleanroom not initialized. Call setupCleanroom first.')

  try {
    // Check if we should use the test CLI
    const useTestCli = env.TEST_CLI === 'true'
    const cliPath = useTestCli ? 'src/cli.mjs' : 'src/cli.mjs' // Fixed: always use src/cli.mjs for playground

    const { exitCode, output, stderr } = await singleton.container.exec(
      ['node', cliPath, ...args],
      { workdir: cwd }
    )

    const result = {
      exitCode,
      stdout: output.trim(),
      stderr: stderr.trim(),
      args,
      cwd,
      json: json
        ? safeJsonParse(output)
        : args.includes('--json')
        ? safeJsonParse(output)
        : undefined,
    }

    // Wrap in expectations layer
    const { wrapExpectation } = await import('./assertions.js')
    return wrapExpectation(result)
  } catch (error) {
    // Handle container execution errors
    throw new Error(`Cleanroom execution failed: ${error.message}`)
  }
}

export async function teardownCleanroom() {
  if (singleton) {
    await singleton.container.stop()
    singleton = null
  }
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (error) {
    return undefined // Return undefined instead of throwing
  }
}
