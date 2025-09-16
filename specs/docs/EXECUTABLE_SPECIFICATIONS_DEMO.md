# GitVan v2 Executable Specifications

## Overview

This document demonstrates what executable specifications would look like for all GitVan v2 components, following the SDD methodology. These are **documentation-only** examples showing exactly what the executable test scenarios would be.

## Core System Executable Specifications

### 1. Job Definition System

```javascript
// specs/001-gitvan-v2-core/EXECUTABLE_TESTS.md

describe('Job Definition System', () => {
  describe('defineJob() Function', () => {
    test('should create valid job objects with metadata', () => {
      // Given: A job definition
      const jobDef = {
        kind: 'atomic',
        meta: { desc: 'Test job', tags: ['test'] },
        run: () => ({ ok: true })
      }
      
      // When: Creating a job
      const job = defineJob(jobDef)
      
      // Then: Job should have correct structure
      expect(job.kind).toBe('atomic')
      expect(job.meta.desc).toBe('Test job')
      expect(job.meta.tags).toEqual(['test'])
      expect(typeof job.run).toBe('function')
    })
    
    test('should validate job kind', () => {
      // Given: Invalid job kind
      const invalidJob = { kind: 'invalid', run: () => ({}) }
      
      // When: Creating job
      // Then: Should throw validation error
      expect(() => defineJob(invalidJob)).toThrow('Invalid job kind: invalid')
    })
    
    test('should extract metadata without execution', () => {
      // Given: Job with metadata
      const job = defineJob({
        kind: 'composite',
        meta: { desc: 'Composite job', schedule: '0 2 * * *' },
        steps: []
      })
      
      // When: Extracting metadata
      const metadata = extractJobMetadata(job)
      
      // Then: Should return metadata only
      expect(metadata).toEqual({
        kind: 'composite',
        desc: 'Composite job',
        schedule: '0 2 * * *'
      })
    })
  })
  
  describe('Job Discovery', () => {
    test('should discover jobs from filesystem', async () => {
      // Given: Repository with jobs
      const repo = await createTestRepo({
        'jobs/example.mjs': `
          export default defineJob({
            kind: 'atomic',
            meta: { desc: 'Example job' },
            run: () => ({ ok: true })
          })
        `,
        'jobs/composite.mjs': `
          export default defineJob({
            kind: 'composite',
            meta: { desc: 'Composite job' },
            steps: []
          })
        `
      })
      
      // When: Discovering jobs
      const jobs = await discoverJobs(repo.root)
      
      // Then: Should find all jobs
      expect(jobs).toHaveLength(2)
      expect(jobs.find(j => j.name === 'example')).toBeDefined()
      expect(jobs.find(j => j.name === 'composite')).toBeDefined()
    })
    
    test('should filter jobs by kind', async () => {
      // Given: Jobs of different kinds
      const jobs = await discoverJobs(repo.root)
      
      // When: Filtering by kind
      const atomicJobs = filterJobsByKind(jobs, 'atomic')
      const compositeJobs = filterJobsByKind(jobs, 'composite')
      
      // Then: Should return correct jobs
      expect(atomicJobs).toHaveLength(1)
      expect(compositeJobs).toHaveLength(1)
    })
  })
  
  describe('Performance Contracts', () => {
    test('job discovery should complete within 500ms', async () => {
      // Given: Large repository with 1000 jobs
      const repo = await createLargeTestRepo(1000)
      
      // When: Discovering jobs
      const start = performance.now()
      await discoverJobs(repo.root)
      const duration = performance.now() - start
      
      // Then: Should complete within 500ms
      expect(duration).toBeLessThan(500)
    })
    
    test('metadata extraction should complete within 10ms', () => {
      // Given: Job with metadata
      const job = defineJob({
        kind: 'atomic',
        meta: { desc: 'Test', tags: ['a', 'b', 'c'] },
        run: () => ({})
      })
      
      // When: Extracting metadata
      const start = performance.now()
      extractJobMetadata(job)
      const duration = performance.now() - start
      
      // Then: Should complete within 10ms
      expect(duration).toBeLessThan(10)
    })
  })
  
  describe('Security Contracts', () => {
    test('should prevent code injection in job definitions', () => {
      // Given: Malicious job definition
      const maliciousJob = {
        kind: 'atomic',
        meta: { desc: '{{7*7}}' },
        run: () => ({})
      }
      
      // When: Creating job
      const job = defineJob(maliciousJob)
      
      // Then: Should sanitize metadata
      expect(job.meta.desc).toBe('{{7*7}}') // Should not evaluate
    })
    
    test('should validate job file permissions', async () => {
      // Given: Job file with restricted permissions
      const restrictedFile = 'jobs/restricted.mjs'
      
      // When: Loading job
      // Then: Should throw permission error
      await expect(loadJobFile(restrictedFile)).rejects.toThrow('Access denied')
    })
  })
})
```

