# GitVan v2 Core - Validation Checklist

## Functional Validation

### Context Management
- [ ] **Executable Test**: Context injection works with nested calls
  ```javascript
  test('context injection works with nested calls', async () => {
    const result = await withGitVan(context, async () => {
      return await withGitVan(context, () => {
        const git = useGit()
        return git.branch()
      })
    })
    expect(result).toBe(context.branch)
  })
  ```
- [ ] **Executable Test**: Context isolation prevents cross-contamination
  ```javascript
  test('context isolation prevents cross-contamination', async () => {
    const context1 = createTestContext({ branch: 'feature-1' })
    const context2 = createTestContext({ branch: 'feature-2' })
    
    const result1 = await withGitVan(context1, () => useGit().branch())
    const result2 = await withGitVan(context2, () => useGit().branch())
    
    expect(result1).toBe('feature-1')
    expect(result2).toBe('feature-2')
  })
  ```
- [ ] **Executable Test**: Context provides all required Git information
  ```javascript
  test('context provides all required Git information', () => {
    const git = useGit()
    expect(git.root).toBeDefined()
    expect(git.head()).toMatch(/^[a-f0-9]{40}$/)
    expect(git.branch()).toBeDefined()
    expect(typeof git.run).toBe('function')
  })
  ```
- [ ] **Executable Test**: Context cleanup happens automatically
  ```javascript
  test('context cleanup happens automatically', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    await withGitVan(context, () => {
      // Create temporary resources
      const git = useGit()
      git.note('refs/notes/temp', 'test')
    })
    // Force garbage collection
    global.gc && global.gc()
    const finalMemory = process.memoryUsage().heapUsed
    expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024) // < 1MB
  })
  ```
- [ ] **Executable Test**: Context performance meets < 50ms initialization target
  ```javascript
  test('context performance meets < 50ms initialization target', () => {
    const start = performance.now()
    const git = useGit()
    const duration = performance.now() - start
    expect(duration).toBeLessThan(50)
  })
  ```

### Execution Engine
- [ ] All five execution types (cli/js/llm/job/tmpl) work correctly
- [ ] Timeout handling prevents hanging processes
- [ ] Environment variables are injected properly
- [ ] Result format is consistent across all types
- [ ] Error handling provides meaningful messages

### Git Integration
- [ ] Reads Git context (HEAD, branch, commits) accurately
- [ ] Writes and reads Git notes correctly
- [ ] Git ref operations are atomic
- [ ] Worktree detection and enumeration works
- [ ] Git commands respect repository boundaries

### Job Definition
- [ ] defineJob() creates valid job objects
- [ ] Metadata extraction works without execution
- [ ] Job discovery scans filesystem correctly
- [ ] Job filtering by kind and tags works
- [ ] Schedule expressions parse correctly

### Lock Management
- [ ] Lock acquisition is atomic and conflict-free
- [ ] Lock timeout and cleanup work automatically
- [ ] Worktree lock scoping prevents conflicts
- [ ] Lock contention resolves within 1 second
- [ ] Lock cleanup handles crashed processes

### Daemon Process
- [ ] Commit scanning detects new commits reliably
- [ ] Job execution respects rate limiting (max 50/tick)
- [ ] Graceful shutdown cleans up resources
- [ ] Memory usage stays below 100MB
- [ ] Daemon restarts recover state correctly

## Performance Validation

### Execution Performance
- [ ] Simple job execution completes in < 100ms
- [ ] Template rendering processes > 1000 templates/second
- [ ] Job discovery scan completes in < 500ms for 1000 jobs
- [ ] Lock acquisition completes in < 100ms under contention
- [ ] Context initialization completes in < 50ms

### Memory Performance
- [ ] Daemon process uses < 50MB baseline memory
- [ ] Memory usage scales linearly with job count
- [ ] No memory leaks during continuous operation
- [ ] Template compilation caches work correctly
- [ ] Context cleanup releases all resources

### Concurrency Performance
- [ ] Multiple daemon instances don't interfere
- [ ] Lock contention scales to 10+ concurrent jobs
- [ ] Worktree isolation works under load
- [ ] Template engine handles concurrent rendering
- [ ] Git operations don't block each other

