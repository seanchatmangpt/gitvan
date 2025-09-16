# GitVan System Architecture Overview

## System Vision
GitVan is a Git-only workflow engine that implements the 43 classic van der Aalst workflow patterns using Git primitives. It eliminates the need for external infrastructure by treating Git as the runtime, data store, and execution environment.

## Core Principles

### 1. Git as the Runtime
- **No Servers**: No hosted runners, databases, or message queues
- **Git is the Queue**: Workflow state stored in Git notes and refs
- **Deterministic**: Content-addressable storage ensures reproducible results
- **Auditable**: Cryptographic signatures and immutable history by default

### 2. Pattern-Driven Design
- **43 Patterns**: Complete implementation of van der Aalst's workflow patterns
- **Git Mapping**: Each pattern maps to specific Git primitives (commits, branches, merges, tags, notes)
- **Composable**: Complex workflows built from simple pattern combinations
- **Type-Safe**: Zod schemas validate all workflow definitions

### 3. Developer-Centric
- **Noun-Verb CLI**: Intuitive command structure (`gitvan recipe run changelog`)
- **Configuration as Code**: Workflows defined in `gitvan.config.js`
- **No YAML**: Pure JavaScript configuration and recipes
- **80/20 Focus**: Optimized for common developer tasks (diaries, changelogs, reviews)

## Architecture Layers

### Application Layer
```
@gitvan/cli        - Command-line interface (noun-verb commands)
@gitvan/daemon     - Background event processor
@gitvan/cookbook   - Pre-built workflow recipes
```

### Domain Layer
```
@gitvan/core       - Workflow patterns and Git operations
@gitvan/schemas    - Type definitions and validation
@gitvan/llm        - LLM integration with deterministic outputs
```

### Infrastructure Layer
```
Git Repository     - Source code and workflow state
Git Notes          - Workflow data and execution receipts
Git Refs           - Execution locks and policies
Ollama LLM         - Local language model provider
```

## Key Components

### @gitvan/core Package
The heart of the system containing:
- **git.js**: Git command wrapper with safety and error handling
- **workflow.js**: 43 pattern implementations mapping to Git primitives
- **notes.js**: Git notes management for workflow data storage
- **config.js**: Configuration loading with environment overrides

### @gitvan/daemon Package
Event-driven background processor featuring:
- **predicates.js**: Event detection (commits, tags, cron, file changes)
- **actions.js**: Workflow step execution (CLI calls, LLM calls, JS modules)
- **loop.js**: Main event loop with idempotency guarantees

### @gitvan/cli Package
Command interface providing:
- Noun-verb command structure (`repo`, `recipe`, `cookbook`, `daemon`)
- Recipe management and execution
- Configuration management
- Daemon lifecycle control

## 43 Patterns → Git Mapping

### Control Flow Patterns (1-20)
- **Sequence**: Empty commits with workflow messages
- **Parallel Split**: Branch creation for concurrent execution
- **Synchronization**: Merge commits for parallel join
- **Exclusive Choice**: Conditional branching based on predicates
- **Simple Merge**: Merge strategies for converging paths

### Multiple Instance Patterns (21-34)
- **Multiple Instances**: Parallel branches for batch processing
- **Static/Dynamic Partial Join**: Selective merge strategies
- **Blocking/Non-blocking**: Different merge completion criteria

### State-based Patterns (35-43)
- **Deferred Choice**: Lazy evaluation with conditional logic
- **Milestone**: Git tags for workflow checkpoints
- **Cancel Activity**: Branch deletion for workflow termination

## Data Storage Strategy

### Workflow Definitions
```
Location: refs/notes/gitvan
Format: JSON objects describing events, recipes, and configurations
Example: Cron schedules, event triggers, recipe steps
```

### Execution Receipts
```
Location: refs/notes/gitvan/results
Format: Signed JSON records of workflow execution
Contains: Timestamps, commit SHAs, outputs, error logs
```

### Execution Locks
```
Location: refs/workflow/executions/<id>
Purpose: Prevent duplicate execution, ensure idempotency
Cleanup: Automatic removal on completion or timeout
```

### Policies
```
Location: refs/gitvan/policy/*
Purpose: Access controls, approval workflows, compliance rules
Format: JSON policy documents with allow/deny rules
```

## 80/20 Workflow Focus

GitVan optimizes for the most common developer workflow needs:

### Dev Diary (Daily)
- **Trigger**: Cron at 6 PM daily
- **Action**: LLM summarizes day's commits
- **Output**: Structured diary entry in notes
- **Value**: Automatic documentation of daily progress

### Changelog (On Release)
- **Trigger**: Semver tag creation
- **Action**: Collect commits since last tag
- **Output**: Formatted CHANGELOG.md
- **Value**: Automated release documentation

### Code Review (On Merge)
- **Trigger**: Merge commit to main
- **Action**: LLM analysis of changes
- **Output**: Review summary and suggestions
- **Value**: Consistent code quality feedback

### Release Notes (On Tag)
- **Trigger**: Version tag
- **Action**: Aggregate features and fixes
- **Output**: Formatted release notes
- **Value**: Professional release communication

## Security and Compliance

### Deterministic Receipts
- Every workflow execution generates a signed receipt
- LLM calls include model version, prompt, and seed for reproducibility
- Receipts stored immutably in Git notes
- Cryptographic signatures prevent tampering

### Policy Enforcement
- Git hooks enforce signing requirements
- Protected branches control workflow modifications
- Separation of duties through multi-signature requirements
- Audit trails through Git history

### Disaster Recovery
- Standard Git backup strategies apply
- Repository mirroring for high availability
- Disaster recovery through Git clone/restore
- Organizational audit packs for compliance

## Operational Model

### Development Workflow
1. **Initialize**: `gitvan repo init` sets up repository
2. **Configure**: Edit `gitvan.config.js` with workflows
3. **Apply**: `gitvan config apply` installs workflows as Git notes
4. **Execute**: `gitvan daemon start` begins background processing

### Scaling Strategy
- **Horizontal**: Multiple repositories for team/project isolation
- **Vertical**: Workspaces and submodules for complex projects
- **Federation**: Cross-repository workflows via Git remotes
- **Optimization**: Repository sharding for high-volume workflows

## Technology Choices

### Why JavaScript/Node.js
- **Ecosystem**: Rich npm ecosystem for Git operations
- **Performance**: Adequate for workflow orchestration needs
- **Familiarity**: JavaScript is ubiquitous in development teams
- **Simplicity**: No compilation step, easy deployment

### Why Ollama for LLM
- **Local**: No external API dependencies or data privacy concerns
- **Deterministic**: Seeded generation for reproducible outputs
- **Flexible**: Multiple model support for different use cases
- **Cost**: No per-token pricing, unlimited local usage

### Why Git Notes
- **Structured**: JSON data storage within Git repository
- **Versioned**: Full history of workflow state changes
- **Distributed**: Replicated with repository across teams
- **Queryable**: Git commands can filter and search notes

This architecture provides a foundation for building complex, auditable workflows while maintaining the simplicity and reliability of Git-based development practices.