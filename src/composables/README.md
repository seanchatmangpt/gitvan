# GitVan v2 Composables

This directory contains all the composables for GitVan v2, providing a comprehensive API for Git-native development automation.

## Quick Start

```javascript
import { withGitVan, useJob, useEvent, useSchedule } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  const event = useEvent();
  const schedule = useSchedule();
  
  // Your automation code here
  const result = await job.run('my-job');
  await event.trigger('job-completed', { result });
});
```

## Available Composables

### Core Composables
- **`useGit`** - Git operations and repository management
- **`useWorktree`** - Git worktree management
- **`useTemplate`** - Template rendering with Nunjucks

### Job & Event Composables
- **`useJob`** - Job lifecycle and execution management
- **`useEvent`** - Event system and triggering
- **`useSchedule`** - Cron and scheduling management

### Infrastructure Composables
- **`useReceipt`** - Receipt and audit management
- **`useLock`** - Distributed locking
- **`useRegistry`** - Job and event registry management

## Documentation

- [Composables API Documentation](../docs/api/composables.md)
- [Quick Reference Guide](../docs/api/composables-quick-reference.md)
- [Examples](../docs/examples/composables-examples.md)

## Features

- **Context-aware**: All composables use `unctx` for proper async context management
- **Git-native**: Leverages Git refs for locking, receipts, and metadata
- **Type-safe**: Comprehensive error handling and validation
- **Performance-optimized**: Efficient caching and parallel operations
- **Extensible**: Easy to add new composables following the same pattern
- **Unrouting**: Extract original names from routed paths for flexible access

## Testing

All composables are thoroughly tested with comprehensive integration tests:

```bash
# Run composables tests
node test-new-composables.mjs
```

## Contributing

When adding new composables:

1. Follow the existing pattern in other composables
2. Use `unctx` for context management
3. Implement comprehensive error handling
4. Add unrouting methods if applicable
5. Write tests for all functionality
6. Update documentation

## Architecture

Each composable follows this pattern:

```javascript
export function useComposable() {
  // Get context from unctx
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  const cwd = (ctx && ctx.cwd) || process.cwd();
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC",
    LANG: "C",
  };

  const base = { cwd, env };

  return {
    cwd: base.cwd,
    env: base.env,
    
    // Composable-specific methods
    async method1() { /* ... */ },
    async method2() { /* ... */ },
  };
}
```

This ensures consistent context handling and error management across all composables.
