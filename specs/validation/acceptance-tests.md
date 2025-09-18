# GitVan v2 Acceptance Test Scenarios

## Feature: Job Definition and Execution

### Scenario 1: Basic Job Creation (Happy Path)
**Given**: A GitVan v2 repository with jobs/ directory
**When**: I create a defineJob with kind:'atomic' and run function
**Then**: The job should be discoverable via `gitvan job list`
**And**: The job should execute successfully via `gitvan job run`
**And**: A receipt should be written to refs/notes/gitvan/results

### Scenario 2: Job with Composables
**Given**: A job using useGit(), useTemplate(), useExec() composables
**When**: The job executes within withGitVan context
**Then**: All composables should have access to RunContext
**And**: useGit() should return properly configured GitAPI instance
**And**: useTemplate() should render Nunjucks templates deterministically

### Scenario 3: Job Execution Timeout
**Given**: A job with long-running operation
**When**: The daemon enforces timeout limits
**Then**: The job should be terminated gracefully
**And**: An ERROR receipt should be written with timeout details

## Feature: Event-Driven Execution

### Scenario 1: Filesystem Event Routing (Happy Path)
**Given**: Event file at events/merge-to/main.mjs with job binding
**When**: A commit is merged to main branch
**Then**: The bound job should execute automatically
**And**: Lock should be acquired at refs/gitvan/locks/<worktree>/<event>/<sha>
**And**: Receipt should record successful execution

### Scenario 2: Cron Event Execution
**Given**: Event file at events/cron/0_3_*_*_*.mjs
**When**: Daemon is running and cron schedule matches
**Then**: Job should execute at scheduled time
**And**: Subsequent runs should respect once-only semantics via locks

