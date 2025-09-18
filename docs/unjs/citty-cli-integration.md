# GitVan CLI Migration to citty - Comprehensive Implementation Guide

This guide shows how to refactor GitVan's current CLI implementation to use [citty](https://github.com/unjs/citty), UnJS's elegant command-line interface builder with full TypeScript support.

## Table of Contents
1. [Current CLI Architecture](#current-cli-architecture)
2. [Migration Overview](#migration-overview)
3. [Basic citty Setup](#basic-citty-setup)
4. [Command Structure Refactoring](#command-structure-refactoring)
5. [Type Safety Implementation](#type-safety-implementation)
6. [Integration with Composables](#integration-with-composables)
7. [Error Handling & User Feedback](#error-handling--user-feedback)
8. [Testing the Migration](#testing-the-migration)
9. [Advanced Features](#advanced-features)

## Current CLI Architecture

GitVan's current CLI (`src/cli.mjs`) uses a simple command mapping pattern:

```javascript
// Current implementation
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
```

## Migration Overview

citty provides:
- **Declarative command definitions** with `defineCommand`
- **Automatic help generation** and validation
- **Type-safe arguments** and options
- **Nested subcommands** support
- **Built-in error handling**
- **Auto-completion** capabilities

## Basic citty Setup

### 1. Create New CLI Entry Point

Create `src/cli-v2.mjs` with citty integration:

```javascript
#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

// Import command handlers
import { daemonCommand } from './commands/daemon.mjs'
import { jobCommand } from './commands/job.mjs'
import { eventCommand } from './commands/event.mjs'
import { worktreeCommand } from './commands/worktree.mjs'
import { scheduleCommand } from './commands/schedule.mjs'

const main = defineCommand({
  meta: {
    name: 'gitvan',
    version: '2.0.0',
    description: 'GitVan v2 - AI-powered Git workflow automation with composables and Nunjucks templates'
  },
  subCommands: {
    daemon: daemonCommand,
    job: jobCommand,
    event: eventCommand,
    worktree: worktreeCommand,
    schedule: scheduleCommand
  }
})

export { main }

if (import.meta.url === `file://${process.argv[1]}`) {
  runMain(main)
}
```

### 2. Update bin/gitvan.mjs

```javascript
#!/usr/bin/env node
import { main } from '../src/cli-v2.mjs'
import { runMain } from 'citty'

runMain(main)
```

## Command Structure Refactoring

### 1. Daemon Command (`src/commands/daemon.mjs`)

**Before (current implementation):**
```javascript
async function handleDaemon(action = 'start', ...options) {
  const worktreePath = process.cwd()

  // Manual option parsing
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
    // ... other cases
  }
}
```

**After (citty implementation):**
```javascript
import { defineCommand } from 'citty'
import { GitVanDaemon, startDaemon } from '../runtime/daemon.mjs'

export const daemonCommand = defineCommand({
  meta: {
    name: 'daemon',
    description: 'Manage GitVan daemon process'
  },
  subCommands: {
    start: defineCommand({
      meta: {
        name: 'start',
        description: 'Start the GitVan daemon'
      },
      args: {
        worktree: {
          type: 'string',
          description: 'Worktree path (defaults to current directory)',
          default: process.cwd()
        }
      },
      options: {
        worktrees: {
          type: 'string',
          description: 'Start daemon for all worktrees',
          valueHint: 'all'
        },
        detach: {
          type: 'boolean',
          description: 'Run daemon in background',
          default: false
        },
        port: {
          type: 'string',
          description: 'Daemon port',
          default: '3000'
        }
      },
      async run({ args, options }) {
        console.log(`Starting GitVan daemon...`)
        console.log(`Worktree: ${args.worktree}`)

        if (options.worktrees === 'all') {
          console.log('Starting daemon for all worktrees...')
          await startDaemon({ rootDir: args.worktree }, null, 'all')
        } else {
          const daemon = new GitVanDaemon(args.worktree, {
            detach: options.detach,
            port: options.port
          })
          await daemon.start()
        }

        console.log(`✅ Daemon started successfully`)
      }
    }),

    stop: defineCommand({
      meta: {
        name: 'stop',
        description: 'Stop the GitVan daemon'
      },
      args: {
        worktree: {
          type: 'string',
          description: 'Worktree path (defaults to current directory)',
          default: process.cwd()
        }
      },
      async run({ args }) {
        console.log(`Stopping GitVan daemon for: ${args.worktree}`)
        const daemon = new GitVanDaemon(args.worktree)
        await daemon.stop()
        console.log(`✅ Daemon stopped successfully`)
      }
    }),

    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show daemon status'
      },
      args: {
        worktree: {
          type: 'string',
          description: 'Worktree path (defaults to current directory)',
          default: process.cwd()
        }
      },
      options: {
        json: {
          type: 'boolean',
          description: 'Output as JSON',
          default: false
        }
      },
      async run({ args, options }) {
        const daemon = new GitVanDaemon(args.worktree)
        const isRunning = daemon.isRunning()
        const status = {
          running: isRunning,
          worktree: args.worktree,
          pid: isRunning ? daemon.getPid() : null,
          uptime: isRunning ? daemon.getUptime() : null
        }

        if (options.json) {
          console.log(JSON.stringify(status, null, 2))
        } else {
          console.log(`Daemon ${status.running ? '🟢 running' : '🔴 not running'} for: ${args.worktree}`)
          if (status.running) {
            console.log(`PID: ${status.pid}`)
            console.log(`Uptime: ${status.uptime}`)
          }
        }
      }
    })
  }
})
```

### 2. Job Command (`src/commands/job.mjs`)

```javascript
import { defineCommand } from 'citty'
import { join, extname } from 'pathe'
import { readdirSync, statSync } from 'node:fs'
import { runJobWithContext } from '../runtime/boot.mjs'

export const jobCommand = defineCommand({
  meta: {
    name: 'job',
    description: 'Manage and execute GitVan jobs'
  },
  subCommands: {
    list: defineCommand({
      meta: {
        name: 'list',
        description: 'List all available jobs'
      },
      options: {
        directory: {
          type: 'string',
          description: 'Jobs directory path',
          default: './jobs'
        },
        format: {
          type: 'string',
          description: 'Output format',
          default: 'table',
          valueHint: 'table|json|simple'
        }
      },
      async run({ options }) {
        const jobsDir = join(process.cwd(), options.directory)

        try {
          const jobs = findAllJobs(jobsDir)

          if (jobs.length === 0) {
            console.log(`No jobs found in ${jobsDir}`)
            return
          }

          switch (options.format) {
            case 'json':
              console.log(JSON.stringify(jobs, null, 2))
              break
            case 'simple':
              jobs.forEach(job => console.log(job))
              break
            default: // table
              console.log('\n📋 Available Jobs:')
              console.log('==================')
              jobs.forEach(job => console.log(`  ${job}`))
              console.log(`\nFound ${jobs.length} job(s) in ${options.directory}`)
          }
        } catch (err) {
          throw new Error(`Failed to list jobs: ${err.message}`)
        }
      }
    }),

    run: defineCommand({
      meta: {
        name: 'run',
        description: 'Execute a specific job'
      },
      args: {
        name: {
          type: 'string',
          description: 'Job name to execute',
          required: true
        }
      },
      options: {
        directory: {
          type: 'string',
          description: 'Jobs directory path',
          default: './jobs'
        },
        dry: {
          type: 'boolean',
          description: 'Dry run mode - show what would be executed',
          default: false
        },
        verbose: {
          type: 'boolean',
          description: 'Enable verbose output',
          default: false
        }
      },
      async run({ args, options }) {
        const worktreePath = process.cwd()
        const jobsDir = join(worktreePath, options.directory)
        const jobPath = findJobFile(jobsDir, args.name)

        if (!jobPath) {
          throw new Error(`Job not found: ${args.name}`)
        }

        if (options.dry) {
          console.log(`🔍 Dry run mode - would execute:`)
          console.log(`Job: ${args.name}`)
          console.log(`Path: ${jobPath}`)
          console.log(`Directory: ${options.directory}`)
          return
        }

        console.log(`🚀 Running job: ${args.name}`)
        if (options.verbose) {
          console.log(`📁 Job path: ${jobPath}`)
        }

        try {
          const jobMod = await import(`file://${jobPath}`)
          const ctx = {
            root: worktreePath,
            env: process.env,
            now: () => new Date().toISOString(),
            verbose: options.verbose
          }

          const result = await runJobWithContext(ctx, jobMod)

          console.log(`✅ Job completed successfully`)
          if (options.verbose || result) {
            console.log('Result:', JSON.stringify(result, null, 2))
          }
        } catch (err) {
          throw new Error(`Job execution failed: ${err.message}`)
        }
      }
    }),

    info: defineCommand({
      meta: {
        name: 'info',
        description: 'Show detailed information about a job'
      },
      args: {
        name: {
          type: 'string',
          description: 'Job name',
          required: true
        }
      },
      options: {
        directory: {
          type: 'string',
          description: 'Jobs directory path',
          default: './jobs'
        }
      },
      async run({ args, options }) {
        const jobsDir = join(process.cwd(), options.directory)
        const jobPath = findJobFile(jobsDir, args.name)

        if (!jobPath) {
          throw new Error(`Job not found: ${args.name}`)
        }

        try {
          const jobMod = await import(`file://${jobPath}`)
          const stat = statSync(jobPath)

          console.log(`\n📄 Job Information: ${args.name}`)
          console.log('='.repeat(30 + args.name.length))
          console.log(`Path: ${jobPath}`)
          console.log(`Size: ${(stat.size / 1024).toFixed(2)} KB`)
          console.log(`Modified: ${stat.mtime.toISOString()}`)

          if (jobMod.meta) {
            console.log('\n📋 Metadata:')
            console.log(`  Description: ${jobMod.meta.description || 'N/A'}`)
            console.log(`  Author: ${jobMod.meta.author || 'N/A'}`)
            console.log(`  Version: ${jobMod.meta.version || 'N/A'}`)
          }

          if (jobMod.schema) {
            console.log('\n⚙️  Configuration Schema:')
            console.log(JSON.stringify(jobMod.schema, null, 2))
          }
        } catch (err) {
          throw new Error(`Failed to load job info: ${err.message}`)
        }
      }
    })
  }
})

// Helper functions (extracted from current CLI)
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
```

### 3. Event Command (`src/commands/event.mjs`)

```javascript
import { defineCommand } from 'citty'
import { join } from 'pathe'
import { discoverEvents, loadEventDefinition } from '../runtime/events.mjs'
import { loadConfig } from '../runtime/config.mjs'

export const eventCommand = defineCommand({
  meta: {
    name: 'event',
    description: 'Manage GitVan events and triggers'
  },
  subCommands: {
    list: defineCommand({
      meta: {
        name: 'list',
        description: 'List all discovered events'
      },
      options: {
        format: {
          type: 'string',
          description: 'Output format',
          default: 'detailed',
          valueHint: 'detailed|simple|json'
        },
        type: {
          type: 'string',
          description: 'Filter by event type',
          valueHint: 'file|git|schedule|manual'
        }
      },
      async run({ options }) {
        try {
          const config = await loadConfig()
          const eventsDir = join(process.cwd(), config.events.directory)
          const events = discoverEvents(eventsDir)

          // Filter by type if specified
          const filteredEvents = options.type
            ? events.filter(e => e.type === options.type)
            : events

          if (filteredEvents.length === 0) {
            const typeFilter = options.type ? ` of type '${options.type}'` : ''
            console.log(`No events found${typeFilter}`)
            return
          }

          switch (options.format) {
            case 'json':
              console.log(JSON.stringify(filteredEvents, null, 2))
              break
            case 'simple':
              filteredEvents.forEach(event => console.log(event.id))
              break
            default: // detailed
              console.log('\n🎯 Discovered Events:')
              console.log('===================')
              for (const event of filteredEvents) {
                console.log(`\n📝 ${event.id}`)
                console.log(`   Type: ${event.type}`)
                console.log(`   Pattern: ${event.pattern || 'N/A'}`)
                console.log(`   File: ${event.file}`)
                if (event.description) {
                  console.log(`   Description: ${event.description}`)
                }
              }
              console.log(`\nFound ${filteredEvents.length} event(s)`)
          }
        } catch (err) {
          throw new Error(`Failed to list events: ${err.message}`)
        }
      }
    }),

    info: defineCommand({
      meta: {
        name: 'info',
        description: 'Show detailed information about a specific event'
      },
      args: {
        id: {
          type: 'string',
          description: 'Event ID',
          required: true
        }
      },
      async run({ args }) {
        try {
          const config = await loadConfig()
          const eventsDir = join(process.cwd(), config.events.directory)
          const events = discoverEvents(eventsDir)

          const event = events.find(e => e.id === args.id)
          if (!event) {
            throw new Error(`Event not found: ${args.id}`)
          }

          // Load full event definition
          const definition = await loadEventDefinition(event.file)

          console.log(`\n🎯 Event Details: ${event.id}`)
          console.log('='.repeat(20 + event.id.length))
          console.log(`Type: ${event.type}`)
          console.log(`Pattern: ${event.pattern || 'N/A'}`)
          console.log(`File: ${event.file}`)

          if (definition.meta) {
            console.log('\n📋 Metadata:')
            Object.entries(definition.meta).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`)
            })
          }

          if (definition.triggers) {
            console.log('\n⚡ Triggers:')
            definition.triggers.forEach((trigger, i) => {
              console.log(`  ${i + 1}. ${trigger.name || 'Unnamed'}`)
              if (trigger.condition) {
                console.log(`     Condition: ${trigger.condition}`)
              }
            })
          }
        } catch (err) {
          throw new Error(`Failed to get event info: ${err.message}`)
        }
      }
    })
  }
})
```

### 4. Worktree Command (`src/commands/worktree.mjs`)

```javascript
import { defineCommand } from 'citty'
import { useGit } from '../composables/git.mjs'
import { withGitVan } from '../composables/ctx.mjs'

export const worktreeCommand = defineCommand({
  meta: {
    name: 'worktree',
    description: 'Manage Git worktrees'
  },
  subCommands: {
    list: defineCommand({
      meta: {
        name: 'list',
        description: 'List all Git worktrees'
      },
      options: {
        format: {
          type: 'string',
          description: 'Output format',
          default: 'table',
          valueHint: 'table|json|paths'
        },
        verbose: {
          type: 'boolean',
          description: 'Show detailed information',
          default: false
        }
      },
      async run({ options }) {
        try {
          const ctx = {
            root: process.cwd(),
            env: process.env,
            now: () => new Date().toISOString()
          }

          await withGitVan(ctx, async () => {
            const git = useGit()
            const worktrees = git.listWorktrees()

            if (worktrees.length === 0) {
              console.log('No worktrees found')
              return
            }

            switch (options.format) {
              case 'json':
                console.log(JSON.stringify(worktrees, null, 2))
                break
              case 'paths':
                worktrees.forEach(wt => console.log(wt.path))
                break
              default: // table
                console.log('\n🌳 Git Worktrees:')
                console.log('================')
                for (const wt of worktrees) {
                  const mainIndicator = wt.isMain ? ' (main)' : ''
                  console.log(`📁 ${wt.path}${mainIndicator}`)
                  console.log(`   Branch: ${wt.branch || 'detached'}`)

                  if (wt.head) {
                    console.log(`   HEAD: ${wt.head.slice(0, 8)}`)
                  }

                  if (options.verbose && wt.status) {
                    console.log(`   Status: ${wt.status}`)
                  }
                  console.log()
                }
                console.log(`Found ${worktrees.length} worktree(s)`)
            }
          })
        } catch (err) {
          throw new Error(`Failed to list worktrees: ${err.message}`)
        }
      }
    })
  }
})
```

### 5. Schedule Command (`src/commands/schedule.mjs`)

```javascript
import { defineCommand } from 'citty'

export const scheduleCommand = defineCommand({
  meta: {
    name: 'schedule',
    description: 'Manage scheduled tasks'
  },
  subCommands: {
    list: defineCommand({
      meta: {
        name: 'list',
        description: 'List all scheduled tasks'
      },
      options: {
        format: {
          type: 'string',
          description: 'Output format',
          default: 'table',
          valueHint: 'table|json'
        }
      },
      async run({ options }) {
        console.log('📅 Schedule listing not yet implemented')
        // TODO: Implement schedule listing
      }
    }),

    add: defineCommand({
      meta: {
        name: 'add',
        description: 'Add a new scheduled task'
      },
      args: {
        expression: {
          type: 'string',
          description: 'Cron expression (e.g., "0 9 * * *")',
          required: true
        },
        job: {
          type: 'string',
          description: 'Job name to execute',
          required: true
        }
      },
      options: {
        name: {
          type: 'string',
          description: 'Schedule name'
        },
        enabled: {
          type: 'boolean',
          description: 'Enable schedule immediately',
          default: true
        }
      },
      async run({ args, options }) {
        console.log(`📅 Adding schedule: ${args.expression} -> ${args.job}`)
        console.log(`Name: ${options.name || 'auto-generated'}`)
        console.log(`Enabled: ${options.enabled}`)
        console.log('Schedule management not yet implemented')
        // TODO: Implement schedule addition
      }
    }),

    remove: defineCommand({
      meta: {
        name: 'remove',
        description: 'Remove a scheduled task'
      },
      args: {
        name: {
          type: 'string',
          description: 'Schedule name to remove',
          required: true
        }
      },
      async run({ args }) {
        console.log(`📅 Removing schedule: ${args.name}`)
        console.log('Schedule management not yet implemented')
        // TODO: Implement schedule removal
      }
    })
  }
})
```

## Type Safety Implementation

### 1. Create TypeScript Definitions (`types/cli.d.ts`)

```typescript
import { CommandDef } from 'citty'

// Command argument types
export interface DaemonStartArgs {
  worktree: string
}

export interface DaemonStartOptions {
  worktrees?: string
  detach?: boolean
  port?: string
}

export interface JobRunArgs {
  name: string
}

export interface JobRunOptions {
  directory?: string
  dry?: boolean
  verbose?: boolean
}

export interface EventListOptions {
  format?: 'detailed' | 'simple' | 'json'
  type?: 'file' | 'git' | 'schedule' | 'manual'
}

export interface WorktreeListOptions {
  format?: 'table' | 'json' | 'paths'
  verbose?: boolean
}

// Command definitions with strict typing
export declare const daemonCommand: CommandDef
export declare const jobCommand: CommandDef
export declare const eventCommand: CommandDef
export declare const worktreeCommand: CommandDef
export declare const scheduleCommand: CommandDef

// Context types for composables integration
export interface GitVanContext {
  root: string
  env: Record<string, string | undefined>
  now: () => string
  verbose?: boolean
}

export interface JobModule {
  default: (ctx: GitVanContext) => Promise<any>
  meta?: {
    name?: string
    description?: string
    author?: string
    version?: string
  }
  schema?: Record<string, any>
}
```

### 2. Enhanced Command with Full Type Safety

```typescript
// src/commands/job.mts (TypeScript version)
import { defineCommand } from 'citty'
import type { JobRunArgs, JobRunOptions, JobModule, GitVanContext } from '../../types/cli.js'

export const jobRunCommand = defineCommand({
  meta: {
    name: 'run',
    description: 'Execute a specific job with full type safety'
  },
  args: {
    name: {
      type: 'string',
      description: 'Job name to execute',
      required: true
    }
  } as const,
  options: {
    directory: {
      type: 'string',
      description: 'Jobs directory path',
      default: './jobs'
    },
    dry: {
      type: 'boolean',
      description: 'Dry run mode',
      default: false
    },
    verbose: {
      type: 'boolean',
      description: 'Enable verbose output',
      default: false
    }
  } as const,
  async run({ args, options }: { args: JobRunArgs, options: JobRunOptions }) {
    // Type-safe implementation
    const jobPath = findJobFile(options.directory!, args.name)

    if (!jobPath) {
      throw new Error(`Job not found: ${args.name}`)
    }

    const jobMod: JobModule = await import(`file://${jobPath}`)
    const ctx: GitVanContext = {
      root: process.cwd(),
      env: process.env,
      now: () => new Date().toISOString(),
      verbose: options.verbose
    }

    const result = await jobMod.default(ctx)
    return result
  }
})
```

## Integration with Composables

### 1. Enhanced Context Integration

```javascript
// src/commands/utils/context.mjs
import { withGitVan } from '../composables/ctx.mjs'

export async function withCLIContext(options, callback) {
  const ctx = {
    root: process.cwd(),
    env: process.env,
    now: () => new Date().toISOString(),
    verbose: options.verbose || false,
    format: options.format || 'table'
  }

  return await withGitVan(ctx, callback)
}

export function createJobContext(options) {
  return {
    root: process.cwd(),
    env: process.env,
    now: () => new Date().toISOString(),
    verbose: options.verbose || false,
    dryRun: options.dry || false
  }
}
```

### 2. Composable-Aware Commands

```javascript
// Enhanced worktree command with composables
import { defineCommand } from 'citty'
import { useGit } from '../composables/git.mjs'
import { useTemplate } from '../composables/template.mjs'
import { withCLIContext } from './utils/context.mjs'

export const worktreeCommand = defineCommand({
  meta: {
    name: 'worktree',
    description: 'Manage Git worktrees with composable integration'
  },
  subCommands: {
    list: defineCommand({
      meta: {
        name: 'list',
        description: 'List worktrees using Git composable'
      },
      options: {
        format: { type: 'string', default: 'table' },
        template: { type: 'string', description: 'Custom output template' }
      },
      async run({ options }) {
        await withCLIContext(options, async () => {
          const git = useGit()
          const worktrees = git.listWorktrees()

          if (options.template) {
            // Use template composable for custom formatting
            const template = useTemplate()
            const output = await template.render(options.template, { worktrees })
            console.log(output)
          } else {
            // Default formatting
            formatWorktrees(worktrees, options.format)
          }
        })
      }
    }),

    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show worktree status with Git composable'
      },
      args: {
        path: { type: 'string', description: 'Worktree path' }
      },
      async run({ args, options }) {
        await withCLIContext(options, async () => {
          const git = useGit()
          const status = git.status(args.path || process.cwd())

          console.log(`📊 Worktree Status: ${args.path || process.cwd()}`)
          console.log(`Branch: ${status.branch}`)
          console.log(`Modified files: ${status.modified.length}`)
          console.log(`Staged files: ${status.staged.length}`)
          console.log(`Untracked files: ${status.untracked.length}`)
        })
      }
    })
  }
})
```

## Error Handling & User Feedback

### 1. Centralized Error Handling

```javascript
// src/utils/error-handler.mjs
import { colors } from 'citty/utils'

export class GitVanError extends Error {
  constructor(message, code, details) {
    super(message)
    this.name = 'GitVanError'
    this.code = code
    this.details = details
  }
}

export function handleCommandError(error, options = {}) {
  const { verbose = false, json = false } = options

  if (json) {
    console.error(JSON.stringify({
      error: error.message,
      code: error.code || 'UNKNOWN',
      details: verbose ? error.details : undefined
    }, null, 2))
    return
  }

  // Pretty error formatting
  console.error(colors.red(`❌ Error: ${error.message}`))

  if (error.code) {
    console.error(colors.gray(`Code: ${error.code}`))
  }

  if (verbose && error.details) {
    console.error(colors.gray('Details:'))
    console.error(colors.gray(JSON.stringify(error.details, null, 2)))
  }

  if (verbose && error.stack) {
    console.error(colors.gray('\nStack trace:'))
    console.error(colors.gray(error.stack))
  }
}

export function wrapCommandHandler(handler) {
  return async (context) => {
    try {
      return await handler(context)
    } catch (error) {
      handleCommandError(error, {
        verbose: context.options.verbose,
        json: context.options.json
      })
      process.exit(1)
    }
  }
}
```

### 2. Enhanced Commands with Error Handling

```javascript
// src/commands/job.mjs (with error handling)
import { defineCommand } from 'citty'
import { GitVanError, wrapCommandHandler } from '../utils/error-handler.mjs'

export const jobCommand = defineCommand({
  meta: {
    name: 'job',
    description: 'Manage and execute GitVan jobs'
  },
  subCommands: {
    run: defineCommand({
      meta: {
        name: 'run',
        description: 'Execute a specific job'
      },
      args: {
        name: { type: 'string', required: true }
      },
      options: {
        directory: { type: 'string', default: './jobs' },
        verbose: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false }
      },
      run: wrapCommandHandler(async ({ args, options }) => {
        const jobPath = findJobFile(options.directory, args.name)

        if (!jobPath) {
          throw new GitVanError(
            `Job '${args.name}' not found`,
            'JOB_NOT_FOUND',
            {
              searchedIn: options.directory,
              availableJobs: findAllJobs(options.directory)
            }
          )
        }

        try {
          const jobMod = await import(`file://${jobPath}`)

          if (!jobMod.default || typeof jobMod.default !== 'function') {
            throw new GitVanError(
              `Job '${args.name}' does not export a default function`,
              'INVALID_JOB_EXPORT',
              { jobPath }
            )
          }

          const ctx = createJobContext(options)
          const result = await jobMod.default(ctx)

          if (options.json) {
            console.log(JSON.stringify({ success: true, result }, null, 2))
          } else {
            console.log(`✅ Job '${args.name}' completed successfully`)
            if (result && options.verbose) {
              console.log('Result:', JSON.stringify(result, null, 2))
            }
          }

          return result
        } catch (importError) {
          throw new GitVanError(
            `Failed to load job '${args.name}'`,
            'JOB_LOAD_ERROR',
            {
              jobPath,
              originalError: importError.message
            }
          )
        }
      })
    })
  }
})
```

### 3. Progress Indicators and Feedback

```javascript
// src/utils/progress.mjs
import { colors } from 'citty/utils'

export class ProgressIndicator {
  constructor(message, options = {}) {
    this.message = message
    this.options = options
    this.startTime = Date.now()
    this.spinner = options.spinner !== false
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    this.frameIndex = 0
    this.interval = null
  }

  start() {
    if (!this.spinner || this.options.quiet) return

    process.stdout.write(`${this.frames[0]} ${this.message}`)

    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length
      process.stdout.write(`\r${this.frames[this.frameIndex]} ${this.message}`)
    }, 80)
  }

  succeed(message) {
    this.stop()
    const duration = Date.now() - this.startTime
    const finalMessage = message || this.message
    console.log(`${colors.green('✅')} ${finalMessage} ${colors.gray(`(${duration}ms)`)}`)
  }

  fail(message) {
    this.stop()
    const finalMessage = message || this.message
    console.log(`${colors.red('❌')} ${finalMessage}`)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      process.stdout.write('\r')
    }
  }
}

export function withProgress(message, asyncFn, options = {}) {
  return async (...args) => {
    const progress = new ProgressIndicator(message, options)
    progress.start()

    try {
      const result = await asyncFn(...args)
      progress.succeed()
      return result
    } catch (error) {
      progress.fail()
      throw error
    }
  }
}
```

### 4. Commands with Progress Indicators

```javascript
// Enhanced daemon command with progress
import { defineCommand } from 'citty'
import { withProgress } from '../utils/progress.mjs'
import { GitVanDaemon } from '../runtime/daemon.mjs'

export const daemonStartCommand = defineCommand({
  meta: {
    name: 'start',
    description: 'Start the GitVan daemon'
  },
  options: {
    worktrees: { type: 'string' },
    port: { type: 'string', default: '3000' },
    quiet: { type: 'boolean', default: false }
  },
  async run({ options }) {
    const startDaemon = withProgress(
      'Starting GitVan daemon...',
      async () => {
        const daemon = new GitVanDaemon(process.cwd(), {
          port: options.port
        })
        await daemon.start()
        return daemon
      },
      { quiet: options.quiet }
    )

    const daemon = await startDaemon()

    if (!options.quiet) {
      console.log(`🚀 Daemon started on port ${options.port}`)
      console.log(`📁 Watching: ${process.cwd()}`)
    }

    return daemon
  }
})
```

## Testing the Migration

### 1. Create Test Suite (`test/cli.test.mjs`)

```javascript
import { test, expect } from 'vitest'
import { execa } from 'execa'
import { join } from 'pathe'

const CLI_PATH = join(process.cwd(), 'bin/gitvan.mjs')

test('shows help when no command provided', async () => {
  const { stdout } = await execa('node', [CLI_PATH])
  expect(stdout).toContain('GitVan v2')
  expect(stdout).toContain('Usage:')
})

test('shows version', async () => {
  const { stdout } = await execa('node', [CLI_PATH, '--version'])
  expect(stdout).toContain('2.0.0')
})

test('lists available commands', async () => {
  const { stdout } = await execa('node', [CLI_PATH, '--help'])
  expect(stdout).toContain('daemon')
  expect(stdout).toContain('job')
  expect(stdout).toContain('event')
  expect(stdout).toContain('worktree')
})

test('job list command works', async () => {
  const { stdout } = await execa('node', [CLI_PATH, 'job', 'list'])
  expect(stdout).toMatch(/Available Jobs|No jobs found/)
})

test('daemon status command works', async () => {
  const { stdout } = await execa('node', [CLI_PATH, 'daemon', 'status'])
  expect(stdout).toMatch(/running|not running/)
})

test('handles unknown command gracefully', async () => {
  const { stderr, exitCode } = await execa('node', [CLI_PATH, 'unknown'], {
    reject: false
  })
  expect(exitCode).toBe(1)
  expect(stderr).toContain('Unknown command')
})

test('validates required arguments', async () => {
  const { stderr, exitCode } = await execa('node', [CLI_PATH, 'job', 'run'], {
    reject: false
  })
  expect(exitCode).toBe(1)
  expect(stderr).toContain('required')
})
```

### 2. Migration Testing Script

```bash
#!/bin/bash
# test-migration.sh

echo "🧪 Testing GitVan CLI Migration"
echo "================================"

# Test basic commands
echo "📋 Testing basic commands..."
node bin/gitvan.mjs --help > /dev/null && echo "✅ Help works" || echo "❌ Help failed"
node bin/gitvan.mjs --version > /dev/null && echo "✅ Version works" || echo "❌ Version failed"

# Test subcommands
echo "📋 Testing subcommands..."
node bin/gitvan.mjs daemon --help > /dev/null && echo "✅ Daemon help works" || echo "❌ Daemon help failed"
node bin/gitvan.mjs job --help > /dev/null && echo "✅ Job help works" || echo "❌ Job help failed"
node bin/gitvan.mjs event --help > /dev/null && echo "✅ Event help works" || echo "❌ Event help failed"

# Test command execution
echo "📋 Testing command execution..."
node bin/gitvan.mjs daemon status && echo "✅ Daemon status works" || echo "❌ Daemon status failed"
node bin/gitvan.mjs job list && echo "✅ Job list works" || echo "❌ Job list failed"
node bin/gitvan.mjs event list && echo "✅ Event list works" || echo "❌ Event list failed"

echo "🏁 Migration testing complete"
```

## Advanced Features

### 1. Auto-completion Support

```javascript
// src/cli-completion.mjs
import { defineCommand } from 'citty'

// Enable shell completion
export const completionCommand = defineCommand({
  meta: {
    name: 'completion',
    description: 'Generate shell completion scripts'
  },
  args: {
    shell: {
      type: 'string',
      description: 'Shell type',
      required: true,
      valueHint: 'bash|zsh|fish'
    }
  },
  async run({ args }) {
    switch (args.shell) {
      case 'bash':
        console.log(generateBashCompletion())
        break
      case 'zsh':
        console.log(generateZshCompletion())
        break
      case 'fish':
        console.log(generateFishCompletion())
        break
      default:
        throw new Error(`Unsupported shell: ${args.shell}`)
    }
  }
})

function generateBashCompletion() {
  return `
# GitVan bash completion
_gitvan() {
  local cur prev commands
  cur=\${COMP_WORDS[COMP_CWORD]}
  prev=\${COMP_WORDS[COMP_CWORD-1]}
  commands="daemon job event worktree schedule completion"

  case \${prev} in
    gitvan)
      COMPREPLY=($(compgen -W "\${commands}" -- \${cur}))
      ;;
    daemon)
      COMPREPLY=($(compgen -W "start stop status" -- \${cur}))
      ;;
    job)
      COMPREPLY=($(compgen -W "list run info" -- \${cur}))
      ;;
    event)
      COMPREPLY=($(compgen -W "list info" -- \${cur}))
      ;;
    *)
      ;;
  esac
}

complete -F _gitvan gitvan
`
}
```

### 2. Configuration File Support

```javascript
// src/commands/config.mjs
import { defineCommand } from 'citty'
import { loadConfig, saveConfig } from '../runtime/config.mjs'

export const configCommand = defineCommand({
  meta: {
    name: 'config',
    description: 'Manage GitVan configuration'
  },
  subCommands: {
    get: defineCommand({
      meta: { name: 'get', description: 'Get configuration value' },
      args: { key: { type: 'string', required: true } },
      async run({ args }) {
        const config = await loadConfig()
        const value = getNestedValue(config, args.key)
        console.log(value)
      }
    }),

    set: defineCommand({
      meta: { name: 'set', description: 'Set configuration value' },
      args: {
        key: { type: 'string', required: true },
        value: { type: 'string', required: true }
      },
      async run({ args }) {
        const config = await loadConfig()
        setNestedValue(config, args.key, args.value)
        await saveConfig(config)
        console.log(`✅ Set ${args.key} = ${args.value}`)
      }
    }),

    list: defineCommand({
      meta: { name: 'list', description: 'List all configuration' },
      options: { format: { type: 'string', default: 'yaml' } },
      async run({ options }) {
        const config = await loadConfig()

        if (options.format === 'json') {
          console.log(JSON.stringify(config, null, 2))
        } else {
          // YAML-like output
          printConfig(config)
        }
      }
    })
  }
})
```

### 3. Plugin System Integration

```javascript
// src/commands/plugin.mjs
import { defineCommand } from 'citty'

export const pluginCommand = defineCommand({
  meta: {
    name: 'plugin',
    description: 'Manage GitVan plugins'
  },
  subCommands: {
    list: defineCommand({
      meta: { name: 'list', description: 'List installed plugins' },
      async run() {
        const plugins = await discoverPlugins()
        console.log('🔌 Installed Plugins:')
        plugins.forEach(plugin => {
          console.log(`  ${plugin.name} v${plugin.version}`)
          if (plugin.description) {
            console.log(`    ${plugin.description}`)
          }
        })
      }
    }),

    install: defineCommand({
      meta: { name: 'install', description: 'Install a plugin' },
      args: { name: { type: 'string', required: true } },
      async run({ args }) {
        console.log(`🔌 Installing plugin: ${args.name}`)
        await installPlugin(args.name)
        console.log(`✅ Plugin installed successfully`)
      }
    })
  }
})
```

## Migration Checklist

### Phase 1: Basic Migration
- [ ] Install citty dependency
- [ ] Create new CLI entry point (`src/cli-v2.mjs`)
- [ ] Migrate daemon command
- [ ] Migrate job command
- [ ] Update bin/gitvan.mjs

### Phase 2: Enhanced Commands
- [ ] Migrate event command
- [ ] Migrate worktree command
- [ ] Migrate schedule command
- [ ] Add error handling
- [ ] Add progress indicators

### Phase 3: Advanced Features
- [ ] Add TypeScript support
- [ ] Create comprehensive tests
- [ ] Add auto-completion
- [ ] Add configuration management
- [ ] Add plugin system

### Phase 4: Integration & Polish
- [ ] Integrate with composables
- [ ] Add validation schemas
- [ ] Improve help text
- [ ] Add examples
- [ ] Update documentation

## Benefits of citty Migration

1. **Better Developer Experience**
   - Automatic help generation
   - Type safety with TypeScript
   - Consistent command structure

2. **Enhanced User Experience**
   - Better error messages
   - Auto-completion support
   - Consistent option parsing

3. **Maintainability**
   - Declarative command definitions
   - Built-in validation
   - Easier testing

4. **Extensibility**
   - Plugin system ready
   - Easy to add new commands
   - Composable architecture

This migration transforms GitVan's CLI from a basic argument parser to a professional, type-safe, and user-friendly command-line interface that integrates seamlessly with the existing composable architecture.