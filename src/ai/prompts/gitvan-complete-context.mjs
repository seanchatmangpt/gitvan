/**
 * GitVan Complete AI Context
 * Comprehensive context that teaches LLMs everything about GitVan
 */

import { USE_GIT_CONTEXT } from "./composables/useGit.mjs";
import { USE_TEMPLATE_CONTEXT } from "./composables/useTemplate.mjs";
import { USE_NOTES_CONTEXT } from "./composables/useNotes.mjs";
import { JOB_PATTERNS_CONTEXT } from "./patterns/job-patterns.mjs";

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

## Job Generation Requirements
When generating GitVan jobs, ensure:

### 1. Proper Imports
\`\`\`javascript
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'
\`\`\`

### 2. Complete Meta Object
\`\`\`javascript
meta: {
  name: 'job-name',           // Required: Unique identifier
  desc: 'Job description',   // Required: Clear description
  tags: ['tag1', 'tag2'],     // Required: Categorization
  author: 'Author Name',      // Required: Author name
  version: '1.0.0'            // Required: Version number
}
\`\`\`

### 3. Use Composables for All Operations
\`\`\`javascript
const git = useGit()          // For file operations
const template = useTemplate() // For templating
const notes = useNotes()      // For audit trails

// File operations
await git.writeFile('file.txt', 'content')
const content = await git.readFile('file.txt')

// Template operations
const rendered = await template.render('template.njk', data)

// Notes operations
await notes.write('job-completed', { status: 'success' })
\`\`\`

### 4. Proper Error Handling
\`\`\`javascript
try {
  // Job logic using composables
  return { ok: true, artifacts: [], summary: 'Success' }
} catch (error) {
  console.error('Job failed:', error.message)
  return { ok: false, error: error.message, artifacts: [] }
}
\`\`\`

### 5. Return Proper Structure
\`\`\`javascript
// Success
return {
  ok: true,
  artifacts: ['file1.txt', 'file2.txt'],
  summary: 'Job completed successfully'
}

// Failure
return {
  ok: false,
  error: 'Detailed error message',
  artifacts: []
}
\`\`\`

### 6. Use Async/Await
All operations must use async/await:
\`\`\`javascript
async run({ ctx, payload, meta }) {
  const git = useGit()
  await git.writeFile('file.txt', 'content')
}
\`\`\`

### 7. Include Meaningful Logging
\`\`\`javascript
console.log(\`Executing job: \${meta.desc}\`)
console.log('Processing files...')
console.log('Job completed successfully')
\`\`\`

## Common Mistakes to Avoid

### ❌ Don't Use Generic Operations
\`\`\`javascript
// WRONG
console.log('Execute task')

// CORRECT
const git = useGit()
await git.writeFile('output.txt', 'content')
\`\`\`

### ❌ Don't Skip Error Handling
\`\`\`javascript
// WRONG
async run({ ctx, payload, meta }) {
  const git = useGit()
  await git.writeFile('file.txt', 'content')
  return { ok: true }
}

// CORRECT
async run({ ctx, payload, meta }) {
  try {
    const git = useGit()
    await git.writeFile('file.txt', 'content')
    return { ok: true, artifacts: ['file.txt'], summary: 'File created' }
  } catch (error) {
    console.error('Job failed:', error.message)
    return { ok: false, error: error.message, artifacts: [] }
  }
}
\`\`\`

### ❌ Don't Forget Composables
\`\`\`javascript
// WRONG
const fs = require('fs')
fs.writeFileSync('file.txt', 'content')

// CORRECT
const git = useGit()
await git.writeFile('file.txt', 'content')
\`\`\`

### ❌ Don't Generate Incomplete Jobs
\`\`\`javascript
// WRONG
export default {
  meta: { desc: 'Job' }
  // Missing run function
}

// CORRECT
export default defineJob({
  meta: { name: 'job-name', desc: 'Job description', tags: ['tag'], author: 'Author', version: '1.0.0' },
  async run({ ctx, payload, meta }) {
    // Complete implementation
  }
})
\`\`\`

## Example: Complete Working Job
\`\`\`javascript
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: {
    name: 'backup-job',
    desc: 'Backup important files using GitVan composables',
    tags: ['backup', 'automation', 'file-operation'],
    author: 'GitVan AI',
    version: '1.0.0'
  },
  config: {
    cron: '0 2 * * *'
  },
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit()
      const template = useTemplate()
      const notes = useNotes()
      
      console.log(\`Executing job: \${meta.desc}\`)
      
      // Create backup directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupDir = \`backups/\${timestamp}\`
      
      // Create backup directory
      await git.writeFile(\`\${backupDir}/README.txt\`, \`Backup created at \${new Date().toISOString()}\`)
      
      // Copy important files
      const importantFiles = ['package.json', 'README.md', 'src/']
      const backedUpFiles = []
      
      for (const file of importantFiles) {
        try {
          if (await git.exists(file)) {
            const content = await git.readFile(file)
            await git.writeFile(\`\${backupDir}/\${file}\`, content)
            backedUpFiles.push(\`\${backupDir}/\${file}\`)
          }
        } catch (error) {
          console.warn(\`Could not backup \${file}: \${error.message}\`)
        }
      }
      
      // Generate backup manifest using template
      const manifest = await template.renderString(\`
{
  "timestamp": "{{ timestamp }}",
  "files": {{ files | dump }},
  "backupDir": "{{ backupDir }}"
}
\`, {
        timestamp: timestamp,
        files: backedUpFiles,
        backupDir: backupDir
      })
      
      await git.writeFile(\`\${backupDir}/manifest.json\`, manifest)
      
      // Log backup completion
      await notes.write('backup-completed', JSON.stringify({
        backupDir: backupDir,
        fileCount: backedUpFiles.length,
        timestamp: timestamp
      }))
      
      return {
        ok: true,
        artifacts: [backupDir],
        summary: \`Backup completed: \${backedUpFiles.length} files\`
      }
    } catch (error) {
      console.error('Backup failed:', error.message)
      return {
        ok: false,
        error: error.message,
        artifacts: []
      }
    }
  }
})
\`\`\`

## Summary
GitVan jobs must:
1. Use proper imports and defineJob structure
2. Include complete meta object with all required fields
3. Use composables (useGit, useTemplate, useNotes) for all operations
4. Include proper error handling with try/catch
5. Return proper structure with ok, artifacts, and summary
6. Use async/await for all operations
7. Include meaningful logging and audit trails
8. Follow GitVan patterns and conventions

This context provides everything needed to generate working GitVan jobs that properly integrate with the runtime and use composables effectively.
`;
