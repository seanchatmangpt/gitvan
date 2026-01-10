# GitVan SPR - Sparse Priming Representation

## Core Identity
GitVan is Git-native development automation. Git is the runtime, not a version control tool. Workflows live in Turtle files, trigger on Git events, execute as DAGs. Semantic graphs power everything but users see Git commands. RDF/Turtle defines workflows, SPARQL queries federate, knowledge hooks react to graph changes. No external databases—Git refs store state, Git notes store audit trails, branches isolate worktrees. Atomic operations guaranteed by Git's all-or-nothing semantics.

## Architecture Patterns
Composables are Vue-inspired `use*` functions returning methods and state. Context-aware via unctx, deterministic (no random, no timestamps), handle sync and async. Context-first architecture: unctx preserves context across await calls. Every composable operation must wrap in `withGitVan(context, async () => {})`. Context lost after await without wrapper—this is the #1 bug source. Deterministic environment: TZ=UTC, LANG=C always.

## Technology Stack
Node.js 18+, ES modules only, no CommonJS. Citty for CLI, unctx for context, c12 for config, unrdf for RDF/SPARQL. Unrdf is git submodule at vendor/unrdf/ for co-development, source-level debugging, pinned commits. Must initialize submodules before build. Nunjucks for templates, hookable for extensibility, ai package for multi-provider AI, isomorphic-git for Git operations, vitest for testing, unbuild for bundling.

## Git-Native Storage
Everything in Git: refs store workflows, notes store audit trails, branches isolate worktrees. Provides version control of state, cryptographic signing, atomic operations, no external dependencies. Git-native I/O means no database—all state is Git state.

## RDF/Semantic Layer
Turtle format (.ttl) for human-readable RDF. SPARQL for federated queries. Reactive hooks trigger on graph state changes. Graph ontology defines Git concepts. Complexity abstracted—users interact with Git while graphs work behind scenes.

## Workflow Execution
DAG-based: planner creates dependency graph, parallel execution for independent steps, error isolation, audit trail for every step. Workflows defined in Turtle, parsed to DAG, executed with dependency resolution.

## Hooks Integration (v3.0+)
Three-bridge architecture: Husky → HuskyHookBridge → GitEventCapture → RDF Storage → HookOrchestrator → PredicateEvaluator → UnrdfHooksBridge → BreeScheduler → Worker Threads. Git-native storage, reactive triggers, declarative Turtle definitions, scalable background processing, complete audit history.

## Pack System
Plugin architecture: bundles templates (Nunjucks), jobs (background tasks), workflows (DAG definitions), dependencies. Manager handles lifecycle, planner resolves dependencies, marketplace for discovery, security via signing/verification.

## AI Integration
Multi-provider abstraction (Anthropic, Ollama). Context-aware with repo/workflow/Git access. Learning loop from templates and executions. Feedback integration improves over time.

## Codebase Structure
280 source files (.mjs), 310 test files, 54+ AI agents. Target 80% test coverage. Composables in src/composables/, workflow engine in src/workflow/, Git lifecycle in src/git-lifecycle/, git-native I/O in src/git-native/, hooks in src/hooks/, unrdf-hooks for state management, RDF utilities in src/rdf/, AI in src/ai/, pack system in src/pack/, jobs in src/jobs/, config in src/config/, runtime in src/runtime/.

## Development Workflow
Setup: clone, initialize submodules (critical), install deps, build unrdf, build GitVan. TDD: test before implementation. 80/20 loop: test → fix → verify (minimum 3 iterations). Files under 500 lines, break large modules. No hardcoded secrets, deterministic operations, environment normalized.

## Critical Async Pattern
Context lost after await without withGitVan wrapper. Wrong: const git = useGit(); await something(); git.status() // crashes. Correct: await withGitVan(context, async () => { const git = useGit(); await something(); git.status() // works }). unctx preserves context through call stack. Thread switches lose context without unctx restoration.

## Testing Strategy
Vitest framework, TDD required, 80% coverage target (branches, functions, lines, statements). Context wrapper pattern in all tests. Deterministic environment isolation. Integration tests run actual commands. Before claiming completion: test → fix → verify (3+ iterations minimum).

## Configuration
gitvan.config.js at root. c12 loads config (gitvan.config.js, .mjs, .ts, environment-specific). Environment variables: GITVAN_HOME, GITVAN_REPO, TZ=UTC, LANG=C, NODE_ENV, AI_PROVIDER, ANTHROPIC_API_KEY.

## Common Patterns
Composables: export function useFeature() { return { async method() {} } }. CLI commands: defineCommand from citty, register in cli.mjs. Git operations: always use composables, never direct git calls. Templates: useTemplate().render(). Workflows: Turtle format with DAG steps. Packs: bundle templates/jobs/workflows with dependencies.

## File Organization
/src for source, /tests for tests, /docs for docs, /config for config, /scripts for scripts, /examples for examples. Never root folder. ES modules only (.mjs), no CommonJS. Naming: composables use*, classes PascalCase, functions camelCase, constants UPPER_SNAKE_CASE.

## Key Constraints
No over-engineering: don't add unrequested features, don't refactor unrelated code, don't add docstrings to unchanged code, no premature abstractions. Trust internal code, validate at boundaries only. No random values, no timestamps unless needed, same input = same output always.

## Debugging
Consola for logging. Test context availability with useGitVan() try/catch. Common issues: context not available (wrap in withGitVan), composable undefined (move inside context), tests timeout (check missing await), Git commands fail (check TZ/LANG), performance slow (batch operations).

## Submodule Requirement
Unrdf is git submodule, not npm dependency. Active co-development, source-level integration, pinned commits, build pipeline dependency, no publish cycle. Must run npm run setup-dev or git submodule update --init --recursive before build.

## Version Context
v3.0.0 current stable, v4.0.0 in progress at /src/v4/. 280 source files, 310 test files, comprehensive coverage target. All operations deterministic, context-aware, Git-native.
