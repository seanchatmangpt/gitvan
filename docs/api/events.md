# GitVan v2 Events API

GitVan's event system provides flexible Git event detection and routing. Events are triggered by Git operations like commits, pushes, merges, and tag creation, with powerful predicate matching for precise job targeting.

## Table of Contents

- [Event System Overview](#event-system-overview)
- [Event Predicates](#event-predicates)
- [Event Matchers](#event-matchers)
- [File-based Event Discovery](#file-based-event-discovery)
- [Event Routing](#event-routing)
- [Custom Event Handlers](#custom-event-handlers)

## Event System Overview

GitVan monitors Git repositories for events and matches them against job predicates to determine which jobs should be executed. The event system is designed for precision and performance.

### Event Types

| Event Type | Description | Example |
|------------|-------------|---------|
| **push** | Branch push operations | Push to `main`, `feature/*` |
| **merge** | Merge operations | Merge to `main`, PR merges |
| **tag** | Tag creation/deletion | Release tags, version tags |
| **path** | File path changes | `src/**` modified, config changes |
| **commit** | Commit metadata | Message patterns, author filters |

### Event Flow

1. **Git Operation** - Developer performs Git action (push, merge, tag)
2. **Event Detection** - GitVan detects and parses the operation
3. **Event Matching** - Event is matched against job predicates
4. **Job Execution** - Matching jobs are queued for execution
5. **Receipt Storage** - Execution results stored in Git notes

## Event Predicates

Event predicates define the conditions that trigger job execution. They support simple matching and complex logical combinations.

### Simple Predicates

#### Branch Operations

```javascript
// Job triggered on push to main branch
const deployJob = defineJob({
  on: { pushTo: 'main' },
  run: async (ctx) => { /* deploy logic */ }
})

// Job triggered on merge to release branches
const releaseJob = defineJob({
  on: { mergeTo: 'release/*' },
  run: async (ctx) => { /* release logic */ }
})

// Job triggered on push to any feature branch
const featureJob = defineJob({
  on: { pushTo: 'feature/*' },
  run: async (ctx) => { /* feature testing */ }
})
```

#### Tag Operations

```javascript
// Job triggered on any tag creation
const tagJob = defineJob({
  on: { tagCreate: '*' },
  run: async (ctx) => { /* tag processing */ }
})

// Job triggered on version tags
const versionJob = defineJob({
  on: { tagCreate: 'v*' },
  run: async (ctx) => { /* version release */ }
})

// Job triggered on semantic version tags
const semverJob = defineJob({
  on: { semverTag: true },
  run: async (ctx) => { /* semver release */ }
})
```

#### Path Changes

```javascript
// Job triggered when source files change
const buildJob = defineJob({
  on: { pathChanged: ['src/**'] },
  run: async (ctx) => { /* build process */ }
})

// Job triggered when specific files change
const configJob = defineJob({
  on: { pathChanged: ['package.json', 'tsconfig.json'] },
  run: async (ctx) => { /* config update */ }
})

// Job triggered when new files are added
const scanJob = defineJob({
  on: { pathAdded: ['src/**/*.ts'] },
  run: async (ctx) => { /* lint new files */ }
})
```

#### Commit Metadata

```javascript
// Job triggered by conventional commit messages
const conventionalJob = defineJob({
  on: { message: '^(feat|fix|docs):' },
  run: async (ctx) => { /* process conventional commit */ }
})

// Job triggered by team member commits
const teamJob = defineJob({
  on: { authorEmail: '@company.com' },
  run: async (ctx) => { /* internal workflow */ }
})

// Job triggered only for signed commits
const secureJob = defineJob({
  on: { signed: true },
  run: async (ctx) => { /* security validation */ }
})
```

### Complex Predicates

#### ANY Logic (OR)

Execute job if ANY condition matches:

```javascript
const multiTriggerJob = defineJob({
  on: {
    any: [
      { pushTo: 'main' },
      { pushTo: 'develop' },
      { tagCreate: 'v*' }
    ]
  },
  run: async (ctx) => {
    // Triggered by:
    // - Push to main OR
    // - Push to develop OR
    // - Version tag creation
  }
})
```

#### ALL Logic (AND)

Execute job only if ALL conditions match:

```javascript
const strictJob = defineJob({
  on: {
    all: [
      { pushTo: 'main' },
      { pathChanged: ['src/**'] },
      { signed: true }
    ]
  },
  run: async (ctx) => {
    // Triggered only by:
    // - Push to main AND
    // - Source files changed AND
    // - Commit is signed
  }
})
```

#### Nested Logic

Combine ANY and ALL for complex conditions:

```javascript
const complexJob = defineJob({
  on: {
    all: [
      // Must be on main or release branch
      {
        any: [
          { pushTo: 'main' },
          { pushTo: 'release/*' }
        ]
      },
      // AND must have changed important files
      {
        any: [
          { pathChanged: ['src/**'] },
          { pathChanged: ['package.json'] },
          { pathChanged: ['Dockerfile'] }
        ]
      },
      // AND must be from team member
      { authorEmail: '@company.com' }
    ]
  },
  run: async (ctx) => {
    // Complex business logic
  }
})
```

## Event Matchers

GitVan includes specialized matchers for different types of Git events.

### Path Matchers

Match file path changes with glob patterns.

```javascript
import { pathChanged, pathAdded, pathModified } from 'gitvan/router/matchers/path'

// Check if paths match predicate
const matches = pathChanged(
  { pathChanged: ['src/**', 'tests/**'] },
  { changedFiles: ['src/app.js', 'docs/README.md'] }
)
// Returns: true (src/app.js matches src/**)
```

#### Supported Patterns

| Pattern | Description | Example Match |
|---------|-------------|---------------|
| `*` | Single level wildcard | `src/*.js` → `src/app.js` |
| `**` | Multi-level wildcard | `src/**` → `src/utils/helper.js` |
| `?` | Single character | `test?.js` → `test1.js` |
| `[abc]` | Character set | `[Tt]est.js` → `Test.js` |
| `{a,b}` | Alternatives | `*.{js,ts}` → `app.js`, `app.ts` |

### Tag Matchers

Match tag operations with patterns and semantic version detection.

```javascript
import { tagCreate, semverTag } from 'gitvan/router/matchers/tag'

// Semantic version detection
const isSemver = semverTag(
  { semverTag: true },
  { tag: 'v1.2.3', isTag: true }
)
// Returns: true

// Pattern matching
const matchesPattern = tagCreate(
  { tagCreate: 'release-*' },
  { tag: 'release-2024.1', isTag: true }
)
// Returns: true
```

### Merge Matchers

Match merge operations and branch targeting.

```javascript
import { mergeTo, branchCreate } from 'gitvan/router/matchers/merge'

// Merge target matching
const isMainMerge = mergeTo(
  { mergeTo: 'main' },
  { isMerge: true, targetBranch: 'main' }
)
// Returns: true

// Branch creation detection
const isNewFeature = branchCreate(
  { branchCreate: 'feature/*' },
  { branchCreated: 'feature/new-ui', isNewBranch: true }
)
// Returns: true
```

### Commit Matchers

Match commit metadata like messages, authors, and signatures.

```javascript
import { message, authorEmail, signed } from 'gitvan/router/matchers/commit'

// Message pattern matching
const isFeature = message(
  { message: '^feat:' },
  { commitMessage: 'feat: add new dashboard' }
)
// Returns: true

// Author filtering
const isTeamMember = authorEmail(
  { authorEmail: '@company.com' },
  { authorEmail: 'john@company.com' }
)
// Returns: true

// Signature verification
const isSigned = signed(
  { signed: true },
  { isSignedCommit: true }
)
// Returns: true
```

## File-based Event Discovery

GitVan can automatically discover events from the filesystem using naming conventions.

### Directory Structure

```
events/
├── cron/
│   ├── 0_2_*_*_*.mjs        # Daily at 2 AM
│   └── 0_0_*_*_0.mjs        # Weekly on Sunday
├── merge-to/
│   ├── main.mjs             # Merges to main
│   └── release/*.mjs        # Merges to release branches
├── push-to/
│   ├── feature/*.mjs        # Pushes to feature branches
│   └── hotfix/*.mjs         # Pushes to hotfix branches
├── path-changed/
│   ├── src/[...slug].mjs    # Changes in src/** (slug = wildcard)
│   └── [config].mjs         # Changes to config files
├── tag/
│   ├── semver.mjs           # Semantic version tags
│   └── v*.mjs               # Version tags
├── message/
│   └── ^release:/.mjs       # Message regex patterns
└── author/
    └── @company\.com/.mjs   # Author email patterns
```

### Event Discovery API

```javascript
import { discoverEvents, loadEventDefinition } from 'gitvan/runtime/events'

// Discover all events in directory
const events = discoverEvents('./events')

// Load specific event definition
const eventDef = await loadEventDefinition('./events/merge-to/main.mjs')
```

### Event File Format

Event files export a default function or object:

```javascript
// events/merge-to/main.mjs
export default {
  name: 'main-merge-handler',
  description: 'Handle merges to main branch',
  handler: async (context) => {
    const { commit, branch, files } = context

    // Event handling logic
    console.log(`Merge to main: ${commit.sha}`)
    console.log(`Files changed: ${files.length}`)

    return { processed: true }
  }
}
```

## Event Routing

The event router orchestrates event matching and job execution.

### Event Router API

```javascript
import { matches, validatePredicate } from 'gitvan/router/events'

// Check if event matches predicate
const isMatch = matches(
  {
    all: [
      { pushTo: 'main' },
      { pathChanged: ['src/**'] }
    ]
  },
  {
    isPush: true,
    branch: 'main',
    changedFiles: ['src/app.js', 'docs/README.md']
  }
)

// Validate predicate structure
const validation = validatePredicate({
  pushTo: 'main',
  unknownMatcher: 'value'  // This will be flagged
})

console.log(validation.isValid)  // false
console.log(validation.errors)   // ['Unknown matcher: unknownMatcher']
```

### Event Metadata Format

Events provide rich metadata for matching:

```typescript
interface EventMetadata {
  // Basic event info
  type: 'push' | 'merge' | 'tag' | 'commit'
  timestamp: string
  sha: string

  // Branch information
  branch?: string
  targetBranch?: string  // For merges
  sourceBranch?: string  // For merges

  // File changes
  changedFiles?: string[]
  addedFiles?: string[]
  modifiedFiles?: string[]
  deletedFiles?: string[]

  // Tag information
  tag?: string
  isTag?: boolean

  // Commit information
  commitMessage?: string
  authorName?: string
  authorEmail?: string
  committerName?: string
  committerEmail?: string
  isSignedCommit?: boolean

  // Operation flags
  isPush?: boolean
  isMerge?: boolean
  isNewBranch?: boolean
  isDeletedBranch?: boolean
}
```

## Custom Event Handlers

Create custom event handlers for specialized Git operations.

### Basic Event Handler

```javascript
// events/custom/deployment.mjs
export default {
  name: 'deployment-event',
  description: 'Handle deployment events',

  // Event matching logic
  matches: (metadata) => {
    return metadata.isPush &&
           metadata.branch === 'main' &&
           metadata.changedFiles?.some(f => f.startsWith('deploy/'))
  },

  // Event handler
  handler: async (context) => {
    const { metadata, git, logger } = context

    logger.log('Deployment event detected')

    // Extract deployment configuration
    const deployFiles = metadata.changedFiles.filter(f => f.startsWith('deploy/'))

    for (const file of deployFiles) {
      const config = await parseDeploymentConfig(file)
      await processDeployment(config)
    }

    return {
      status: 'processed',
      deployments: deployFiles.length
    }
  }
}
```

### Advanced Event Handler

```javascript
// events/ci/pipeline.mjs
export default {
  name: 'ci-pipeline',
  description: 'Orchestrate CI pipeline based on changes',

  // Complex matching with priorities
  matches: (metadata) => {
    const priorities = {
      critical: metadata.changedFiles?.some(f =>
        f.includes('Dockerfile') || f.includes('package.json')
      ),
      high: metadata.changedFiles?.some(f => f.startsWith('src/')),
      medium: metadata.changedFiles?.some(f => f.startsWith('docs/')),
      low: true
    }

    return {
      match: Object.values(priorities).some(Boolean),
      priority: Object.keys(priorities).find(k => priorities[k])
    }
  },

  handler: async (context) => {
    const { metadata, git, logger, priority } = context

    const pipeline = createPipeline(priority)

    logger.log(`Starting ${priority} priority pipeline`)

    const results = await pipeline.execute({
      commit: metadata.sha,
      branch: metadata.branch,
      files: metadata.changedFiles
    })

    // Store results in Git notes
    await git.noteAdd('ci-results', JSON.stringify(results))

    return {
      status: 'completed',
      priority,
      duration: results.duration,
      stages: results.stages.length
    }
  }
}
```

### Event Handler Context

Event handlers receive a rich context object:

```typescript
interface EventContext {
  // Event metadata
  metadata: EventMetadata

  // Git operations
  git: GitComposable

  // Utilities
  logger: Logger
  exec: ExecComposable
  template: TemplateComposable

  // Configuration
  config: GitVanConfig

  // Additional data from matching
  priority?: string
  matchData?: any
}
```

## Event Testing

Test event predicates and handlers for reliability.

### Testing Predicates

```javascript
import { matches } from 'gitvan/router/events'

describe('Event Predicates', () => {
  test('matches push to main with source changes', () => {
    const predicate = {
      all: [
        { pushTo: 'main' },
        { pathChanged: ['src/**'] }
      ]
    }

    const metadata = {
      isPush: true,
      branch: 'main',
      changedFiles: ['src/app.js', 'docs/README.md']
    }

    expect(matches(predicate, metadata)).toBe(true)
  })

  test('rejects push without source changes', () => {
    const predicate = {
      all: [
        { pushTo: 'main' },
        { pathChanged: ['src/**'] }
      ]
    }

    const metadata = {
      isPush: true,
      branch: 'main',
      changedFiles: ['docs/README.md', 'package.json']
    }

    expect(matches(predicate, metadata)).toBe(false)
  })
})
```

### Testing Event Handlers

```javascript
import { loadEventDefinition } from 'gitvan/runtime/events'

describe('Event Handlers', () => {
  test('processes deployment event correctly', async () => {
    const handler = await loadEventDefinition('./events/custom/deployment.mjs')

    const context = {
      metadata: {
        isPush: true,
        branch: 'main',
        changedFiles: ['deploy/staging.yml', 'src/app.js']
      },
      git: mockGit,
      logger: mockLogger
    }

    const result = await handler.handler(context)

    expect(result.status).toBe('processed')
    expect(result.deployments).toBe(1)
  })
})
```

## Best Practices

### 1. Use Specific Predicates

```javascript
// Good - Specific and efficient
{
  all: [
    { pushTo: 'main' },
    { pathChanged: ['src/**', 'package.json'] },
    { authorEmail: '@company.com' }
  ]
}

// Avoid - Too broad
{
  pushTo: '*'
}
```

### 2. Structure Events by Domain

```
events/
├── ci/           # Continuous integration
├── deployment/   # Deployment workflows
├── security/     # Security scanning
├── docs/         # Documentation updates
└── notifications/ # Team notifications
```

### 3. Handle Edge Cases

```javascript
const robustPredicate = {
  all: [
    { pushTo: 'main' },
    { pathChanged: ['src/**'] },
    // Exclude merge commits to avoid double execution
    { message: '^(?!Merge)' }
  ]
}
```

### 4. Use Event Priorities

```javascript
const prioritizedEvents = [
  {
    priority: 'critical',
    predicate: { pathChanged: ['Dockerfile', 'package.json'] }
  },
  {
    priority: 'high',
    predicate: { pathChanged: ['src/**'] }
  },
  {
    priority: 'low',
    predicate: { pathChanged: ['docs/**'] }
  }
]
```

### 5. Test Event Logic

```javascript
// Create test utilities for event validation
const testEvent = (predicate, scenario) => {
  return matches(predicate, scenario)
}

// Test different scenarios
const scenarios = [
  { name: 'main push', isPush: true, branch: 'main' },
  { name: 'feature push', isPush: true, branch: 'feature/new' },
  { name: 'tag create', isTag: true, tag: 'v1.0.0' }
]
```

### 6. Monitor Event Performance

```javascript
const performantHandler = async (context) => {
  const start = Date.now()

  try {
    const result = await processEvent(context)
    return { ...result, duration: Date.now() - start }
  } catch (error) {
    context.logger.error('Event processing failed:', error)
    return { status: 'error', duration: Date.now() - start }
  }
}
```