# GitVan v2 Implementation Plan

## Executive Summary

GitVan v2 represents a complete architectural transformation from a TypeScript monorepo to a single-package ESM runtime with Git-native execution. This plan outlines the comprehensive migration strategy, implementation priorities, and delivery milestones.

## Current State Analysis

### Existing Architecture (v1 - Monorepo)
- **Structure**: TypeScript monorepo with 6 packages (core, cli, daemon, llm, schemas, cookbook)
- **Runtime**: TypeScript compilation required
- **Dependencies**: Complex inter-package dependencies
- **Execution**: Traditional CI/SaaS workflow automation
- **State**: External state management with schemas

### Target Architecture (v2 - Single Package)
- **Structure**: Single ESM package with modular exports
- **Runtime**: Pure JavaScript with TypeScript definitions
- **Dependencies**: Minimal (unctx, hookable, nunjucks, citty, pathe)
- **Execution**: Git-native with composables and filesystem routing
- **State**: Git objects, refs, and notes only

## Migration Strategy

### Phase 1: Foundation (Weeks 1-2)
**Priority: CRITICAL (80% value delivery)**

#### 1.1 Project Structure Migration
- [ ] Convert from monorepo to single package structure
- [ ] Migrate from TypeScript to ESM JavaScript
- [ ] Create new package.json with v2 dependencies
- [ ] Set up exports map for modular imports

#### 1.2 Core Type System
- [ ] Create comprehensive TypeScript definitions (`types/index.d.ts`)
- [ ] Define execution types: `cli | js | llm | job | tmpl`
- [ ] Implement `ExecSpec` union types
- [ ] Set up module declarations for `gitvan/*` imports

#### 1.3 Context System (unctx)
- [ ] Implement `withGitVan()` and `useGitVan()` context providers
- [ ] Create async context for composables
- [ ] Enable safe concurrent execution across jobs

### Phase 2: Core Runtime (Weeks 3-4)
**Priority: CRITICAL (80% value delivery)**

#### 2.1 Git Composables (`src/composables/git.mjs`)
- [ ] Implement 80/20 Git command wrappers
- [ ] Add worktree support with `listWorktrees()`, `worktreeId()`
- [ ] Implement notes management (add, append, show, copy)
- [ ] Add refs management (setRef, delRef, listRefs, updateRefStdin)
- [ ] Support both worktree and repo operations

**Key Methods:**
```javascript
// Repo operations
status(), remoteAdd(), fetch(), pull(), push()

// Index/workspace
add(), rm(), mv(), checkout(), switch()

// Commits/tags
commit(), tag(), describe(), show()

// Branches
branchCreate(), branchDelete(), currentBranch()

// Integration
merge(), rebase(), cherryPick(), revert(), resetHard()
stashSave(), stashApply()

// History/search
log(), grep()

// Worktrees
worktreeAdd(), worktreeRemove(), worktreePrune()

// Submodules
submoduleAdd(), submoduleUpdate()
```

#### 2.2 Template System (`src/composables/template.mjs`)
- [ ] Integrate Nunjucks as first-class executor
- [ ] Implement `useTemplate()` composable
- [ ] Add deterministic filters (json, slug, upper)
- [ ] Support `render()` and `renderToFile()` operations
- [ ] Enable template paths and autoescape options

#### 2.3 Execution System (`src/runtime/exec.mjs`)
- [ ] Implement `runExec()` for all execution types
- [ ] Support `cli` execution with spawning
- [ ] Support `js` module execution with dynamic imports
- [ ] Support `tmpl` execution via Nunjucks
- [ ] Support `llm` execution via Ollama
- [ ] Support `job` execution with job registry

### Phase 3: Events & Filesystem Routing (Weeks 5-6)
**Priority: HIGH (15% value delivery)**

#### 3.1 Filesystem Event Router (`src/runtime/events/fs-router.mjs`)
- [ ] Implement unrouting-style path parsing
- [ ] Support directory-based event routing:
  - `events/cron/0_3_*_*_*.mjs`
  - `events/merge-to/main.mjs`
  - `events/push-to/release/*.mjs`
  - `events/path-changed/src/[...slug].mjs`
  - `events/tag/semver.mjs`
  - `events/message/^release:/.mjs`
  - `events/author/@company\.com/.mjs`

