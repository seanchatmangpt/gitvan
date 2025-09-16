# Worktree-Scoped Daemon System

## Intent

Implement a daemon process that monitors Git repositories and worktrees for new commits, automatically discovering and executing relevant jobs with proper concurrency control and resource management. The daemon should provide worktree isolation, distributed locking, and graceful handling of repository changes.

## User Stories

**As a repository maintainer**, I want a daemon that monitors all my worktrees for changes so that automation runs across my entire development workflow.

**As a developer working with multiple worktrees**, I want job execution isolated per worktree so that work in different branches doesn't interfere with each other.

**As a system administrator**, I want distributed locking to prevent job conflicts so that multiple daemon instances can coexist safely.

**As a CI/CD operator**, I want configurable polling and rate limiting so that the daemon doesn't overwhelm system resources or Git operations.

## Acceptance Criteria

- [ ] Daemon process monitors Git commits with configurable polling interval
- [ ] Worktree discovery and isolation with per-worktree execution context
- [ ] Distributed locking using Git refs to prevent execution conflicts
- [ ] Configurable rate limiting (max jobs per tick, backoff strategies)
- [ ] Graceful startup, shutdown, and restart handling
- [ ] Job discovery with commit-based filtering and lookback windows
- [ ] Memory and resource management for long-running operation
- [ ] Process management with PID files and signal handling

## Out of Scope

- Real-time file system monitoring (inotify, fswatch)
- Network-based job distribution or clustering
- Web-based dashboard or monitoring UI
- Database persistence beyond Git storage
- Complex job scheduling (use external cron/systemd)

## Dependencies

- Git repository with worktree support
- Node.js runtime for daemon process
- File system access for job discovery
- Git refs for distributed locking
- Process management capabilities

## Success Metrics

- Commit detection latency: < 30 seconds average
- Job execution throughput: 50+ jobs/minute
- Memory usage: < 100MB for typical repositories
- Lock contention resolution: < 5 seconds
- Daemon uptime: 99%+ availability