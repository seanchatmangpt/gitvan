# GitVan Playground

This is a throwaway app to dogfood GitVan jobs system.

## Quick Start

```bash
cd playground
pnpm install
pnpm dev          # starts daemon + watch
```

## Available Commands

```bash
pnpm list         # List all discovered jobs
pnpm run:changelog # Run changelog generation job
pnpm run:simple   # Run simple status report job
pnpm run:cleanup  # Run cleanup job
pnpm daemon       # Start daemon only
pnpm status       # Show daemon status
```

## Jobs

- **docs:changelog** - Generates CHANGELOG.md from git log
- **test:simple** - Creates a simple status report
- **test:cleanup** - Cron job that cleans up old files (runs daily at 2 AM)
- **alerts:release** - Event-driven job that triggers on new tags

## Features Demonstrated

- ✅ Job discovery from filesystem
- ✅ Template rendering with Nunjucks
- ✅ Git operations and repository info
- ✅ Cron scheduling
- ✅ Event-driven jobs
- ✅ Custom hooks integration
- ✅ Receipt generation
- ✅ Lock management
- ✅ Hot reload with vite-node

## File Structure

```
playground/
├── package.json           # Dependencies and scripts
├── gitvan.config.js       # GitVan configuration
├── dev.mjs               # Main development runner
├── jobs/
│   ├── docs/
│   │   └── changelog.mjs  # Changelog generation job
│   ├── test/
│   │   ├── simple.mjs     # Simple status job
│   │   └── cleanup.cron.mjs # Cron cleanup job
│   └── alerts/
│       └── release.evt.mjs # Event-driven release job
└── templates/
    └── changelog.njk     # Nunjucks template
```

## Testing the System

1. **Start the playground**: `pnpm dev`
2. **List jobs**: `pnpm list`
3. **Run a job**: `pnpm run:changelog`
4. **Check output**: `cat dist/CHANGELOG.md`
5. **View receipts**: `git notes --ref=refs/notes/gitvan/results show HEAD`
6. **Test hot reload**: Edit a job file and see it reload automatically

This playground exercises the entire GitVan jobs system end-to-end!