#### 3.2 Event Matching (`src/runtime/events/match.mjs`)
- [ ] Implement commit metadata extraction
- [ ] Support event predicate evaluation
- [ ] Add regex pattern matching for paths/messages
- [ ] Implement glob pattern matching for branches/tags
- [ ] Support merge detection and branch containment

#### 3.3 Job Discovery (`src/runtime/jobs.mjs`)
- [ ] Implement filesystem job scanning
- [ ] Support `jobs/**/*.mjs` pattern matching
- [ ] Create job name mapping from directory structure
- [ ] Load job modules with `defineJob` validation

### Phase 4: Locks & Receipts (Weeks 7-8)
**Priority: HIGH (15% value delivery)**

#### 4.1 Atomic Locking (`src/runtime/locks.mjs`)
- [ ] Implement git ref-based locks
- [ ] Support worktree-scoped locking: `refs/gitvan/locks/<wt>/<event>/<sha>`
- [ ] Add atomic lock acquisition via `update-ref --stdin`
- [ ] Implement lock release and cleanup

#### 4.2 Receipt System (`src/runtime/receipt.mjs`)
- [ ] Implement structured receipt writing to git notes
- [ ] Support receipt schema with status, artifacts, metadata
- [ ] Add worktree information to receipts
- [ ] Implement append-only receipt logging

#### 4.3 Idempotency
- [ ] Ensure once-only execution per commit/event/worktree
- [ ] Implement run key generation
- [ ] Add collision detection and backoff

### Phase 5: Daemon & CLI (Weeks 9-10)
**Priority: MEDIUM (5% value delivery)**

#### 5.1 Daemon Implementation (`src/runtime/daemon.mjs`)
- [ ] Implement per-worktree execution loops
- [ ] Add recent commit scanning with lookback
- [ ] Support multiple worktree selection modes
- [ ] Implement polling with configurable intervals
- [ ] Add execution throttling (maxPerTick)

#### 5.2 CLI Commands (`src/cli/`)
- [ ] Implement noun-verb command structure
- [ ] Add `gitvan job list|run` commands
- [ ] Add `gitvan event list` command
- [ ] Add `gitvan schedule apply` command
- [ ] Add `gitvan daemon start` with worktree options
- [ ] Add `gitvan worktree list` command

#### 5.3 Configuration (`src/runtime/config.mjs`)
- [ ] Implement configuration loading and merging
- [ ] Support `gitvan.config.js` files
- [ ] Provide sensible defaults for all options
- [ ] Add configuration validation

## Breaking Changes from v1

### Architecture Changes
1. **Monorepo → Single Package**: Complete restructuring
2. **TypeScript → JavaScript**: Runtime TypeScript removal
3. **Package Dependencies**: Elimination of inter-package dependencies
4. **Import Paths**: New modular export structure

### API Changes
1. **Job Definition**: `defineJob()` replaces existing job structures
2. **Execution Types**: New `ExecSpec` union with 5 execution modes
3. **Context System**: `useGitVan()` context replaces direct imports
4. **Event Routing**: Filesystem-based routing replaces programmatic
5. **Template System**: Nunjucks becomes first-class citizen

### Data Migration
1. **Recipes**: Convert JSON recipes to `defineJob()` format
2. **Schemas**: Eliminate external schemas, use Git objects
3. **Configuration**: Migrate to new config structure
4. **State**: Migrate external state to Git refs/notes

## 80/20 Analysis

### Core Features (80% Value)
1. **Git Composables** - Essential Git operations wrapper
2. **Job Definition** - `defineJob()` with `run()` functions
3. **Template System** - Nunjucks integration for outputs
4. **Context System** - Safe async execution context
5. **Basic Execution** - `cli`, `js`, `tmpl` execution types

### Advanced Features (20% Value - Defer)
1. **LLM Integration** - Ollama integration (optional)
2. **Complex Event Patterns** - Advanced routing patterns
3. **Multi-repo Orchestration** - Submodule/worktree coordination
4. **Performance Optimization** - Caching and parallelization
5. **Advanced Security** - Signed policies and SoD

## Dependencies Analysis

### Required NPM Packages
```json
{
  "dependencies": {
    "hookable": "^5.5.3",      // Plugin hooks
    "nunjucks": "^3.2.4",      // Template engine
    "pathe": "^1.1.2",         // Path utilities
    "unctx": "^2.3.1",         // Async context
    "citty": "^0.1.6"          // CLI framework
  }
}
```