### Scenario 3: Path-Changed Event with Regex
**Given**: Event file at events/path-changed/src/[...slug].mjs
**When**: Files matching src/** pattern are modified
**Then**: Event should trigger and job should execute
**And**: Only matching path changes should trigger execution

### Scenario 4: Message Pattern Matching
**Given**: Event file at events/message/^release:/.mjs
**When**: Commit message starts with "release:"
**Then**: Associated job should execute
**And**: Non-matching commit messages should not trigger

## Feature: Composables API

### Scenario 1: useGit() Git Operations
**Given**: Job using useGit() composable
**When**: Calling git.add(), git.commit(), git.tag() operations
**Then**: All operations should execute in correct worktree context
**And**: Signed operations should use configured GPG settings
**And**: Operations should be idempotent where applicable

### Scenario 2: useTemplate() Nunjucks Rendering
**Given**: Template file with {{ nowISO }} and {{ git }} variables
**When**: Using t.renderToFile() with data object
**Then**: Template should render with deterministic output
**And**: Git context should be injected automatically
**And**: UTC timestamp should be consistent

### Scenario 3: useExec() Multi-format Execution
**Given**: Job using useExec() with different exec types
**When**: Executing 'cli', 'js', 'tmpl', 'llm' specifications
**Then**: Each exec type should run in proper context
**And**: Results should conform to ExecResult interface
**And**: Timeouts should be respected per spec

## Feature: Worktree Support

### Scenario 1: Multi-Worktree Execution
**Given**: Repository with multiple worktrees
**When**: Daemon starts with --worktrees all
**Then**: Each worktree should run independently
**And**: Locks should be scoped per worktree
**And**: Receipts should include worktree metadata

### Scenario 2: Worktree-Scoped Events
**Given**: Different events active in different worktrees
**When**: Commits occur in specific worktrees
**Then**: Only relevant worktree should execute events
**And**: Lock references should include worktree ID
**And**: Jobs should execute in correct worktree directory

### Scenario 3: Shared Repository Resources
**Given**: Multiple worktrees sharing same repo
**When**: Jobs write to refs/notes/gitvan/results
**Then**: All receipts should be centralized in shared gitdir
**And**: Notes should not conflict between worktrees
**And**: Refs should be properly namespaced

## Feature: Lock System and Idempotency

### Scenario 1: Once-Only Execution (Happy Path)
**Given**: Event triggered for specific commit SHA
**When**: Daemon attempts to execute same event twice
**Then**: First execution should succeed and acquire lock
**And**: Second execution should be skipped due to existing lock
**And**: Lock reference should exist at expected path

### Scenario 2: Lock Cleanup on Completion
**Given**: Job completes successfully
**When**: Lock cleanup occurs
**Then**: Lock reference should be deleted
**And**: Subsequent events for same SHA should be able to acquire lock
**And**: No stale locks should persist

### Scenario 3: Lock Collision Resolution
**Given**: Multiple daemon instances running
**When**: Same event/SHA combination occurs simultaneously
**Then**: Only one execution should succeed (atomic ref creation)
**And**: Failed acquisitions should be gracefully handled
**And**: No duplicate receipts should be created

## Feature: Receipt System

### Scenario 1: Complete Receipt Data (Happy Path)
**Given**: Job execution with all metadata
**When**: Receipt is written to git notes
**Then**: Receipt should contain: role, id, status, ts, commit, action, artifact, meta
**And**: Timestamp should be ISO format UTC
**And**: Status should be 'OK', 'ERROR', or 'SKIP'

### Scenario 2: Artifact Tracking
**Given**: Job that generates output files
**When**: Job completes with artifact path
**Then**: Receipt should record artifact location
**And**: Artifact path should be relative to repository root
**And**: File existence should be verifiable

### Scenario 3: Error Receipt Generation
**Given**: Job that fails with exception
**When**: Error occurs during execution
**Then**: Receipt should have status: 'ERROR'
**And**: Error details should be included in receipt
**And**: Partial results should be preserved if available

## Feature: Configuration System

### Scenario 1: Zero-Config Defaults (Happy Path)
**Given**: Repository without gitvan.config.js
**When**: GitVan operations execute
**Then**: Sensible defaults should be applied
**And**: Standard ref paths should be used
**And**: UTC timezone should be default

### Scenario 2: Custom Configuration Override
**Given**: gitvan.config.js with custom settings
**When**: Configuration is loaded
**Then**: Custom values should override defaults
**And**: Invalid configurations should be validated
**And**: Required dependencies should be checked

### Scenario 3: Environment Variable Integration
**Given**: Environment variables for configuration
**When**: Config resolution occurs
**Then**: Env vars should take precedence over config file
**And**: Sensitive values should be handled securely
**And**: Config validation should include env var values

## Feature: CLI Interface

### Scenario 1: Job Management Commands
**Given**: Repository with defined jobs
**When**: Running `gitvan job list` and `gitvan job run`
**Then**: All discoverable jobs should be listed with descriptions
**And**: Individual jobs should execute with proper context
**And**: Command output should be user-friendly

### Scenario 2: Event Inspection
**Given**: Events defined in filesystem
**When**: Running `gitvan event list`
**Then**: All events should be displayed with trigger conditions
**And**: Event routing logic should be visible
**And**: Bound jobs/actions should be identified

### Scenario 3: Daemon Management
**Given**: Configured repository
**When**: Running `gitvan daemon start` with various options
**Then**: Daemon should start with specified worktree selection
**And**: Polling should occur at configured intervals
**And**: Graceful shutdown should be supported

## Edge Cases and Error Conditions

### Scenario 1: Invalid Job Definition
**Given**: Job with malformed defineJob structure
**When**: Job discovery occurs
**Then**: Validation errors should be clearly reported
**And**: Other valid jobs should still be discoverable
**And**: System should remain stable

### Scenario 2: Git Repository Corruption
**Given**: Repository with corrupt objects or refs
**When**: GitVan operations are attempted
**Then**: Clear error messages should be provided
**And**: System should fail gracefully
**And**: Recovery suggestions should be offered

### Scenario 3: Resource Exhaustion
**Given**: System under high load or low resources
**When**: Multiple jobs execute simultaneously
**Then**: Resource limits should be respected
**And**: Jobs should queue or fail gracefully
**And**: System stability should be maintained

### Scenario 4: Network/External Dependencies
**Given**: Jobs with external service dependencies
**When**: External services are unavailable
**Then**: Appropriate timeout handling should occur
**And**: Retry logic should be configurable
**And**: Partial failures should be properly recorded

## Security Validation

### Scenario 1: Signed Commit Verification
**Given**: Repository requiring signed commits
**When**: Events trigger on unsigned commits
**Then**: Verification should fail appropriately
**And**: Security policies should be enforced
**And**: Audit trail should be maintained

### Scenario 2: Command Execution Constraints
**Given**: Allow-list configuration for CLI commands
**When**: Jobs attempt to execute restricted commands
**Then**: Execution should be blocked
**And**: Security violations should be logged
**And**: Alternative approaches should be suggested

### Scenario 3: Separation of Duties
**Given**: SoD policies requiring multiple signers
**When**: Sensitive operations are attempted
**Then**: Multiple signature requirements should be enforced
**And**: Policy violations should be prevented
**And**: Audit evidence should be preserved

## Performance Validation

### Scenario 1: Local Execution Speed
**Given**: Standard GitVan operations on local repository
**When**: Jobs execute with minimal complexity
**Then**: p95 execution time should be ≤ 300ms
**And**: p99 execution time should be ≤ 800ms
**And**: Memory usage should remain bounded

### Scenario 2: Large Repository Handling
**Given**: Repository with extensive history (10k+ commits)
**When**: Daemon scans recent commits
**Then**: Scan should complete within configured lookback period
**And**: Memory usage should not grow unbounded
**And**: Performance should degrade gracefully

### Scenario 3: Concurrent Operations
**Given**: Multiple worktrees with active events
**When**: High-frequency commit activity occurs
**Then**: Lock contention should be minimal
**And**: System should maintain responsiveness
**And**: All events should be processed fairly

## Integration Validation

### Scenario 1: Git Hooks Integration
**Given**: Repository with existing Git hooks
**When**: GitVan operates alongside hooks
**Then**: Both systems should coexist peacefully
**And**: Hook execution should not interfere with GitVan
**And**: GitVan should not disrupt existing workflows

### Scenario 2: CI/CD Pipeline Integration
**Given**: GitVan running in CI/CD environment
**When**: Automated builds and deployments occur
**Then**: GitVan should integrate without conflicts
**And**: Build artifacts should be properly tracked
**And**: CI/CD metadata should be preserved

### Scenario 3: Multi-Repository Coordination
**Given**: Related repositories using GitVan
**When**: Cross-repository events occur
**Then**: Coordination should work via submodules/worktrees
**And**: Event propagation should be reliable
**And**: Dependency management should be clear