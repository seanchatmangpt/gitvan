# GitVan Playground - Architecture Guide

## 🏗️ Architecture Overview

The GitVan playground demonstrates a complete Git-native job execution system with advanced features including job discovery, execution, template rendering, git integration, cron scheduling, event-driven jobs, and hooks.

## 📐 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitVan Playground                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Job CLI   │  │   Daemon    │  │   Config    │        │
│  │             │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Job Runner  │  │  Template   │  │    Git      │        │
│  │             │  │   Engine    │  │  Composable │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Cron     │  │   Events    │  │   Hooks     │        │
│  │ Scheduler  │  │ Evaluator   │  │   System    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Git      │  │   File      │  │   Config    │        │
│  │ Operations │  │   System    │  │   System    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Component Relationships

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   dev.mjs   │───▶│  Job CLI    │───▶│ Job Runner  │
│             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Config    │    │   Daemon    │    │   Git       │
│   Loader    │    │             │    │ Composable  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Template   │    │   Cron      │    │   Events    │
│   Engine    │    │ Scheduler   │    │ Evaluator   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🔧 Core Components

### 1. Job Discovery System

**Purpose**: Automatically discover and load job definitions from the filesystem.

**Components**:
- `src/jobs/scan.mjs` - File system scanning
- `src/jobs/define.mjs` - Job definition validation
- `tinyglobby` - Pattern matching for job files

**Flow**:
```
File System → tinyglobby → Dynamic Import → Validation → Job Registry
```

**Key Features**:
- Recursive directory scanning
- Pattern matching (`jobs/**/*.mjs`)
- Dynamic ES module imports
- Job ID inference from file paths
- Mode detection (`.cron.mjs`, `.evt.mjs`)

### 2. Job Execution Engine

**Purpose**: Execute jobs with proper context, locking, and error handling.

**Components**:
- `src/jobs/runner.mjs` - Main execution engine
- `src/composables/git.mjs` - Git operations
- `src/composables/template.mjs` - Template rendering

**Flow**:
```
Job Definition → Lock Acquisition → Context Building → Execution → Receipt Writing → Lock Release
```

**Key Features**:
- Atomic locking with Git refs
- Rich execution context
- Error handling and recovery
- Receipt generation
- Artifact management

### 3. Template System

**Purpose**: Render dynamic content using Nunjucks templates.

**Components**:
- `src/utils/nunjucks-config.mjs` - Template configuration
- `nunjucks` - Template engine
- Custom filters for string transformations

**Flow**:
```
Template File → Nunjucks Engine → Custom Filters → Rendered Output
```

**Key Features**:
- Nunjucks template engine
- Custom inflection filters
- Template caching
- File and string rendering
- Dynamic variable injection

### 4. Git Integration

**Purpose**: Provide Git-native operations and storage.

**Components**:
- `src/composables/git.mjs` - Git operations wrapper
- Git refs for locking
- Git notes for receipts
- Git log parsing

**Flow**:
```
Git Commands → execFile → Error Handling → Formatted Output
```

**Key Features**:
- POSIX-first Git operations
- Deterministic environment
- Error handling
- Repository information
- Commit history parsing

### 5. Cron Scheduler

**Purpose**: Execute jobs on a schedule using cron expressions.

**Components**:
- `src/jobs/cron.mjs` - Cron parsing and scheduling
- `JobDaemon` - Daemon orchestration
- Cron expression validation

**Flow**:
```
Cron Expression → Parser → Schedule → Timer → Job Execution
```

**Key Features**:
- Cron expression parsing
- Schedule management
- Next execution calculation
- Daemon integration

### 6. Event System

**Purpose**: Trigger jobs based on Git events using predicates.

**Components**:
- `src/jobs/events.mjs` - Event evaluation
- Event predicates
- Git event detection

**Flow**:
```
Git Events → Predicate Evaluation → Job Triggering → Execution
```

**Key Features**:
- Event predicate evaluation
- Git event detection
- Logical operators (any/all)
- Pattern matching
- Daemon integration

### 7. Hooks System

**Purpose**: Provide extensibility through lifecycle hooks.

**Components**:
- `src/jobs/hooks.mjs` - Hooks management
- `unjs/hookable` - Hook implementation
- Default hooks

**Flow**:
```
Job Lifecycle → Hook Registration → Hook Execution → Custom Logic
```

**Key Features**:
- Lifecycle hooks
- Custom hook registration
- Default hooks
- Hook statistics
- Error handling

## 🔄 Data Flow

### Job Execution Flow

```
1. Job Discovery
   ├── Scan filesystem for job files
   ├── Load job definitions
   └── Validate job schemas

2. Job Execution
   ├── Acquire lock (Git ref)
   ├── Build execution context
   ├── Execute job function
   ├── Write receipt (Git notes)
   └── Release lock

3. Template Rendering
   ├── Load template file
   ├── Apply custom filters
   ├── Inject variables
   └── Generate output

4. Git Operations
   ├── Execute Git commands
   ├── Parse output
   ├── Handle errors
   └── Return formatted data
```

### Daemon Flow

