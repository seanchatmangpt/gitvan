# GitVan AI Composable Education System

## Executive Summary

This document explores implementing a comprehensive AI education system that teaches LLMs about GitVan composables through rich context prompts, source code examples, and interactive patterns. The goal is to maximize the 250k token limit to provide complete understanding of GitVan's architecture.

## Current State Analysis

### Problems Identified
1. **LLM has no GitVan knowledge** - Generates generic JavaScript
2. **No composable awareness** - Doesn't know about `useGit`, `useTemplate`, `useNotes`
3. **Missing patterns** - No understanding of GitVan job structure
4. **Token waste** - Not utilizing available context effectively

### Documentation Coverage
- **56 files** reference composables in docs/
- **Comprehensive API docs** exist for all composables
- **Source code** is well-documented and modular
- **Examples** are scattered across multiple files

## Proposed Implementation

### 1. Composable Knowledge Base

Create dedicated prompt files that teach LLMs about each composable:

#### `src/ai/prompts/composables/useGit.mjs`
```javascript
export const USE_GIT_CONTEXT = `
# GitVan useGit() Composable

## Overview
The useGit() composable provides comprehensive Git operations through a modular factory pattern.

## Architecture
- **Factory Pattern**: Each operation type is a separate module
- **Context Aware**: Uses unctx for async context binding
- **POSIX First**: No external dependencies, pure ESM
- **Deterministic**: TZ=UTC, LANG=C environment

## Core Modules
- **repo.mjs**: Repository information (root, head, status, info)
- **commits.mjs**: Commit operations (log, revList, mergeBase, describeLastTag)
- **diff.mjs**: Diff operations (diff, changedFiles, diffNames, pathsChanged)
- **branches.mjs**: Branch operations (list, create, delete, checkout, switch)
- **tags.mjs**: Tag operations (list, create, pushTags)
- **notes.mjs**: Git notes (add, append, show, list) - uses refs/notes/gitvan/results
- **refs.mjs**: Reference operations (listRefs, getRef, updateRef)
- **worktrees.mjs**: Worktree operations (list, add, remove, prune)
- **remotes.mjs**: Remote operations (fetch, push, pull, defaultRemote)

