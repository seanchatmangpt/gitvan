# Architecture Decision Records (ADRs)

## ADR-001: Single Package Architecture

**Status**: Accepted

**Context**:
The original monorepo approach with multiple packages (`@gitvan/core`, `@gitvan/cli`, etc.) added unnecessary complexity for a tool that fundamentally operates as a unified runtime. The interdependencies between packages created circular dependencies and deployment complexity.

**Decision**:
We will use a single package structure with clear internal module boundaries rather than separate npm packages.

**Consequences**:
- **Positive**: Simpler dependency management, easier development workflow, reduced build complexity
- **Positive**: Eliminates circular dependency issues between core/cli/runtime
- **Negative**: Less module isolation, requires disciplined internal boundaries
- **Negative**: Larger package size for users who only need specific functionality

## ADR-002: Nunjucks Template Engine

**Status**: Accepted

**Context**:
Template generation is a core use case for gitvan (changelogs, documentation, etc.). We evaluated several options:
- Handlebars: Limited logic capabilities
- EJS: Too JavaScript-heavy, security concerns
- Mustache: Too limited for complex use cases
- Nunjucks: Jinja2-like syntax, deterministic, good ecosystem

**Decision**:
We will use Nunjucks as the first-class template executor with `exec: 'tmpl'`.

**Consequences**:
- **Positive**: Powerful template syntax with inheritance, macros, filters
- **Positive**: Deterministic rendering (important for reproducible builds)
- **Positive**: Well-established syntax familiar to Python/Jinja2 users
- **Negative**: Additional dependency (~200KB)
- **Negative**: Learning curve for users unfamiliar with Jinja2-style templates

## ADR-003: unctx Context Management

**Status**: Accepted

**Context**:
Jobs need access to git context, configuration, and runtime state. Options considered:
- Global variables: Not testable, not thread-safe
- Dependency injection: Too verbose, complex API
- React-style context: Familiar pattern, but overkill
- unctx: Minimal, Vue-inspired, designed for this use case

**Decision**:
We will use unctx for context management with composables pattern (`useGit()`, `useTemplate()`, etc.).

**Consequences**:
- **Positive**: Clean, testable API that doesn't require explicit context passing
- **Positive**: Familiar to Vue.js users, minimal learning curve
- **Positive**: Enables elegant composables pattern
- **Negative**: Magic globals may confuse users expecting explicit dependencies
- **Negative**: Additional abstraction layer

## ADR-004: Git Refs for Atomic Locking

**Status**: Accepted

**Context**:
Multiple daemon processes need coordination to avoid conflicts. Traditional file locking doesn't work well across git worktrees. Options:
- File system locks: Don't work across worktrees, platform-specific
- Database locks: Adds external dependency
- Git refs: Native to git, atomic, cross-platform, survives process crashes

**Decision**:
We will use git references (`refs/gitvan/locks/*`) for atomic locking mechanism.

**Consequences**:
- **Positive**: Atomic operations via git's native locking
- **Positive**: Works across all git worktrees and remotes
- **Positive**: No external dependencies, leverages existing git infrastructure
- **Positive**: Survives daemon crashes (refs persist)
- **Negative**: Slightly more complex than file locks
- **Negative**: Requires understanding of git refs for debugging

## ADR-005: Per-Worktree Daemon Architecture

**Status**: Accepted

**Context**:
Git worktrees enable parallel development on different branches. Each worktree should have independent job execution to avoid conflicts. Options:
- Single global daemon: Causes conflicts between worktrees
- Per-repository daemon: Still conflicts on different branches
- Per-worktree daemon: Isolated execution, matches git's model

**Decision**:
We will run one daemon per git worktree, with independent state and job execution.

**Consequences**:
- **Positive**: Complete isolation between different branches/worktrees
- **Positive**: Matches git's natural workflow patterns
- **Positive**: Parallel development without interference
- **Negative**: Higher resource usage (multiple processes)
- **Negative**: More complex process management
- **Negative**: Requires coordination for shared resources

## ADR-006: defineJob Contract Pattern

**Status**: Accepted

**Context**:
Jobs need both declarative metadata (for scheduling, discovery, tooling) and imperative execution logic. Pure functions are hard to introspect. Pure data structures can't execute. Hybrid approaches in other tools are verbose.

**Decision**:
We will use `defineJob()` as a lightweight wrapper that provides both declarative contracts and executable logic.

**Consequences**:
- **Positive**: Static analysis possible for tooling (schedules, dependencies, documentation)
- **Positive**: Minimal overhead, just a pass-through function
- **Positive**: Clean separation between contract (metadata) and implementation (run function)
- **Negative**: Additional abstraction that some users may find unnecessary
- **Negative**: Requires discipline to keep metadata accurate

## ADR-007: Composables Over Dependency Injection

**Status**: Accepted

**Context**:
Jobs need access to git operations, templating, execution, etc. Traditional approaches:
- Constructor injection: Verbose, requires wiring
- Service locator: Global registry, testing issues
- Passing context objects: Pollutes function signatures

**Decision**:
We will use composables (`useGit()`, `useTemplate()`, `useExec()`) that access context automatically.

**Consequences**:
- **Positive**: Clean, readable job code without boilerplate
- **Positive**: Easy to test (just mock the context)
- **Positive**: Familiar pattern from Vue.js ecosystem
- **Negative**: Implicit dependencies may be less obvious
- **Negative**: Requires understanding of context scoping

## ADR-008: Pure JavaScript Runtime

**Status**: Accepted

**Context**:
While TypeScript provides excellent development experience, the runtime should be pure JavaScript for:
- Faster startup times
- No compilation step for end users
- Simpler deployment
- Lower resource usage

**Decision**:
Core runtime will be pure JavaScript with TypeScript definitions for development.

**Consequences**:
- **Positive**: Faster cold starts, no compilation overhead
- **Positive**: Simpler user experience (no build step required)
- **Positive**: Easier to debug (no source maps needed)
- **Negative**: Less type safety in runtime code
- **Negative**: More complex development workflow (maintain separate .d.ts files)

## ADR-009: File-Based Convention Over Configuration

**Status**: Accepted

**Context**:
Configuration management adds complexity. File-based conventions are self-documenting and reduce cognitive overhead. Following established patterns from Next.js, Nuxt, etc.

**Decision**:
Use file system conventions for:
- `jobs/` directory structure defines job names
- `events/` directory structure defines event triggers
- `templates/` directory for Nunjucks templates

**Consequences**:
- **Positive**: Zero configuration for common cases
- **Positive**: Self-documenting project structure
- **Positive**: Familiar to users of modern frameworks
- **Negative**: Less flexible for complex routing needs
- **Negative**: File system constraints limit naming options

## ADR-010: Receipts via Git Notes

**Status**: Accepted

**Context**:
Job execution results need to be stored for audit, debugging, and coordination. Options:
- Database storage: External dependency
- File system: Not atomic, cleanup issues
- Git notes: Atomic, tied to commits, built-in

**Decision**:
Store execution receipts as git notes on commits using structured JSON.

**Consequences**:
- **Positive**: Atomic storage tied to specific commits
- **Positive**: No external storage dependencies
- **Positive**: Survives repository clones (if notes are pushed)
- **Positive**: Built-in git tooling for inspection
- **Negative**: Notes may not be pushed by default (user education needed)
- **Negative**: Large notes can impact performance