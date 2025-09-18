# Glossary

## Core Concepts

### Atomic Job
A job that executes a single operation without sub-steps. Atomic jobs use either a `run()` function or an `action` exec spec, but not both.

**Example**: A job that runs `npm test` or generates a changelog from a template.

### Composable
A Vue.js-inspired function that provides scoped functionality within a gitvan context. Composables automatically access the current execution context without explicit parameter passing.

**Examples**: `useGit()`, `useTemplate()`, `useExec()`.

### Composite Job
A job that orchestrates multiple operations through a sequence of steps. Each step can be another job, a CLI command, or any exec spec.

**Types**:
- **Sequence**: Steps execute one after another
- **Parallel**: Steps execute concurrently

### Context
The execution environment containing repository information, git state, configuration, and runtime data. Context is provided implicitly to composables via unctx.

### Daemon
A background process that monitors for events and executes jobs. In v2, each git worktree runs its own daemon process for isolation.

### defineJob()
A lightweight wrapper function that creates a job with both declarative metadata and executable logic. Enables static analysis while maintaining runtime capabilities.

### Event Handler
A function or job reference that responds to specific git events (pushes, merges, tags) or scheduled triggers (cron expressions).

### Exec Spec
A declarative specification for executing operations. Supports multiple execution types:
- `cli`: Command-line execution
- `js`: JavaScript module execution
- `llm`: Large language model invocation
- `job`: Other job execution
- `tmpl`: Template rendering

### Git Notes
Git's built-in mechanism for attaching metadata to commits without changing the commit hash. Gitvan uses notes for execution receipts and audit trails.

### Git Refs
Git references that point to specific commits. Gitvan uses custom refs under `refs/gitvan/` for locking and coordination between daemon processes.

### Job
A unit of work that can be executed by gitvan. Jobs have metadata (description, schedule, etc.) and execution logic (either a `run()` function or declarative `action` spec).

### Lock Ref
A git reference used for atomic locking between daemon processes. Lock refs prevent concurrent execution of conflicting operations across multiple worktrees.

### Receipt
A structured record of job execution results stored as git notes. Receipts include timestamp, status, artifacts, and metadata for audit and debugging.

### Worktree
A git feature that allows multiple working directories for the same repository. Each worktree can be on a different branch, enabling parallel development workflows.

## Execution Types

### CLI Execution
Execution type that runs command-line programs in a subprocess. Supports environment variables, arguments, and timeout configuration.

**Spec**: `{ exec: 'cli', cmd: 'npm', args: ['test'] }`

### JavaScript Execution
Execution type that dynamically imports and runs JavaScript/Node.js modules. Supports passing input data and accessing specific exports.

**Spec**: `{ exec: 'js', module: './scripts/build.mjs', input: { env: 'production' } }`

### LLM Execution
Execution type that calls large language models through Ollama-compatible APIs. Supports different models, prompts, and generation options.

**Spec**: `{ exec: 'llm', model: 'codellama', prompt: 'Generate documentation for: {{code}}' }`

### Job Execution
Execution type that calls other gitvan jobs by name. Enables composition and reuse of job definitions.

**Spec**: `{ exec: 'job', name: 'test:unit' }`

### Template Execution
Execution type that renders Nunjucks templates with git context and custom data. Can output to files or return strings.

**Spec**: `{ exec: 'tmpl', template: 'changelog.njk', out: 'CHANGELOG.md' }`

## File System Conventions

### Event Naming
Directory structure under `events/` determines when handlers are triggered:

- `events/cron/0_2_*_*_*.mjs` → Daily at 2 AM
- `events/merge-to/main.mjs` → Merge to main branch
- `events/push-to/feature/*.mjs` → Push to feature/* branches
- `events/path-changed/src/**/*.js.mjs` → JS file changes in src/
- `events/tag/semver.mjs` → Semantic version tags
- `events/message/fix-*.mjs` → Commit messages matching pattern
- `events/author/user@domain.com.mjs` → Commits by specific author

### Job Naming
Directory structure under `jobs/` determines job names and organization:

- `jobs/build.mjs` → Job name: "build"
- `jobs/test/unit.mjs` → Job name: "test:unit"
- `jobs/deploy/staging.mjs` → Job name: "deploy:staging"

## Template System

### Nunjucks
The template engine used by gitvan for generating text files. Based on Jinja2 syntax with support for inheritance, macros, filters, and control flow.

### Template Context
The data available within templates:
- `nowISO`: Current timestamp in ISO format
- `git`: Complete git context (branch, commits, etc.)
- Custom data passed to render functions

### Template Filters
Built-in Nunjucks filters provided by gitvan:
- `json`: Pretty-print objects as JSON
- `slug`: Convert strings to URL-friendly slugs
- `upper`: Convert strings to uppercase

## Configuration

### defineConfig()
Function that creates type-safe configuration objects for gitvan repositories. Provides defaults and validation for daemon settings, git options, and job policies.

### definePlugin()
Function that creates plugins for extending gitvan functionality. Plugins can add custom composables, execution types, and lifecycle hooks.

## Git Integration

### HEAD
The current commit that a worktree's files reflect. Accessible via `useGit().head()`.

### Branch
The current git branch name. Accessible via `useGit().branch()`.

### Note Ref
Git reference namespace used for storing notes. Gitvan uses `refs/notes/gitvan/results` for execution receipts by default.

### Repository Root
The top-level directory of a git repository containing the `.git` folder. All gitvan operations are relative to this root.

## Runtime

### unctx
The context management library that provides implicit context access to composables. Based on async_hooks in Node.js.

### withGitVan()
Function that establishes a gitvan execution context, making composables available within the provided callback function.

## Job Types

### Atomic
Jobs that perform a single operation. Can use either imperative (`run()` function) or declarative (`action` exec spec) patterns.

### Composite
Jobs that coordinate multiple operations:
- **Sequence**: Execute steps one after another
- **Parallel**: Execute steps concurrently

## Status and Results

### Job Result
The return value from job execution:
```javascript
{
  ok: boolean,        // Success/failure status
  error?: string,     // Error message if failed
  stdout?: string,    // Standard output
  artifact?: string,  // Generated file path
  meta?: object      // Additional metadata
}
```

### Execution Status
Job execution states tracked by gitvan:
- **pending**: Scheduled but not started
- **running**: Currently executing
- **completed**: Finished successfully
- **failed**: Finished with error
- **timeout**: Killed due to timeout

## Error Handling

### Happy Path
The normal execution flow when everything works correctly. Gitvan v2 is optimized for happy-path scenarios with minimal error handling overhead.

### Error Propagation
How errors flow through the system:
- Composables throw exceptions
- Job results use `{ ok: false, error: string }`
- Exec specs return error status in results

## Advanced Concepts

### Cross-Worktree Coordination
Mechanism for daemon processes in different worktrees to coordinate and avoid conflicts. Uses git refs for atomic locking.

### Event Matching
Algorithm for determining whether a git event (push, merge, etc.) should trigger specific event handlers based on file-system conventions.

### Static Analysis
The ability to inspect job metadata, schedules, and dependencies without executing the jobs. Enabled by the `defineJob()` pattern and file-system conventions.

### Deterministic Rendering
Template rendering that produces identical output for identical inputs. Important for reproducible builds and caching strategies.