### 2. Composables System

```javascript
// specs/002-composables-system/EXECUTABLE_TESTS.md

describe('Composables System', () => {
  describe('useGit() Composable', () => {
    test('should provide git operations', () => {
      // Given: GitVan context
      const context = createTestContext({
        root: '/test/repo',
        head: 'abc123',
        branch: 'main'
      })
      
      // When: Using git composable
      const git = useGit()
      
      // Then: Should have git operations
      expect(git.root).toBe('/test/repo')
      expect(git.head()).toBe('abc123')
      expect(git.branch()).toBe('main')
      expect(typeof git.run).toBe('function')
      expect(typeof git.note).toBe('function')
    })
    
    test('should execute git commands', () => {
      // Given: Git composable
      const git = useGit()
      
      // When: Running git command
      const result = git.run('log --oneline -5')
      
      // Then: Should return command output
      expect(typeof result).toBe('string')
      expect(result).toContain('commit')
    })
    
    test('should manage git notes', () => {
      // Given: Git composable
      const git = useGit()
      
      // When: Adding note
      git.note('refs/notes/test', 'test note')
      
      // Then: Should be able to read note
      const note = git.run('notes show refs/notes/test')
      expect(note).toBe('test note')
    })
  })
  
  describe('useTemplate() Composable', () => {
    test('should render templates with context', () => {
      // Given: Template composable
      const template = useTemplate()
      
      // When: Rendering template
      const result = template.render('Hello {{ name }}!', { name: 'GitVan' })
      
      // Then: Should render correctly
      expect(result).toBe('Hello GitVan!')
    })
    
    test('should inject git context automatically', () => {
      // Given: Template with git context
      const template = useTemplate()
      
      // When: Rendering template
      const result = template.render('Branch: {{ git.branch() }}')
      
      // Then: Should include git context
      expect(result).toContain('Branch: main')
    })
    
    test('should render to file', () => {
      // Given: Template composable
      const template = useTemplate()
      
      // When: Rendering to file
      const result = template.renderToFile(
        'test.njk',
        'output.txt',
        { message: 'Hello World' }
      )
      
      // Then: Should create file
      expect(result.path).toBe('output.txt')
      expect(result.bytes).toBeGreaterThan(0)
    })
  })
  
  describe('useExec() Composable', () => {
    test('should execute CLI commands', async () => {
      // Given: Exec composable
      const exec = useExec()
      
      // When: Running CLI command
      const result = exec.cli('echo', ['hello'])
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.stdout).toBe('hello\n')
    })
    
    test('should execute JavaScript modules', async () => {
      // Given: Exec composable
      const exec = useExec()
      
      // When: Running JS module
      const result = await exec.js('./test-module.mjs', 'default', { input: 'test' })
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.stdout).toContain('test')
    })
    
    test('should execute templates', () => {
      // Given: Exec composable
      const exec = useExec()
      
      // When: Running template
      const result = exec.tmpl({
        template: 'test.njk',
        data: { name: 'GitVan' }
      })
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.stdout).toContain('GitVan')
    })
  })
  
  describe('Context Management', () => {
    test('should provide context isolation', async () => {
      // Given: Two different contexts
      const context1 = createTestContext({ branch: 'feature-1' })
      const context2 = createTestContext({ branch: 'feature-2' })
      
      // When: Using composables in different contexts
      const result1 = await withGitVan(context1, () => useGit().branch())
      const result2 = await withGitVan(context2, () => useGit().branch())
      
      // Then: Should have different results
      expect(result1).toBe('feature-1')
      expect(result2).toBe('feature-2')
    })
    
    test('should handle nested context calls', async () => {
      // Given: GitVan context
      const context = createTestContext({ branch: 'main' })
      
      // When: Nested context calls
      const result = await withGitVan(context, async () => {
        return await withGitVan(context, () => {
          return useGit().branch()
        })
      })
      
      // Then: Should work correctly
      expect(result).toBe('main')
    })
  })
  
  describe('Performance Contracts', () => {
    test('context initialization should complete within 50ms', () => {
      // Given: Context creation
      const start = performance.now()
      const context = createTestContext()
      const duration = performance.now() - start
      
      // Then: Should complete within 50ms
      expect(duration).toBeLessThan(50)
    })
    
    test('composable access should complete within 10ms', () => {
      // Given: Context
      const context = createTestContext()
      
      // When: Accessing composable
      const start = performance.now()
      const git = useGit()
      const duration = performance.now() - start
      
      // Then: Should complete within 10ms
      expect(duration).toBeLessThan(10)
    })
  })
})
```