## Usage Pattern
\`\`\`javascript
import { useGit } from 'file:///Users/sac/gitvan/src/index.mjs'

const git = useGit()

// Repository info
const root = await git.worktreeRoot()
const head = await git.currentHead()
const branch = await git.currentBranch()
const status = await git.worktreeStatus()
const isClean = await git.isClean()

// File operations
await git.writeFile('path/file.txt', 'content')
const content = await git.readFile('path/file.txt')

// Commit operations
await git.commit('message')
const commits = await git.log({ maxCount: 10 })
const lastTag = await git.describeLastTag()

// Notes (audit trail)
await git.noteAdd('key', 'value')
const note = await git.noteShow('key')
\`\`\`

## Key Methods
- **worktreeRoot()**: Get repository root directory
- **currentHead()**: Get current HEAD commit SHA
- **currentBranch()**: Get current branch name
- **writeFile(path, content)**: Write file to working directory
- **readFile(path)**: Read file from working directory
- **commit(message)**: Create commit with staged changes
- **log(options)**: Get commit history
- **noteAdd(key, value)**: Add Git note for audit trail
- **noteShow(key)**: Retrieve Git note

## Error Handling
All methods throw on failure - no retries, no shell interpolation.
Use try/catch for error handling.

## Context Binding
\`\`\`javascript
import { withGitVan } from './src/core/context.mjs'

await withGitVan({ cwd: '/path/to/repo' }, async () => {
  const git = useGit()
  // All operations use bound context
})
\`\`\`
`;
```

#### `src/ai/prompts/composables/useTemplate.mjs`
```javascript
export const USE_TEMPLATE_CONTEXT = `
# GitVan useTemplate() Composable

## Overview
The useTemplate() composable provides Nunjucks-based template rendering with frontmatter support, inflection filters, and deterministic operations.

## Key Features
- **Nunjucks Engine**: Powerful templating with filters
- **Frontmatter Support**: Parse YAML frontmatter from templates
- **Inflection Filters**: capitalize, pluralize, singularize, etc.
- **Deterministic**: No random() or now() calls
- **Path Resolution**: Automatic template path discovery
- **Caching**: Environment caching for performance

## Usage Pattern
\`\`\`javascript
import { useTemplate } from 'file:///Users/sac/gitvan/src/index.mjs'

const template = useTemplate({ paths: ['templates'] })

// Render file template
const rendered = await template.render('changelog.njk', {
  commits: commits,
  version: '1.0.0'
})

// Render string template
const result = await template.renderString('Hello {{ name | capitalize }}!', {
  name: 'world'
})

// Parse frontmatter
const { data, content } = await template.parseFrontmatter('job.md')

// Create and apply plan
const plan = await template.plan('template.njk', data)
const applied = await template.apply(plan)
\`\`\`

## Template Examples

### Changelog Template (changelog.njk)
\`\`\`nunjucks
# Changelog

## {{ version }} ({{ date }})

{% for commit in commits %}
- {{ commit.message | capitalize }}
{% endfor %}
\`\`\`

### Job Template (job.njk)
\`\`\`nunjucks
---
name: {{ jobName }}
desc: {{ description }}
tags: [{{ tags | join(', ') }}]
---

# {{ jobName | capitalize }}

{{ description }}

## Operations
{% for op in operations %}
- {{ op.description }}
{% endfor %}
\`\`\`

## Inflection Filters
- **capitalize**: "hello world" → "Hello World"
- **pluralize**: "user" → "users"
- **singularize**: "users" → "user"
- **camelize**: "hello_world" → "helloWorld"
- **dasherize**: "helloWorld" → "hello-world"

## Frontmatter Schema
\`\`\`yaml
name: string
desc: string
tags: string[]
author: string
version: string
on: object | string | array
cron: string
schedule: string
\`\`\`
`;
```

#### `src/ai/prompts/composables/useNotes.mjs`
```javascript
export const USE_NOTES_CONTEXT = `
# GitVan useNotes() Composable

## Overview
The useNotes() composable provides Git notes functionality for audit trails, receipts, and metadata storage using refs/notes/gitvan/results.

## Key Features
- **Audit Trail**: Track job execution and results
- **Receipt System**: Store job outcomes and artifacts
- **Metadata Storage**: Store structured data as Git notes
- **Atomic Operations**: Safe concurrent access
- **Searchable**: Query notes by key patterns

## Usage Pattern
\`\`\`javascript
import { useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

const notes = useNotes()

// Write audit trail
await notes.write('Job backup completed successfully')

// Write structured data
await notes.write('job-result', {
  jobId: 'backup-job',
  status: 'success',
  artifacts: ['backup.tar.gz'],
  duration: 1200,
  timestamp: new Date().toISOString()
})

// Read notes
const content = await notes.read('job-result')
const allNotes = await notes.list()

// Search notes
const jobNotes = await notes.search('job-')
\`\`\`

## Notes Reference
- **Default Ref**: refs/notes/gitvan/results
- **Format**: JSON for structured data, plain text for audit trails
- **Keys**: Hierarchical naming (job-result, audit-trail, etc.)

## Integration with Jobs
\`\`\`javascript
export default defineJob({
  meta: { name: 'backup-job', desc: 'Backup files' },
  async run({ ctx, payload, meta }) {
    const notes = useNotes()
    
    try {
      // Do work
      await git.writeFile('backup.txt', 'data')
      
      // Log success
      await notes.write('backup-success', {
        jobId: meta.name,
        status: 'success',
        artifacts: ['backup.txt']
      })
      
      return { ok: true, artifacts: ['backup.txt'] }
    } catch (error) {
      // Log failure
      await notes.write('backup-failure', {
        jobId: meta.name,
        status: 'error',
        error: error.message
      })
      throw error
    }
  }
})
\`\`\`
`;
```

### 2. Job Pattern Education

#### `src/ai/prompts/patterns/job-patterns.mjs`
```javascript
export const JOB_PATTERNS_CONTEXT = `
# GitVan Job Patterns

## Standard Job Structure
\`\`\`javascript
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: {
    name: 'job-name',
    desc: 'Clear description of what the job does',
    tags: ['category', 'subcategory'],
    author: 'Author Name',
    version: '1.0.0'
  },
  config: {
    on: { tagCreate: 'v*' },  // Event triggers
    cron: '0 2 * * *',        // Cron schedule
    schedule: 'daily'         // Human-readable schedule
  },
  async run({ ctx, payload, meta }) {
    try {
      // Initialize composables
      const git = useGit()
      const template = useTemplate()
      const notes = useNotes()
      
      // Job logic
      console.log(\`Executing job: \${meta.desc}\`)
      
      // Do work using composables
      await git.writeFile('output.txt', 'content')
      const rendered = await template.render('template.njk', data)
      await notes.write('job-completed', { status: 'success' })
      
      // Return success
      return {
        ok: true,
        artifacts: ['output.txt'],
        summary: 'Job completed successfully'
      }
    } catch (error) {
      console.error('Job failed:', error.message)
      return {
        ok: false,
        error: error.message,
        artifacts: []
      }
    }
  }
})
\`\`\`

## Common Job Types

### File Processing Job
\`\`\`javascript
export default defineJob({
  meta: { name: 'process-files', desc: 'Process and transform files' },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const notes = useNotes()
    
    const files = payload.files || ['src/**/*.js']
    
    for (const file of files) {
      const content = await git.readFile(file)
      const processed = processContent(content)
      await git.writeFile(file, processed)
    }
    
    await notes.write('files-processed', { count: files.length })
    
    return { ok: true, artifacts: files }
  }
})
\`\`\`

### Template Generation Job
\`\`\`javascript
export default defineJob({
  meta: { name: 'generate-docs', desc: 'Generate documentation from templates' },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const template = useTemplate()
    const notes = useNotes()
    
    const data = await git.readFile('data.json')
    const rendered = await template.render('docs.njk', JSON.parse(data))
    await git.writeFile('docs.md', rendered)
    
    await notes.write('docs-generated', { template: 'docs.njk' })
    
    return { ok: true, artifacts: ['docs.md'] }
  }
})
\`\`\`

### Backup Job
\`\`\`javascript
export default defineJob({
  meta: { name: 'backup-files', desc: 'Backup important files' },
  config: { cron: '0 2 * * *' },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const notes = useNotes()
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = \`backups/\${timestamp}\`
    
    const files = ['package.json', 'README.md', 'src/']
    for (const file of files) {
      try {
        const content = await git.readFile(file)
        await git.writeFile(\`\${backupDir}/\${file}\`, content)
      } catch (error) {
        console.warn(\`Could not backup \${file}\`)
      }
    }
    
    await notes.write('backup-completed', { 
      backupDir, 
      files: files.length 
    })
    
    return { ok: true, artifacts: [backupDir] }
  }
})
\`\`\`
`;
```

### 3. Source Code Integration

#### `src/ai/prompts/source-code/composable-sources.mjs`
```javascript
// Include actual source code snippets for LLM learning
export const COMPOSABLE_SOURCES = {
  useGit: `
// Key methods from src/composables/git/repo.mjs
export default function makeRepo(base, run, runVoid, toArr) {
  return {
    async worktreeRoot() {
      return run(['rev-parse', '--show-toplevel'])
    },
    
    async currentHead() {
      return run(['rev-parse', 'HEAD'])
    },
    
    async currentBranch() {
      return run(['rev-parse', '--abbrev-ref', 'HEAD'])
    },
    
    async writeFile(path, content) {
      const fullPath = base.resolve(path)
      await fs.writeFile(fullPath, content, 'utf8')
    },
    
    async readFile(path) {
      const fullPath = base.resolve(path)
      return await fs.readFile(fullPath, 'utf8')
    }
  }
}
`,

  useTemplate: `
// Key methods from src/composables/template.mjs
export function useTemplate(opts = {}) {
  return {
    async render(templatePath, data) {
      const env = await getCachedEnvironment(opts)
      const template = env.getTemplate(templatePath)
      return template.render(data)
    },
    
    async renderString(templateString, data) {
      const env = await getCachedEnvironment(opts)
      return env.renderString(templateString, data)
    },
    
    async parseFrontmatter(filePath) {
      const content = await fs.readFile(filePath, 'utf8')
      return parseFrontmatter(content)
    }
  }
}
`
};
```

### 4. Comprehensive Context Assembly

#### `src/ai/prompts/gitvan-complete-context.mjs`
```javascript
import { USE_GIT_CONTEXT } from './composables/useGit.mjs'
import { USE_TEMPLATE_CONTEXT } from './composables/useTemplate.mjs'
import { USE_NOTES_CONTEXT } from './composables/useNotes.mjs'
import { JOB_PATTERNS_CONTEXT } from './patterns/job-patterns.mjs'
import { COMPOSABLE_SOURCES } from './source-code/composable-sources.mjs'