### Removed Dependencies
- All TypeScript compilation dependencies
- Inter-package dependencies
- Complex build tooling
- External state management libraries

## API Contracts

### Job Definition Contract
```javascript
export default defineJob({
  kind: 'atomic' | 'pipeline' | 'fanout' | 'gate',
  meta: { desc: string, ...any },
  async run({ payload, ctx }) {
    const git = useGit()
    const template = useTemplate()
    const exec = useExec()
    // Implementation
    return { ok: boolean, artifact?: string, meta?: any }
  }
})
```

### Event Binding Contract
```javascript
// File: events/message/^release:/.mjs
export default { job: 'docs:changelog' }
// OR
export default { run: { exec: 'cli', cmd: 'echo', args: ['release'] } }
```

### Composables Contract
```javascript
const git = useGit()        // Git operations
const tmpl = useTemplate()  // Nunjucks rendering
const exec = useExec()      // Execution runner
const ctx = useGitVan()     // Context access
```

## Testing Strategy

### Unit Tests
- [ ] Git composables operations
- [ ] Template rendering functionality
- [ ] Execution type handling
- [ ] Event routing and matching
- [ ] Lock acquisition and release

### Integration Tests
- [ ] End-to-end job execution
- [ ] Worktree isolation
- [ ] Receipt generation
- [ ] Daemon polling and execution
- [ ] CLI command functionality

### Migration Tests
- [ ] v1 to v2 migration scenarios
- [ ] Recipe conversion validation
- [ ] Configuration migration
- [ ] State transition verification

## Migration Steps

### Step 1: Preparation
1. Create backup of current v1 codebase
2. Set up new v2 project structure
3. Install new dependencies
4. Create basic TypeScript definitions

### Step 2: Core Migration
1. Implement context system and composables
2. Migrate core Git operations
3. Set up job definition and loading
4. Implement basic execution system

### Step 3: Event System
1. Implement filesystem event routing
2. Add event matching and predicate evaluation
3. Set up daemon execution loop
4. Add lock and receipt systems

### Step 4: CLI & Polish
1. Implement CLI commands
2. Add configuration loading
3. Create comprehensive tests
4. Write documentation and examples

### Step 5: Validation
1. Test all cookbook recipes
2. Validate performance targets
3. Ensure security requirements
4. Prepare release artifacts

## Delivery Milestones

### Milestone 1: MVP Runtime (Week 4)
- [ ] Context system working
- [ ] Basic Git composables
- [ ] Simple job execution
- [ ] Template rendering

### Milestone 2: Event System (Week 6)
- [ ] Filesystem event routing
- [ ] Event matching logic
- [ ] Basic daemon functionality
- [ ] Lock/receipt system

### Milestone 3: Complete Feature Set (Week 8)
- [ ] All execution types working
- [ ] Worktree support
- [ ] Full CLI functionality
- [ ] Configuration system

### Milestone 4: Production Ready (Week 10)
- [ ] Comprehensive test suite
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation complete

## Risk Mitigation

### Technical Risks
1. **Git Command Compatibility** - Test across platforms
2. **Concurrency Issues** - Validate lock mechanisms
3. **Performance Degradation** - Benchmark against targets
4. **Memory Leaks** - Test long-running daemon

### Migration Risks
1. **Data Loss** - Comprehensive backup strategy
2. **API Compatibility** - Gradual migration path
3. **User Adoption** - Clear migration documentation
4. **Ecosystem Impact** - Plugin compatibility layer

## Success Metrics

### Performance Targets
- Time to first working job: < 10 minutes
- p95 job execution time: < 300ms
- Audit bundle generation: < 5 minutes
- Recipe replacement ratio: ≥ 3 CI jobs per team

### Quality Targets
- Test coverage: > 90%
- TypeScript definition completeness: 100%
- Documentation coverage: 100%
- Platform compatibility: Linux, macOS, Windows

## Next Actions

1. **Immediate**: Begin Phase 1 foundation work
2. **Week 1**: Set up project structure and dependencies
3. **Week 2**: Implement context system and basic composables
4. **Week 3**: Begin Git operations and execution system
5. **Week 4**: Complete MVP runtime milestone

## Conclusion

GitVan v2 represents a fundamental shift towards Git-native execution with significant simplification of the architecture. The 80/20 approach ensures rapid delivery of core value while maintaining extensibility for advanced features. The migration requires careful coordination but delivers substantial benefits in simplicity, performance, and maintainability.