### 3. Template Engine

```javascript
// specs/003-template-engine/EXECUTABLE_TESTS.md

describe('Template Engine', () => {
  describe('Nunjucks Integration', () => {
    test('should render templates with Nunjucks syntax', () => {
      // Given: Template with Nunjucks syntax
      const template = 'Hello {{ name }}! {% if show %}World{% endif %}'
      
      // When: Rendering template
      const result = renderTemplate(template, { name: 'GitVan', show: true })
      
      // Then: Should render correctly
      expect(result).toBe('Hello GitVan! World')
    })
    
    test('should support template inheritance', () => {
      // Given: Base template and child template
      const baseTemplate = 'Base: {% block content %}{% endblock %}'
      const childTemplate = '{% extends "base" %}{% block content %}Child content{% endblock %}'
      
      // When: Rendering child template
      const result = renderTemplate(childTemplate, {})
      
      // Then: Should render with inheritance
      expect(result).toBe('Base: Child content')
    })
    
    test('should support macros', () => {
      // Given: Template with macro
      const template = `
        {% macro greet(name) %}Hello {{ name }}!{% endmacro %}
        {{ greet('GitVan') }}
      `
      
      // When: Rendering template
      const result = renderTemplate(template, {})
      
      // Then: Should render macro
      expect(result.trim()).toBe('Hello GitVan!')
    })
  })
  
  describe('Git Context Injection', () => {
    test('should inject git context automatically', () => {
      // Given: Template with git context
      const template = 'Branch: {{ git.branch() }}, Head: {{ git.head() }}'
      
      // When: Rendering template
      const result = renderTemplate(template, {})
      
      // Then: Should include git context
      expect(result).toContain('Branch: main')
      expect(result).toContain('Head: abc123')
    })
    
    test('should provide deterministic helpers', () => {
      // Given: Template with helpers
      const template = 'Now: {{ nowISO }}, Format: {{ formatDate(nowISO) }}'
      
      // When: Rendering template
      const result = renderTemplate(template, {})
      
      // Then: Should provide helpers
      expect(result).toContain('Now: 2024-01-01T00:00:00.000Z')
      expect(result).toContain('Format: 2024-01-01')
    })
  })
  
  describe('File Output', () => {
    test('should render template to file', () => {
      // Given: Template and output path
      const template = 'Hello {{ name }}!'
      const outputPath = 'output.txt'
      
      // When: Rendering to file
      const result = renderToFile(template, outputPath, { name: 'GitVan' })
      
      // Then: Should create file
      expect(result.path).toBe(outputPath)
      expect(result.bytes).toBeGreaterThan(0)
      
      // And: File should contain correct content
      const content = readFile(outputPath)
      expect(content).toBe('Hello GitVan!')
    })
    
    test('should handle file permissions', () => {
      // Given: Restricted output path
      const template = 'Test content'
      const restrictedPath = '/restricted/output.txt'
      
      // When: Rendering to restricted path
      // Then: Should throw permission error
      expect(() => renderToFile(template, restrictedPath, {})).toThrow('Permission denied')
    })
  })
  
  describe('Performance Contracts', () => {
    test('template rendering should exceed 1000 templates/second', () => {
      // Given: Simple template
      const template = 'Hello {{ name }}!'
      const data = { name: 'GitVan' }
      
      // When: Rendering many templates
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        renderTemplate(template, data)
      }
      const duration = performance.now() - start
      
      // Then: Should complete within 1 second
      expect(duration).toBeLessThan(1000)
    })
    
    test('template compilation should complete within 10ms', () => {
      // Given: Complex template
      const template = `
        {% for item in items %}
          <div>{{ item.name }}: {{ item.value }}</div>
        {% endfor %}
      `
      
      // When: Compiling template
      const start = performance.now()
      const compiled = compileTemplate(template)
      const duration = performance.now() - start
      
      // Then: Should complete within 10ms
      expect(duration).toBeLessThan(10)
      expect(compiled).toBeDefined()
    })
  })
  
  describe('Security Contracts', () => {
    test('should prevent template injection', () => {
      // Given: Malicious input
      const template = 'Hello {{ user_input }}!'
      const maliciousInput = '{{7*7}}'
      
      // When: Rendering template
      const result = renderTemplate(template, { user_input: maliciousInput })
      
      // Then: Should not evaluate malicious input
      expect(result).toBe('Hello {{7*7}}!')
    })
    
    test('should escape HTML by default', () => {
      // Given: Template with HTML
      const template = 'Content: {{ html_content }}'
      const htmlContent = '<script>alert("xss")</script>'
      
      // When: Rendering template
      const result = renderTemplate(template, { html_content: htmlContent })
      
      // Then: Should escape HTML
      expect(result).toBe('Content: &lt;script&gt;alert("xss")&lt;/script&gt;')
    })
    
    test('should allow HTML when explicitly enabled', () => {
      // Given: Template with HTML autoescape disabled
      const template = 'Content: {{ html_content }}'
      const htmlContent = '<strong>Bold text</strong>'
      
      // When: Rendering template with autoescape disabled
      const result = renderTemplate(template, { html_content: htmlContent }, { autoescape: false })
      
      // Then: Should not escape HTML
      expect(result).toBe('Content: <strong>Bold text</strong>')
    })
  })
})
```

