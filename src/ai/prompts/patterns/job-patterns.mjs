/**
 * GitVan Job Patterns Context
 * Comprehensive education for LLMs about GitVan job patterns and structures
 */

export const JOB_PATTERNS_CONTEXT = `
# GitVan Job Patterns

## Standard Job Structure
Every GitVan job follows this standard structure:

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

## Required Job Components

### 1. Import Statement
\`\`\`javascript
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'
\`\`\`

### 2. Meta Object
\`\`\`javascript
meta: {
  name: 'job-name',           // Required: Unique job identifier
  desc: 'Job description',    // Required: Clear description
  tags: ['tag1', 'tag2'],     // Required: Categorization tags
  author: 'Author Name',      // Required: Author name
  version: '1.0.0'            // Required: Version number
}
\`\`\`

### 3. Config Object (Optional)
\`\`\`javascript
config: {
  on: { tagCreate: 'v*' },    // Event triggers
  cron: '0 2 * * *',          // Cron schedule
  schedule: 'daily'           // Human-readable schedule
}
\`\`\`

### 4. Run Function
\`\`\`javascript
async run({ ctx, payload, meta }) {
  // Job implementation
}
\`\`\`

## Common Job Types

### File Processing Job
\`\`\`javascript
export default defineJob({
  meta: {
    name: 'process-files',
    desc: 'Process and transform files',
    tags: ['file-processing', 'automation'],
    author: 'GitVan AI',
    version: '1.0.0'
  },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const notes = useNotes()
    
    const files = payload.files || ['src/**/*.js']
    const processedFiles = []
    
    for (const file of files) {
      if (await git.exists(file)) {
        const content = await git.readFile(file)
        const processed = processContent(content)
        await git.writeFile(file, processed)
        processedFiles.push(file)
      }
    }
    
    await notes.write('files-processed', JSON.stringify({
      count: processedFiles.length,
      files: processedFiles,
      timestamp: new Date().toISOString()
    }))
    
    return {
      ok: true,
      artifacts: processedFiles,
      summary: \`Processed \${processedFiles.length} files\`
    }
  }
})
\`\`\`

### Template Generation Job
\`\`\`javascript
export default defineJob({
  meta: {
    name: 'generate-docs',
    desc: 'Generate documentation from templates',
    tags: ['documentation', 'templating'],
    author: 'GitVan AI',
    version: '1.0.0'
  },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const template = useTemplate()
    const notes = useNotes()
    
    try {
      // Read source data
      const data = await git.readFile('data.json')
      const parsedData = JSON.parse(data)
      
      // Generate documentation
      const docs = await template.render('docs.njk', parsedData)
      
      // Write output
      await git.writeFile('docs.md', docs)
      
      // Log completion
      await notes.write('docs-generated', JSON.stringify({
        template: 'docs.njk',
        output: 'docs.md',
        dataSize: data.length,
        outputSize: docs.length,
        timestamp: new Date().toISOString()
      }))
      
      return {
        ok: true,
        artifacts: ['docs.md'],
        summary: 'Documentation generated successfully'
      }
    } catch (error) {
      console.error('Documentation generation failed:', error.message)
      return {
        ok: false,
        error: error.message,
        artifacts: []
      }
    }
  }
})
\`\`\`

### Backup Job
\`\`\`javascript
export default defineJob({
  meta: {
    name: 'backup-files',
    desc: 'Backup important files with timestamp',
    tags: ['backup', 'automation'],
    author: 'GitVan AI',
    version: '1.0.0'
  },
  config: {
    cron: '0 2 * * *'
  },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const notes = useNotes()
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupDir = \`backups/\${timestamp}\`
      
      const files = payload.files || ['package.json', 'README.md', 'src/']
      const backedUpFiles = []
      
      for (const file of files) {
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
      
      // Create backup manifest
      const manifest = {
        timestamp: timestamp,
        files: backedUpFiles,
        sourceFiles: files,
        backupDir: backupDir
      }
      
      await git.writeFile(\`\${backupDir}/manifest.json\`, JSON.stringify(manifest, null, 2))
      
      // Log completion
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

### Changelog Generation Job
\`\`\`javascript
export default defineJob({
  meta: {
    name: 'generate-changelog',
    desc: 'Generate changelog from Git commits',
    tags: ['documentation', 'changelog'],
    author: 'GitVan AI',
    version: '1.0.0'
  },
  config: {
    on: { tagCreate: 'v*' }
  },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const template = useTemplate()
    const notes = useNotes()
    
    try {
      // Get commits since last tag
      const commits = await git.log({ maxCount: 50 })
      const lastTag = await git.describeLastTag()
      
      // Prepare data for template
      const data = {
        version: payload.version || '1.0.0',
        date: new Date().toISOString().split('T')[0],
        commits: commits.map(commit => ({
          message: commit.message,
          author: commit.author,
          date: commit.date,
          sha: commit.sha.substring(0, 7)
        })),
        lastTag: lastTag
      }
      
      // Generate changelog
      const changelog = await template.render('changelog.njk', data)
      
      // Write changelog
      await git.writeFile('CHANGELOG.md', changelog)
      
      // Log completion
      await notes.write('changelog-generated', JSON.stringify({
        version: data.version,
        commitCount: commits.length,
        lastTag: lastTag,
        timestamp: new Date().toISOString()
      }))
      
      return {
        ok: true,
        artifacts: ['CHANGELOG.md'],
        summary: \`Changelog generated for version \${data.version}\`
      }
    } catch (error) {
      console.error('Changelog generation failed:', error.message)
      return {
        ok: false,
        error: error.message,
        artifacts: []
      }
    }
  }
})
\`\`\`

## Event Triggers

### Tag Events
\`\`\`javascript
config: {
  on: { tagCreate: 'v*' }        // Trigger on version tags
}
\`\`\`

### Branch Events
\`\`\`javascript
config: {
  on: { push: 'refs/heads/main' }  // Trigger on main branch push
}
\`\`\`

### Path Events
\`\`\`javascript
config: {
  on: { pathChanged: ['src/**/*.js', 'docs/**/*.md'] }  // Trigger on file changes
}
\`\`\`

### Multiple Events
\`\`\`javascript
config: {
  on: [
    { tagCreate: 'v*' },
    { push: 'refs/heads/main' }
  ]
}
\`\`\`

## Cron Scheduling
\`\`\`javascript
config: {
  cron: '0 2 * * *',    // Daily at 2 AM
  cron: '0 */6 * * *',  // Every 6 hours
  cron: '0 0 * * 0',    // Weekly on Sunday
  cron: '0 0 1 * *'     // Monthly on 1st
}
\`\`\`

## Error Handling Patterns

### Basic Error Handling
\`\`\`javascript
async run({ ctx, payload, meta }) {
  try {
    // Job logic
    return { ok: true, artifacts: [], summary: 'Success' }
  } catch (error) {
    console.error('Job failed:', error.message)
    return {
      ok: false,
      error: error.message,
      artifacts: []
    }
  }
}
\`\`\`

### Detailed Error Handling
\`\`\`javascript
async run({ ctx, payload, meta }) {
  const notes = useNotes()
  
  try {
    // Job logic
    return { ok: true, artifacts: [], summary: 'Success' }
  } catch (error) {
    // Log detailed error
    await notes.write('job-error', JSON.stringify({
      jobId: meta.name,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }))
    
    console.error('Job failed:', error.message)
    return {
      ok: false,
      error: error.message,
      artifacts: []
    }
  }
}
\`\`\`

## Return Value Patterns

### Success Response
\`\`\`javascript
return {
  ok: true,
  artifacts: ['file1.txt', 'file2.txt'],
  summary: 'Job completed successfully'
}
\`\`\`

### Failure Response
\`\`\`javascript
return {
  ok: false,
  error: 'Detailed error message',
  artifacts: []
}
\`\`\`

### Partial Success Response
\`\`\`javascript
return {
  ok: true,
  artifacts: ['file1.txt'],
  summary: 'Job completed with warnings',
  warnings: ['Could not process file2.txt']
}
\`\`\`

## Best Practices

### 1. Always Use Composables
- Use \`useGit()\` for file operations
- Use \`useTemplate()\` for dynamic content
- Use \`useNotes()\` for audit trails

### 2. Include Proper Error Handling
- Wrap job logic in try/catch
- Log errors to notes
- Return proper error responses

### 3. Use Meaningful Logging
- Log job start/completion
- Include relevant metadata
- Use structured logging with notes

### 4. Return Proper Artifacts
- List all generated files
- Include relevant metadata
- Use consistent artifact naming

### 5. Follow Naming Conventions
- Use kebab-case for job names
- Use descriptive meta.desc
- Use relevant tags for categorization
`;
