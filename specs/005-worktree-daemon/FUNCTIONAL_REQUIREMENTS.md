# Worktree Daemon - Functional Requirements

## Core Daemon Operations

### Process Management
- Start daemon process with proper daemonization
- PID file creation and management for process tracking
- Signal handling for graceful shutdown (SIGTERM, SIGINT)
- Process restart and recovery mechanisms
- Resource cleanup on shutdown

### Git Repository Monitoring
- Poll Git repositories for new commits with configurable intervals
- Support commit lookback window to catch missed commits
- Handle Git repository state changes gracefully
- Monitor multiple worktrees within single repository
- Detect and handle worktree creation/deletion

### Job Discovery and Execution
- Scan filesystem for job definitions on startup and periodically
- Filter jobs based on commit metadata and job configuration
- Execute jobs with proper context injection
- Track job execution results and artifacts
- Implement execution rate limiting and backoff

## Worktree Management

### Worktree Discovery
- Execute `git worktree list --porcelain` for worktree enumeration
- Parse worktree metadata (path, branch, HEAD commit)
- Generate stable worktree identifiers for consistent naming
- Handle main repository as special case worktree
- Support selective worktree monitoring (all, current, specific paths)

### Worktree Context Isolation
- Create separate execution context per worktree
- Isolate file operations to worktree directory
- Provide worktree-specific Git operations
- Separate lock namespacing per worktree
- Independent job discovery per worktree

### Worktree Configuration
```javascript
{
  path: string,          // Absolute worktree path
  branch: string,        // Current branch
  head: string,          // Current HEAD commit
  isMain: boolean,       // Main repository flag
  id: string            // Stable worktree identifier
}
```

## Distributed Locking System

### Lock Architecture
- Use Git refs for distributed, persistent locks
- Namespace locks by worktree, event, and commit SHA
- Lock reference format: `refs/gitvan/locks/{worktree-id}/{event-id}/{sha}`
- Atomic lock acquisition using Git ref creation
- Automatic lock cleanup and timeout handling

### Lock Operations
- `acquireLock(runKey, sha)` - Attempt atomic lock acquisition
- `releaseLock(lockRef)` - Release held lock
- `worktreeLockRef(locksRoot, wtId, eventId, sha)` - Generate lock reference
- Lock timeout detection and cleanup for crashed processes
- Contention backoff and retry mechanisms

### Lock Scope Management
- Event-based lock granularity (per job/commit combination)
- Worktree isolation prevents cross-worktree conflicts
- Commit-specific locking for idempotent execution
- Lock metadata storage for debugging and monitoring

## Daemon Configuration

### Core Settings
```javascript
{
  daemon: {
    pollMs: 1500,        // Polling interval in milliseconds
    lookback: 600,       // Commit lookback window in seconds
    maxPerTick: 50,      // Maximum jobs per polling cycle
    backoffMs: 1000,     // Backoff delay on errors
    tz: 'UTC'           // Timezone for scheduling
  },
  locksRoot: 'refs/gitvan/locks',  // Lock reference prefix
  jobsRoot: 'jobs',                // Job discovery root directory
  worktrees: 'current'             // Worktree monitoring scope
}
```

### Worktree Selection Modes
- `current` - Monitor only current worktree
- `all` - Monitor all discovered worktrees
- `[paths...]` - Monitor specific worktree paths
- Dynamic worktree discovery and monitoring

## Job Execution Workflow

### Commit Processing Cycle
1. Poll Git for new commits within lookback window
2. For each commit, discover applicable jobs
3. Filter jobs based on job metadata and commit context
4. Attempt lock acquisition for each job/commit pair
5. Execute jobs with proper context and resource limits
6. Release locks and record execution results
7. Apply rate limiting and backoff before next cycle

### Context Injection per Worktree
```javascript
{
  root: string,           // Repository root
  worktreeRoot: string,   // Worktree-specific root
  head: string,           // Current worktree HEAD
  branch: string,         // Current worktree branch
  env: object,            // Environment variables
  worktree: {             // Worktree metadata
    id: string,           // Stable identifier
    branch: string        // Branch name
  }
}
```

### Rate Limiting and Backoff
- Maximum jobs per polling cycle (configurable)
- Exponential backoff on consecutive errors
- Resource usage monitoring and throttling
- Graceful degradation under high load

## Error Handling and Recovery

### Error Categories
- **Git Operation Errors**: Repository access, lock failures
- **Job Execution Errors**: Runtime failures, timeouts
- **System Resource Errors**: Memory, disk, network issues
- **Configuration Errors**: Invalid settings, missing dependencies

### Recovery Mechanisms
- Automatic retry for transient failures
- Graceful degradation when Git operations fail
- Job execution isolation prevents daemon crashes
- Lock cleanup on process restart
- Configuration reload without daemon restart

## Monitoring and Observability

### Execution Metrics
- Jobs executed per time period
- Average execution time per job type
- Lock contention frequency and duration
- Error rates and failure categories
- Resource usage (memory, CPU, disk I/O)

### Logging Requirements
- Structured logging with configurable levels
- Job execution start/stop events
- Lock acquisition and release events
- Error conditions with full context
- Performance metrics and statistics

### Health Checks
- Daemon process liveness indicators
- Git repository accessibility checks
- Lock system integrity validation
- Job discovery and execution pipeline health

## Integration Requirements

### CLI Integration
- `gitvan daemon start` command with configuration options
- `gitvan daemon stop` command for graceful shutdown
- `gitvan daemon status` for process and health information
- Configuration validation and troubleshooting tools

### System Integration
- systemd service file generation and management
- Log rotation and management integration
- Resource limit configuration (memory, CPU)
- Security and permission management

### Development Integration
- Development mode with reduced polling intervals
- Debug logging and verbose output options
- Job execution dry-run mode
- Configuration validation and testing tools