## Execution Types Executable Specifications

### 4. Execution Engine

```javascript
// specs/004-execution-types/EXECUTABLE_TESTS.md

describe('Execution Engine', () => {
  describe('CLI Execution', () => {
    test('should execute CLI commands', async () => {
      // Given: CLI execution spec
      const spec = {
        exec: 'cli',
        cmd: 'echo',
        args: ['hello', 'world'],
        timeout: 5000
      }
      
      // When: Executing CLI
      const result = await executeCli(spec)
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.stdout).toBe('hello world\n')
      expect(result.code).toBe(0)
    })
    
    test('should handle CLI errors', async () => {
      // Given: Failing CLI command
      const spec = {
        exec: 'cli',
        cmd: 'false',
        timeout: 5000
      }
      
      // When: Executing CLI
      const result = await executeCli(spec)
      
      // Then: Should return error
      expect(result.ok).toBe(false)
      expect(result.code).toBe(1)
    })
    
    test('should respect timeout', async () => {
      // Given: Long-running command
      const spec = {
        exec: 'cli',
        cmd: 'sleep',
        args: ['10'],
        timeout: 1000
      }
      
      // When: Executing CLI
      const result = await executeCli(spec)
      
      // Then: Should timeout
      expect(result.ok).toBe(false)
      expect(result.error).toContain('timeout')
    })
  })
  
  describe('JavaScript Execution', () => {
    test('should execute JavaScript modules', async () => {
      // Given: JS execution spec
      const spec = {
        exec: 'js',
        module: './test-module.mjs',
        export: 'default',
        input: { message: 'hello' }
      }
      
      // When: Executing JS
      const result = await executeJs(spec)
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.stdout).toContain('hello')
    })
    
    test('should handle module errors', async () => {
      // Given: Invalid module
      const spec = {
        exec: 'js',
        module: './invalid-module.mjs',
        export: 'default'
      }
      
      // When: Executing JS
      const result = await executeJs(spec)
      
      // Then: Should return error
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Module not found')
    })
  })
  
  describe('Template Execution', () => {
    test('should execute templates', () => {
      // Given: Template execution spec
      const spec = {
        exec: 'tmpl',
        template: 'test.njk',
        data: { name: 'GitVan' },
        out: 'output.txt'
      }
      
      // When: Executing template
      const result = executeTemplate(spec)
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.artifact).toBe('output.txt')
    })
  })
  
  describe('Job Execution', () => {
    test('should execute jobs recursively', async () => {
      // Given: Job execution spec
      const spec = {
        exec: 'job',
        name: 'test-job'
      }
      
      // When: Executing job
      const result = await executeJob(spec)
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.meta).toBeDefined()
    })
  })
  
  describe('LLM Execution', () => {
    test('should execute LLM requests', async () => {
      // Given: LLM execution spec
      const spec = {
        exec: 'llm',
        model: 'test-model',
        prompt: 'Generate test output',
        options: { temperature: 0.7 }
      }
      
      // When: Executing LLM
      const result = await executeLlm(spec)
      
      // Then: Should return result
      expect(result.ok).toBe(true)
      expect(result.stdout).toBeDefined()
    })
  })
  
  describe('Unified Result Format', () => {
    test('should return consistent result format', async () => {
      // Given: Different execution types
      const specs = [
        { exec: 'cli', cmd: 'echo', args: ['test'] },
        { exec: 'js', module: './test.mjs' },
        { exec: 'tmpl', template: 'test.njk' },
        { exec: 'job', name: 'test-job' },
        { exec: 'llm', model: 'test', prompt: 'test' }
      ]
      
      // When: Executing all types
      const results = await Promise.all(specs.map(execute))
      
      // Then: All should have consistent format
      results.forEach(result => {
        expect(result).toHaveProperty('ok')
        expect(result).toHaveProperty('stdout')
        expect(result).toHaveProperty('meta')
      })
    })
  })
  
  describe('Performance Contracts', () => {
    test('simple job execution should complete within 100ms', async () => {
      // Given: Simple job
      const spec = { exec: 'cli', cmd: 'echo', args: ['test'] }
      
      // When: Executing job
      const start = performance.now()
      await execute(spec)
      const duration = performance.now() - start
      
      // Then: Should complete within 100ms
      expect(duration).toBeLessThan(100)
    })
  })
})
```