```
1. Daemon Startup
   ├── Load configuration
   ├── Initialize schedulers
   ├── Start cron scheduler
   └── Start event monitor

2. Cron Scheduling
   ├── Parse cron expressions
   ├── Calculate next execution
   ├── Schedule timer
   └── Execute jobs

3. Event Monitoring
   ├── Monitor Git events
   ├── Evaluate predicates
   ├── Trigger jobs
   └── Process results

4. Daemon Shutdown
   ├── Stop schedulers
   ├── Clean up resources
   └── Graceful exit
```

## 🗂️ File Organization

### Directory Structure

```
playground/
├── dev.mjs                 # Main entry point
├── gitvan.config.js        # Configuration
├── package.json            # Dependencies
├── jobs/                   # Job definitions
│   ├── docs/
│   │   └── changelog.mjs   # Changelog job
│   ├── test/
│   │   ├── simple.mjs      # Simple job
│   │   └── cleanup.cron.mjs # Cron job
│   └── alerts/
│       └── release.evt.mjs # Event job
├── templates/              # Template files
│   └── changelog.njk       # Changelog template
└── dist/                   # Generated output
    ├── CHANGELOG.md        # Generated changelog
    ├── status-report.json  # Generated report
    └── notifications/      # Release notifications
```

### Import Dependencies

```
dev.mjs
├── src/jobs/scan.mjs
├── src/jobs/runner.mjs
├── src/jobs/daemon.mjs
├── src/config/loader.mjs
└── src/jobs/hooks.mjs

jobs/*.mjs
├── gitvan/define
├── gitvan/useGit
└── gitvan/useTemplate

templates/*.njk
└── Nunjucks engine
```

## 🔐 Security Considerations

### Git Operations

- **Read-only by default**: Most operations are read-only
- **Atomic operations**: Lock acquisition prevents conflicts
- **Error handling**: Graceful failure without corruption
- **Permission checks**: Verify Git repository access

### File System

- **Path validation**: Prevent directory traversal
- **Permission checks**: Verify file system access
- **Cleanup**: Remove temporary files
- **Error handling**: Handle file system errors

### Job Execution

- **Sandboxing**: Jobs run in controlled environment
- **Resource limits**: Prevent resource exhaustion
- **Error isolation**: Job failures don't affect system
- **Audit trail**: Complete execution history

## ⚡ Performance Considerations

### Caching

- **Template caching**: Cache compiled templates
- **Job discovery**: Cache job definitions
- **Git operations**: Cache repository information
- **Configuration**: Cache loaded configuration

### Optimization

- **Parallel execution**: Run independent operations in parallel
- **Resource pooling**: Reuse expensive resources
- **Lazy loading**: Load resources on demand
- **Memory management**: Clean up unused resources

### Monitoring

- **Execution time**: Track job performance
- **Resource usage**: Monitor memory and CPU
- **Error rates**: Track failure rates
- **Throughput**: Measure job processing rate

## 🔧 Configuration Architecture

### Configuration Loading

```
gitvan.config.js → c12 → defu → normalizeRuntimeConfig → Final Config
```

### Configuration Hierarchy

1. **Defaults**: Built-in default values
2. **User Config**: `gitvan.config.js` file
3. **Environment**: Environment variables
4. **Runtime**: Runtime overrides

### Configuration Validation

- **Schema validation**: Validate configuration structure
- **Type checking**: Ensure correct data types
- **Value validation**: Check value ranges and formats
- **Dependency validation**: Verify required dependencies

## 🧪 Testing Architecture

### Test Types

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Component interaction testing
3. **E2E Tests**: Full system testing
4. **Performance Tests**: Performance validation

### Test Structure

```
tests/
├── playground-e2e.test.mjs  # E2E tests
├── composables.test.mjs    # Composable tests
├── config-simple.test.mjs  # Config tests
└── nunjucks-config.test.mjs # Template tests
```

### Test Execution

- **Vitest**: Test runner and framework
- **E2E Testing**: Full playground validation
- **Mocking**: Isolated component testing
- **Coverage**: Test coverage reporting

## 🚀 Deployment Architecture

### Development Mode

- **Hot reload**: File watching and reloading
- **Debug logging**: Detailed execution logs
- **Error reporting**: Comprehensive error information
- **Development tools**: Enhanced debugging capabilities

### Production Mode

- **Optimized performance**: Caching and optimization
- **Error handling**: Graceful error recovery
- **Logging**: Production-appropriate logging
- **Monitoring**: Performance and health monitoring

### CI/CD Integration

- **Automated testing**: Run tests on changes
- **Deployment**: Automated deployment pipeline
- **Monitoring**: Continuous monitoring
- **Rollback**: Quick rollback capabilities

## 📊 Monitoring and Observability

### Metrics

- **Job execution time**: Performance metrics
- **Success/failure rates**: Reliability metrics
- **Resource usage**: Resource consumption
- **Throughput**: Job processing rate

### Logging

- **Structured logging**: JSON-formatted logs
- **Log levels**: Debug, info, warn, error
- **Context information**: Rich context data
- **Log aggregation**: Centralized logging

### Health Checks

- **System health**: Overall system status
- **Component health**: Individual component status
- **Dependency health**: External dependency status
- **Performance health**: Performance indicators

This architecture guide provides a comprehensive understanding of the GitVan playground system design and implementation.
