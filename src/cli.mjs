#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'pathe'
import { GitVanDaemon, startDaemon } from './runtime/daemon.mjs'
import { discoverEvents, loadEventDefinition } from './runtime/events.mjs'
import { readReceiptsRange } from './runtime/receipt.mjs'
import { useGit } from './composables/git.mjs'
import { runJobWithContext } from './runtime/boot.mjs'
import { loadConfig } from './runtime/config.mjs'

const commands = {
  daemon: handleDaemon,
  run: handleRun,
  list: handleList,
  event: handleEvent,
  schedule: handleSchedule,
  worktree: handleWorktree,
  job: handleJob,
  help: handleHelp
}

async function main() {
  const [,, command, ...args] = process.argv

  if (!command || command === 'help') {
    handleHelp()
    return
  }

  const handler = commands[command]
  if (!handler) {
    console.error(`Unknown command: ${command}`)
    handleHelp()
    process.exit(1)
  }

  try {
    await handler(...args)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

async function handleDaemon(action = 'start', ...options) {
  const worktreePath = process.cwd()

  // Parse options
  const opts = {}
  for (let i = 0; i < options.length; i += 2) {
    const key = options[i]?.replace(/^--/, '')
    const value = options[i + 1]
    if (key) opts[key] = value
  }

  switch (action) {
    case 'start':
      if (opts.worktrees === 'all') {
        console.log('Starting daemon for all worktrees...')
        await startDaemon({ rootDir: worktreePath }, null, 'all')
      } else {
        const daemon = new GitVanDaemon(worktreePath)
        await daemon.start()
      }
      break
    case 'stop':
      const daemon = new GitVanDaemon(worktreePath)
      daemon.stop()
      break
    case 'status':
      const statusDaemon = new GitVanDaemon(worktreePath)
      console.log(`Daemon ${statusDaemon.isRunning() ? 'running' : 'not running'} for: ${worktreePath}`)
      break
    default:
      console.error(`Unknown daemon action: ${action}`)
      process.exit(1)
  }
}

async function handleEvent(action = 'list') {
  const config = await loadConfig()
  const eventsDir = join(process.cwd(), config.events.directory)

  switch (action) {
    case 'list':
      const events = discoverEvents(eventsDir)
      if (events.length === 0) {
        console.log('No events found')
        return
      }

      console.log('\nDiscovered Events:')
      console.log('==================')
      for (const event of events) {
        console.log(`${event.id}`)
        console.log(`  Type: ${event.type}`)
        console.log(`  Pattern: ${event.pattern}`)
        console.log(`  File: ${event.file}`)
        console.log()
      }
      break
    default:
      console.error(`Unknown event action: ${action}`)
      process.exit(1)
  }
}

async function handleSchedule(action = 'apply') {
  switch (action) {
    case 'apply':
      console.log('Schedule management not yet implemented')
      // TODO: Implement cron-like scheduling
      break
    default:
      console.error(`Unknown schedule action: ${action}`)
      process.exit(1)
  }
}

async function handleWorktree(action = 'list') {
  switch (action) {
    case 'list':
      try {
        // We need to create a minimal context for Git operations
        const ctx = {
          root: process.cwd(),
          env: process.env,
          now: () => new Date().toISOString()
        }

        const { withGitVan } = await import('./composables/ctx.mjs')
        await withGitVan(ctx, async () => {
          const git = useGit()
          const worktrees = git.listWorktrees()

          if (worktrees.length === 0) {
            console.log('No worktrees found')
            return
          }

          console.log('\nWorktrees:')
          console.log('==========')
          for (const wt of worktrees) {
            console.log(`${wt.path} ${wt.isMain ? '(main)' : ''}`)
            console.log(`  Branch: ${wt.branch || 'detached'}`)
            if (wt.head) console.log(`  HEAD: ${wt.head.slice(0, 8)}`)
            console.log()
          }
        })
      } catch (err) {
        console.error('Error listing worktrees:', err.message)
      }
      break
    default:
      console.error(`Unknown worktree action: ${action}`)
      process.exit(1)
  }
}

async function handleJob(action = 'list', ...args) {
  switch (action) {
    case 'list':
      console.log('Job listing not yet implemented')
      // TODO: Discover and list available jobs
      break
    case 'run':
      const nameIndex = args.indexOf('--name')
      if (nameIndex === -1 || !args[nameIndex + 1]) {
        console.error('Job name required: gitvan job run --name <job-name>')
        process.exit(1)
      }
      const jobName = args[nameIndex + 1]
      console.log(`Running job: ${jobName}`)
      // TODO: Implement job execution
      break
    default:
      console.error(`Unknown job action: ${action}`)
      process.exit(1)
  }
}

async function handleRun(jobName) {
  if (!jobName) {
    console.error('Job name required')
    process.exit(1)
  }

  const worktreePath = process.cwd()
  const jobsDir = join(worktreePath, 'jobs')
  const jobPath = findJobFile(jobsDir, jobName)

  if (!jobPath) {
    console.error(`Job not found: ${jobName}`)
    process.exit(1)
  }

  const jobMod = await import(`file://${jobPath}`)
  const ctx = {
    root: worktreePath,
    env: process.env,
    now: () => new Date().toISOString()
  }

  console.log(`Running job: ${jobName}`)
  const result = await runJobWithContext(ctx, jobMod)
  console.log('Result:', JSON.stringify(result, null, 2))
}

function handleList() {
  const worktreePath = process.cwd()
  const jobsDir = join(worktreePath, 'jobs')

  if (!statSync(jobsDir).isDirectory()) {
    console.log('No jobs directory found')
    return
  }

  const jobs = findAllJobs(jobsDir)
  console.log('Available jobs:')
  jobs.forEach(job => console.log(`  ${job}`))
}

function handleHelp() {
  console.log(`
GitVan v2 - AI-powered Git workflow automation

Usage:
  gitvan daemon [start|stop|status] [--worktrees all]    Manage daemon
  gitvan job [list|run] [--name <job-name>]              Job management
  gitvan event list                                      List discovered events
  gitvan schedule apply                                  Apply scheduled tasks
  gitvan worktree list                                   List all worktrees
  gitvan run <job-name>                                  Run a specific job (legacy)
  gitvan list                                            List available jobs (legacy)
  gitvan help                                            Show this help

Examples:
  gitvan daemon start                                    Start daemon for current worktree
  gitvan daemon start --worktrees all                   Start daemon for all worktrees
  gitvan job run --name docs:changelog                  Run changelog generation job
  gitvan event list                                     Show all discovered events
  gitvan worktree list                                  Show all repository worktrees
`)
}

function findJobFile(jobsDir, jobName) {
  const possiblePaths = [
    join(jobsDir, `${jobName}.mjs`),
    join(jobsDir, `${jobName}.js`),
    join(jobsDir, jobName, 'index.mjs'),
    join(jobsDir, jobName, 'index.js')
  ]

  for (const path of possiblePaths) {
    try {
      if (statSync(path).isFile()) {
        return path
      }
    } catch (err) {
      // File doesn't exist, continue
    }
  }

  return null
}

function findAllJobs(dir, prefix = '') {
  const jobs = []

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        jobs.push(...findAllJobs(fullPath, prefix ? `${prefix}/${entry}` : entry))
      } else if (stat.isFile() && ['.mjs', '.js'].includes(extname(entry))) {
        const jobName = prefix ? `${prefix}/${entry.replace(/\.(mjs|js)$/, '')}` : entry.replace(/\.(mjs|js)$/, '')
        jobs.push(jobName)
      }
    }
  } catch (err) {
    // Directory doesn't exist or is not accessible
  }

  return jobs
}

export { main }

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}