## Worktree Daemon Executable Specifications

### 5. Worktree Daemon

```javascript
// specs/005-worktree-daemon/EXECUTABLE_TESTS.md

describe('Worktree Daemon', () => {
  describe('Daemon Process Management', () => {
    test('should start daemon process', async () => {
      // Given: Daemon configuration
      const config = {
        worktrees: ['main', 'feature-1'],
        pollInterval: 1000,
        maxJobs: 50
      }
      
      // When: Starting daemon
      const daemon = await startDaemon(config)
      
      // Then: Should be running
      expect(daemon.isRunning()).toBe(true)
      expect(daemon.getWorktrees()).toEqual(['main', 'feature-1'])
    })
    
    test('should stop daemon gracefully', async () => {
      // Given: Running daemon
      const daemon = await startDaemon({})
      
      // When: Stopping daemon
      await daemon.stop()
      
      // Then: Should be stopped
      expect(daemon.isRunning()).toBe(false)
    })
    
    test('should handle daemon crashes', async () => {
      // Given: Daemon with crash simulation
      const daemon = await startDaemon({ crashSimulation: true })
      
      // When: Simulating crash
      daemon.simulateCrash()
      
      // Then: Should recover gracefully
      await waitForRecovery()
      expect(daemon.isRunning()).toBe(true)
    })
  })
  
  describe('Commit Polling', () => {
    test('should detect new commits', async () => {
      // Given: Daemon and repository
      const daemon = await startDaemon({})
      const repo = await createTestRepo()
      
      // When: Making new commit
      await makeCommit(repo, 'feat: new feature')
      
      // Then: Should detect commit
      await waitForPolling()
      const commits = daemon.getNewCommits()
      expect(commits).toHaveLength(1)
      expect(commits[0].message).toBe('feat: new feature')
    })
    
    test('should respect polling interval', async () => {
      // Given: Daemon with 1s polling
      const daemon = await startDaemon({ pollInterval: 1000 })
      
      // When: Monitoring polling
      const start = Date.now()
      await waitForPolling()
      const duration = Date.now() - start
      
      // Then: Should poll within interval
      expect(duration).toBeGreaterThanOrEqual(1000)
      expect(duration).toBeLessThan(1100)
    })
  })
  
  describe('Distributed Locking', () => {
    test('should acquire locks atomically', async () => {
      // Given: Multiple daemon instances
      const daemon1 = await startDaemon({ worktrees: ['main'] })
      const daemon2 = await startDaemon({ worktrees: ['main'] })
      
      // When: Both try to acquire same lock
      const lock1 = await daemon1.acquireLock('test-lock')
      const lock2 = await daemon2.acquireLock('test-lock')
      
      // Then: Only one should succeed
      expect(lock1.acquired).toBe(true)
      expect(lock2.acquired).toBe(false)
    })
    
    test('should release locks on completion', async () => {
      // Given: Acquired lock
      const daemon = await startDaemon({})
      const lock = await daemon.acquireLock('test-lock')
      
      // When: Releasing lock
      await lock.release()
      
      // Then: Lock should be released
      expect(lock.isReleased()).toBe(true)
    })
    
    test('should handle lock timeouts', async () => {
      // Given: Lock with timeout
      const daemon = await startDaemon({ lockTimeout: 1000 })
      const lock = await daemon.acquireLock('test-lock')
      
      // When: Waiting for timeout
      await waitForTimeout(1100)
      
      // Then: Lock should timeout
      expect(lock.isExpired()).toBe(true)
    })
  })
  
  describe('Worktree Isolation', () => {
    test('should isolate execution per worktree', async () => {
      // Given: Daemon with multiple worktrees
      const daemon = await startDaemon({
        worktrees: ['main', 'feature-1', 'feature-2']
      })
      
      // When: Executing jobs in different worktrees
      const results = await Promise.all([
        daemon.executeJob('test-job', 'main'),
        daemon.executeJob('test-job', 'feature-1'),
        daemon.executeJob('test-job', 'feature-2')
      ])
      
      // Then: Should execute independently
      results.forEach(result => {
        expect(result.ok).toBe(true)
        expect(result.worktree).toBeDefined()
      })
    })
    
    test('should scope locks per worktree', async () => {
      // Given: Daemon with multiple worktrees
      const daemon = await startDaemon({
        worktrees: ['main', 'feature-1']
      })
      
      // When: Acquiring locks in different worktrees
      const lock1 = await daemon.acquireLock('test-lock', 'main')
      const lock2 = await daemon.acquireLock('test-lock', 'feature-1')
      
      // Then: Both should succeed (different worktrees)
      expect(lock1.acquired).toBe(true)
      expect(lock2.acquired).toBe(true)
    })
  })
  
  describe('Rate Limiting', () => {
    test('should respect job rate limits', async () => {
      // Given: Daemon with rate limit
      const daemon = await startDaemon({ maxJobsPerTick: 10 })
      
      // When: Executing many jobs
      const jobs = Array(20).fill().map((_, i) => 
        daemon.executeJob(`job-${i}`)
      )
      
      // Then: Should respect rate limit
      const results = await Promise.all(jobs)
      const successful = results.filter(r => r.ok).length
      expect(successful).toBeLessThanOrEqual(10)
    })
  })
  
  describe('Performance Contracts', () => {
    test('daemon memory usage should stay under 50MB', async () => {
      // Given: Running daemon
      const daemon = await startDaemon({})
      
      // When: Running for extended period
      await runExtendedTest(30000) // 30 seconds
      
      // Then: Memory usage should be under limit
      const memoryUsage = daemon.getMemoryUsage()
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024) // 50MB
    })
    
    test('lock contention should resolve within 1 second', async () => {
      // Given: Contending locks
      const daemon1 = await startDaemon({})
      const daemon2 = await startDaemon({})
      
      // When: Contending for lock
      const start = performance.now()
      const lock1 = await daemon1.acquireLock('contention-lock')
      const lock2 = await daemon2.acquireLock('contention-lock')
      const duration = performance.now() - start
      
      // Then: Should resolve within 1 second
      expect(duration).toBeLessThan(1000)
    })
  })
})
```

