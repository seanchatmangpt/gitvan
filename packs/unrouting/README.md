# GitVan Unrouting Pack

File-based routing system that turns file changes into GitVan job executions.

## Overview

Unrouting provides a declarative way to trigger GitVan jobs based on file changes. It uses a routes registry to match file patterns and execute corresponding jobs with parameter extraction and intelligent batching.

## Features

- **File-based routing**: Jobs triggered by file changes
- **Parameter extraction**: Extract parameters from file paths using patterns
- **Intelligent batching**: Deduplicate jobs by batch key
- **Dry-run planning**: Plan jobs without executing them
- **Receipt tracking**: Comprehensive audit trails

## Routes Registry

The `routes.json` file defines how file changes map to jobs:

```json
[
  {
    "id": "jd-intake",
    "pattern": "inbox/jobs/[slug]/jd.md",
    "batchKey": ":slug",
    "jobs": [
      { "name": "intake:jd", "with": { "slug": ":slug", "path": ":__file" } },
      { "name": "pitch:plan", "with": { "slug": ":slug" } }
    ]
  }
]
```

### Pattern Syntax

- `[slug]` - Named parameter (matches non-slash characters)
- `[...artifact]` - Catchall parameter (matches everything, becomes array)
- `@view` - Named view parameter
- File extensions are matched literally

### Parameter Binding

- `:slug` - Bound to extracted parameter
- `:__file` - Bound to matched file path
- Arrays from catchall parameters are split by `/`

### Batch Keys

Use `batchKey` to deduplicate jobs across multiple file changes:

```json
{
  "batchKey": ":slug",
  "jobs": [{ "name": "pitch:compose", "with": { "slug": ":slug" } }]
}
```

Multiple files matching the same slug will only trigger one job execution.

## Jobs

### unrouting:route

Main router job that processes file changes and executes jobs.

**Triggers**: `push:refs/heads/main`

**Process**:
1. Load routes registry
2. Get changed files from git diff
3. Match files against routes
4. Generate deduplicated job queue
5. Execute jobs sequentially
6. Write receipt and audit note

### unrouting:plan

Dry-run planning job for testing routes without execution.

**Usage**: `gitvan job run packs/unrouting/jobs/unrouting.plan.mjs`

**Output**: Detailed plan showing which files match which routes and what jobs would be executed.

## Configuration

Add to your `gitvan.config.js`:

```javascript
export default {
  strategy: "tbd-trunk",
  events: {
    "push:refs/heads/main": ["unrouting:route"]
  },
  packs: { 
    dirs: ["packs", ".gitvan/packs"] 
  }
}
```

## Examples

### Single File Match

File: `inbox/jobs/acme/jd.md`

Matches: `inbox/jobs/[slug]/jd.md`

Triggers:
- `intake:jd` with `{ slug: "acme", path: "inbox/jobs/acme/jd.md" }`
- `pitch:plan` with `{ slug: "acme" }`
- `pitch:compose` with `{ slug: "acme" }`

### Multi-file Batching

Files: 
- `pitch/acme/script.mdx`
- `pitch/acme/modes/founder.json`

Both match routes with `batchKey: ":slug"`, so only one `pitch:compose` job runs for slug "acme".

### Catchall Parameters

File: `evidence/acme/screens/demo.gif`

Matches: `evidence/[slug]/[...artifact]`

Triggers: `artifact:attach` with `{ slug: "acme", artifact: ["screens", "demo.gif"] }`

### Named Views

File: `sites/acme/pages/stack@rsc.client.mdx`

Matches: `sites/[slug]/pages/[section]@[view].[mode].mdx`

Triggers: `pitch:compose` with `{ slug: "acme", section: "stack", view: "rsc", mode: "client" }`

## Testing

### Dry-run Planning

```bash
# Plan for specific files
gitvan job run packs/unrouting/jobs/unrouting.plan.mjs --files "pitch/acme/script.mdx"

# Plan for current changes
gitvan job run packs/unrouting/jobs/unrouting.plan.mjs
```

### Route Testing

Test individual patterns:

```javascript
import { parsePath } from './parser.mjs'

const params = parsePath('pitch/[slug]/script.mdx', 'pitch/acme/script.mdx')
console.log(params) // { slug: 'acme' }
```

## Performance

- Routes compiled to regex once per run
- O(N routes × M files) complexity with early exit
- Typical M ≤ 50 files per commit
- P95 target: sub-second for typical workloads

## Extensions

Future enhancements:
- `phase` field for job ordering
- `when` field for conditional routes
- `aggregateWith` for multi-file job inputs
- Route inheritance and composition