export const GITVAN_COMPLETE_CONTEXT = `
# GitVan v2 Complete AI Context

## System Overview
GitVan is a Git-native development automation platform that uses JavaScript/ESM for jobs and a composable API. It leverages Git as a runtime environment with comprehensive composables for Git operations, templating, and automation.

## Core Philosophy
- **Git-Native**: Uses Git as the runtime environment
- **Composable**: Modular, reusable functions
- **Deterministic**: No random operations, predictable outcomes
- **Context-Aware**: Async context binding with unctx
- **POSIX-First**: No external dependencies, pure ESM

## Architecture
- **Jobs**: Defined using defineJob({ meta, on, run })
- **Composables**: useGit(), useTemplate(), useNotes(), etc.
- **Events**: Triggered by Git operations (tag:create, push:refs/heads/*)
- **Receipts**: Git notes for audit trails (refs/notes/gitvan/results)
- **Templates**: Nunjucks-based with frontmatter support

${USE_GIT_CONTEXT}

${USE_TEMPLATE_CONTEXT}

${USE_NOTES_CONTEXT}

${JOB_PATTERNS_CONTEXT}

## Source Code Examples
${COMPOSABLE_SOURCES.useGit}

${COMPOSABLE_SOURCES.useTemplate}

## Job Generation Requirements
When generating GitVan jobs, ensure:
1. Use proper imports: import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'
2. Include complete meta object with name, desc, tags, author, version
3. Use composables for all operations (git.writeFile, template.render, notes.write)
4. Include proper error handling with try/catch
5. Return proper structure: { ok: boolean, artifacts: string[], summary: string }
6. Use async/await for all operations
7. Include meaningful console.log statements
8. Use GitVan patterns (defineJob, composables, error handling)

## Common Mistakes to Avoid
- Don't use generic console.log without composables
- Don't skip error handling
- Don't forget to use composables for file operations
- Don't generate incomplete job structures
- Don't use synchronous operations where async is required
`;
```

### 5. Token Optimization Strategy

#### Token Budget Allocation (250k limit)
- **Composable Documentation**: ~50k tokens
- **Job Patterns**: ~30k tokens  
- **Source Code Examples**: ~40k tokens
- **Architecture Overview**: ~20k tokens
- **Error Handling Patterns**: ~15k tokens
- **Integration Examples**: ~25k tokens
- **Reserved for Dynamic Content**: ~70k tokens

#### Dynamic Context Loading
```javascript
export function getContextForPrompt(prompt, maxTokens = 250000) {
  const baseContext = GITVAN_COMPLETE_CONTEXT // ~200k tokens
  
  // Add specific composable details based on prompt
  if (prompt.includes('template')) {
    return baseContext + TEMPLATE_DETAILED_EXAMPLES
  }
  
  if (prompt.includes('git')) {
    return baseContext + GIT_DETAILED_EXAMPLES
  }
  
  if (prompt.includes('backup')) {
    return baseContext + BACKUP_JOB_EXAMPLES
  }
  
  return baseContext
}
```

## Implementation Plan

### Phase 1: Create Prompt Files
1. Create `src/ai/prompts/composables/` directory
2. Create individual composable context files
3. Create job pattern files
4. Create source code integration files

### Phase 2: Integrate with Provider Factory
1. Update `createAIProvider` to use rich context
2. Implement dynamic context loading
3. Add token counting and optimization

### Phase 3: Update Tests
1. Update tests to validate composable usage
2. Add tests for context loading
3. Validate token efficiency

### Phase 4: Documentation
1. Document the AI education system
2. Create examples of effective prompts
3. Measure improvement in job generation quality

## Success Metrics

- ✅ Generated jobs use proper GitVan composables
- ✅ Generated jobs actually run without errors
- ✅ LLM understands GitVan architecture
- ✅ Token usage is optimized (under 250k limit)
- ✅ Job generation quality improves significantly
- ✅ Tests validate real GitVan integration

## Conclusion

This comprehensive AI education system will transform GitVan's job generation from broken generic JavaScript to working GitVan jobs that properly use composables, follow patterns, and integrate with the runtime. The 250k token limit provides ample space for rich context that teaches the LLM everything it needs to know about GitVan's architecture.