## Cross-Cutting Concerns Executable Specifications

### 6. Cross-Cutting Concerns

```javascript
// specs/006-cross-cutting-concerns/EXECUTABLE_TESTS.md

describe('Cross-Cutting Concerns', () => {
  describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      // Given: Network failure simulation
      const networkFailure = simulateNetworkFailure()
      
      // When: Executing job with network dependency
      const result = await executeJob('network-job')
      
      // Then: Should handle failure gracefully
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Network error')
      expect(result.retryable).toBe(true)
    })
    
    test('should handle file system errors', async () => {
      // Given: File system error simulation
      const fsError = simulateFileSystemError()
      
      // When: Executing file operation
      const result = await executeJob('file-job')
      
      // Then: Should handle error gracefully
      expect(result.ok).toBe(false)
      expect(result.error).toContain('File system error')
    })
    
    test('should implement retry logic', async () => {
      // Given: Flaky operation
      const flakyOp = createFlakyOperation(0.5) // 50% failure rate
      
      // When: Executing with retry
      const result = await executeWithRetry(flakyOp, { maxRetries: 3 })
      
      // Then: Should eventually succeed
      expect(result.ok).toBe(true)
      expect(result.attempts).toBeGreaterThan(1)
    })
  })
  
  describe('Logging', () => {
    test('should provide structured logging', () => {
      // Given: Logger
      const logger = createLogger()
      
      // When: Logging events
      logger.info('Job started', { jobId: '123', worktree: 'main' })
      logger.error('Job failed', { jobId: '123', error: 'Test error' })
      
      // Then: Should log structured data
      const logs = logger.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].level).toBe('info')
      expect(logs[0].message).toBe('Job started')
      expect(logs[0].jobId).toBe('123')
    })
    
    test('should respect log levels', () => {
      // Given: Logger with level
      const logger = createLogger({ level: 'warn' })
      
      // When: Logging different levels
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')
      
      // Then: Should only log warn and error
      const logs = logger.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs.every(log => ['warn', 'error'].includes(log.level))).toBe(true)
    })
  })
  
  describe('Security', () => {
    test('should validate input sanitization', () => {
      // Given: Malicious input
      const maliciousInput = '<script>alert("xss")</script>'
      
      // When: Sanitizing input
      const sanitized = sanitizeInput(maliciousInput)
      
      // Then: Should remove dangerous content
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
    })
    
    test('should enforce access control', async () => {
      // Given: Restricted operation
      const restrictedOp = createRestrictedOperation()
      
      // When: Executing without permission
      // Then: Should deny access
      await expect(restrictedOp.execute()).rejects.toThrow('Access denied')
    })
    
    test('should protect sensitive data', () => {
      // Given: Sensitive data
      const sensitiveData = { password: 'secret', token: 'abc123' }
      
      // When: Logging data
      const logEntry = createLogEntry(sensitiveData)
      
      // Then: Should mask sensitive fields
      expect(logEntry.password).toBe('***')
      expect(logEntry.token).toBe('***')
    })
  })
  
  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      // Given: Performance monitor
      const monitor = createPerformanceMonitor()
      
      // When: Executing operation
      await monitor.track('job-execution', async () => {
        await executeJob('test-job')
      })
      
      // Then: Should record metrics
      const metrics = monitor.getMetrics('job-execution')
      expect(metrics.count).toBe(1)
      expect(metrics.duration).toBeGreaterThan(0)
      expect(metrics.memory).toBeGreaterThan(0)
    })
    
    test('should alert on performance degradation', async () => {
      // Given: Performance monitor with alerts
      const monitor = createPerformanceMonitor({
        thresholds: { duration: 1000, memory: 1000000 }
      })
      
      // When: Executing slow operation
      await monitor.track('slow-operation', async () => {
        await sleep(1500) // 1.5 seconds
      })
      
      // Then: Should trigger alert
      const alerts = monitor.getAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('performance')
      expect(alerts[0].metric).toBe('duration')
    })
  })
  
  describe('Resource Management', () => {
    test('should prevent memory leaks', async () => {
      // Given: Memory monitor
      const monitor = createMemoryMonitor()
      
      // When: Executing many operations
      for (let i = 0; i < 1000; i++) {
        await executeJob(`job-${i}`)
      }
      
      // Then: Memory should not grow unbounded
      const memoryUsage = monitor.getMemoryUsage()
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024) // 100MB
    })
    
    test('should clean up resources', async () => {
      // Given: Resource manager
      const manager = createResourceManager()
      
      // When: Creating and releasing resources
      const resource = await manager.createResource()
      await manager.releaseResource(resource)
      
      // Then: Resource should be cleaned up
      expect(manager.getResourceCount()).toBe(0)
    })
  })
})
```

## Summary

This document demonstrates exactly what executable specifications would look like for all GitVan v2 components. Each specification includes:

1. **Comprehensive Test Coverage**: All major functionality covered with executable tests
2. **Performance Contracts**: Measurable performance requirements with automated validation
3. **Security Contracts**: Security requirements with automated security testing
4. **API Contracts**: Clear API specifications with contract validation
5. **Error Handling**: Comprehensive error scenarios and recovery testing

The specifications provide a complete picture of what the SDD process would entail, allowing you to evaluate the approach before committing to implementation.