## Security Validation

### Command Injection Prevention
- [ ] CLI execution sanitizes arguments
- [ ] Template rendering escapes dangerous content
- [ ] Environment variables are validated
- [ ] File path traversal is prevented
- [ ] Git command injection is blocked

### Access Control
- [ ] Jobs run with appropriate permissions
- [ ] File system access is scoped to repository
- [ ] Network access is controlled
- [ ] Environment variable access is limited
- [ ] Git operations respect repository permissions

### Data Protection
- [ ] Sensitive data is not logged
- [ ] Temporary files are cleaned up
- [ ] Git notes don't expose secrets
- [ ] Lock refs don't contain sensitive information
- [ ] Error messages don't leak internal paths

## Integration Validation

### Git Repository Integration
- [ ] Works with bare repositories
- [ ] Works with worktrees
- [ ] Works with submodules
- [ ] Works with Git hooks
- [ ] Works with different Git versions

### Node.js Runtime Integration
- [ ] Works with Node.js 18+
- [ ] Works with different operating systems
- [ ] Works with different shell environments
- [ ] Works with different file systems
- [ ] Works with restricted permissions

### Package Manager Integration
- [ ] npm install works correctly
- [ ] pnpm install works correctly
- [ ] yarn install works correctly
- [ ] Dependencies resolve correctly
- [ ] Peer dependencies are optional

## API Validation

### Composables API
- [ ] useGitVan() returns expected context
- [ ] useGit() provides all Git operations
- [ ] useTemplate() renders templates correctly
- [ ] useExec() executes all types
- [ ] Error handling is consistent

### CLI API
- [ ] `gitvan run <job>` executes jobs
- [ ] `gitvan list` shows available jobs
- [ ] `gitvan daemon start` starts daemon
- [ ] `gitvan daemon stop` stops daemon
- [ ] Help text is accurate and complete

### Job Definition API
- [ ] defineJob() accepts all valid configurations
- [ ] Job metadata is extracted correctly
- [ ] Job validation catches errors early
- [ ] Job composition works correctly
- [ ] Schedule expressions are parsed

## Reliability Validation

### Error Recovery
- [ ] Network failures are handled gracefully
- [ ] File system errors don't crash daemon
- [ ] Git command failures are recoverable
- [ ] Lock timeouts clean up correctly
- [ ] Process crashes don't corrupt state

### State Consistency
- [ ] Lock state remains consistent during failures
- [ ] Job execution state is recoverable
- [ ] Git refs are not corrupted
- [ ] File system state is consistent
- [ ] Daemon state survives restarts

### Idempotency
- [ ] Job execution is idempotent when possible
- [ ] Lock operations are idempotent
- [ ] File operations handle existing files
- [ ] Git operations handle existing refs
- [ ] Template rendering is deterministic

## Documentation Validation

### API Documentation
- [ ] All public functions are documented
- [ ] Type definitions are complete
- [ ] Examples are working and current
- [ ] Error conditions are documented
- [ ] Performance characteristics are noted

### User Documentation
- [ ] Installation instructions work
- [ ] Getting started guide is complete
- [ ] Configuration options are documented
- [ ] Troubleshooting guide covers common issues
- [ ] Migration guide from v1 exists

### Developer Documentation
- [ ] Architecture decisions are recorded
- [ ] Code organization is explained
- [ ] Testing strategy is documented
- [ ] Contribution guidelines exist
- [ ] Release process is defined

## Deployment Validation

### Installation
- [ ] npm package installs correctly
- [ ] Binary is accessible globally
- [ ] Dependencies install correctly
- [ ] TypeScript definitions are included
- [ ] Documentation is included

### Configuration
- [ ] Zero-config operation works
- [ ] Configuration file is optional
- [ ] Environment variables work
- [ ] CLI flags override configuration
- [ ] Validation provides helpful errors

### Operations
- [ ] Daemon can be managed as system service
- [ ] Logging is configurable
- [ ] Metrics can be collected
- [ ] Graceful shutdown works
- [ ] Resource limits are respected