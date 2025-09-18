/**
 * GitVan useNotes() Composable Context
 * Comprehensive education for LLMs about GitVan's notes system
 */

export const USE_NOTES_CONTEXT = `
# GitVan useNotes() Composable

## Overview
The useNotes() composable provides Git notes functionality for audit trails, receipts, and metadata storage using refs/notes/gitvan/results. It's essential for tracking job execution, storing results, and maintaining audit trails.

## Key Features
- **Audit Trail**: Track job execution and results
- **Receipt System**: Store job outcomes and artifacts
- **Metadata Storage**: Store structured data as Git notes
- **Atomic Operations**: Safe concurrent access
- **Searchable**: Query notes by key patterns
- **Git-Native**: Uses Git's notes system for persistence

## Core Methods

### Notes Operations
- **write(key, value)**: Write note with key-value pair
- **read(key)**: Read note by key
- **list()**: List all notes
- **search(pattern)**: Search notes by pattern
- **exists(key)**: Check if note exists
- **delete(key)**: Delete note by key

## Usage Pattern
\`\`\`javascript
import { useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

const notes = useNotes()

// Write audit trail
await notes.write('job-execution', 'Backup job completed successfully')

// Write structured data
await notes.write('job-result', JSON.stringify({
  jobId: 'backup-job',
  status: 'success',
  artifacts: ['backup.tar.gz'],
  duration: 1200,
  timestamp: new Date().toISOString()
}))

// Read notes
const content = await notes.read('job-result')
const allNotes = await notes.list()

// Search notes
const jobNotes = await notes.search('job-')
\`\`\`

## Notes Reference System
- **Default Ref**: refs/notes/gitvan/results
- **Format**: JSON for structured data, plain text for audit trails
- **Keys**: Hierarchical naming (job-result, audit-trail, etc.)
- **Persistence**: Stored in Git repository, versioned with commits

## Common Patterns

### Job Execution Tracking
\`\`\`javascript
export default defineJob({
  meta: { name: 'backup-job', desc: 'Backup important files' },
  async run({ ctx, payload, meta }) {
    const git = useGit()
    const notes = useNotes()
    
    const startTime = Date.now()
    
    try {
      // Do work
      await git.writeFile('backup.txt', 'backup data')
      
      // Log success
      await notes.write('backup-success', JSON.stringify({
        jobId: meta.name,
        status: 'success',
        artifacts: ['backup.txt'],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }))
      
      return { ok: true, artifacts: ['backup.txt'] }
    } catch (error) {
      // Log failure
      await notes.write('backup-failure', JSON.stringify({
        jobId: meta.name,
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }))
      throw error
    }
  }
})
\`\`\`

### Audit Trail System
\`\`\`javascript
const notes = useNotes()

// Track file operations
await notes.write('file-operation', JSON.stringify({
  operation: 'write',
  file: 'config.json',
  size: 1024,
  timestamp: new Date().toISOString()
}))

// Track template rendering
await notes.write('template-render', JSON.stringify({
  template: 'changelog.njk',
  output: 'CHANGELOG.md',
  dataSize: 2048,
  timestamp: new Date().toISOString()
}))

// Track Git operations
await notes.write('git-operation', JSON.stringify({
  operation: 'commit',
  message: 'Update documentation',
  files: ['docs.md'],
  timestamp: new Date().toISOString()
}))
\`\`\`

### Receipt System
\`\`\`javascript
const notes = useNotes()

// Create receipt for job completion
const receipt = {
  jobId: 'deploy-job',
  status: 'success',
  artifacts: ['dist/', 'package.json'],
  metadata: {
    environment: 'production',
    version: '1.0.0',
    deployTime: new Date().toISOString()
  },
  checksum: 'sha256:abc123...'
}

await notes.write('receipt-deploy-job', JSON.stringify(receipt))

// Verify receipt
const storedReceipt = await notes.read('receipt-deploy-job')
const parsedReceipt = JSON.parse(storedReceipt)
console.log('Deployment receipt:', parsedReceipt)
\`\`\`

### Configuration Storage
\`\`\`javascript
const notes = useNotes()

// Store job configuration
const config = {
  schedule: '0 2 * * *',
  backupPaths: ['src/', 'docs/', 'package.json'],
  retentionDays: 30,
  compression: true
}

await notes.write('config-backup-job', JSON.stringify(config))

// Retrieve configuration
const storedConfig = await notes.read('config-backup-job')
const parsedConfig = JSON.parse(storedConfig)
\`\`\`

## Integration with Other Composables

### Git + Notes Integration
\`\`\`javascript
const git = useGit()
const notes = useNotes()

// Track file changes
const files = ['src/app.js', 'src/utils.js']
for (const file of files) {
  const content = await git.readFile(file)
  const processed = processContent(content)
  await git.writeFile(file, processed)
  
  // Log each file operation
  await notes.write(\`file-processed-\${file}\`, JSON.stringify({
    file: file,
    size: content.length,
    processed: true,
    timestamp: new Date().toISOString()
  }))
}
\`\`\`

### Template + Notes Integration
\`\`\`javascript
const template = useTemplate()
const notes = useNotes()

// Track template rendering
const data = { commits: commits, version: '1.0.0' }
const rendered = await template.render('changelog.njk', data)

// Log template usage
await notes.write('template-changelog', JSON.stringify({
  template: 'changelog.njk',
  dataKeys: Object.keys(data),
  outputSize: rendered.length,
  timestamp: new Date().toISOString()
}))
\`\`\`

## Error Handling
\`\`\`javascript
const notes = useNotes()

try {
  await notes.write('key', 'value')
} catch (error) {
  if (error.message.includes('notes ref')) {
    console.error('Notes reference not found')
  } else if (error.message.includes('permission')) {
    console.error('Permission denied for notes operation')
  } else {
    console.error('Notes operation failed:', error.message)
  }
  throw error
}
\`\`\`

## Best Practices

### Key Naming Convention
- Use hierarchical keys: 'job-backup-success', 'audit-file-operation'
- Include job/operation type: 'template-changelog', 'git-commit'
- Use consistent prefixes: 'job-', 'audit-', 'config-', 'receipt-'

### Data Format
- Use JSON for structured data
- Use plain text for simple audit trails
- Include timestamps for all entries
- Include relevant metadata (jobId, operation, etc.)

### Performance
- Batch related operations
- Use appropriate key patterns for searching
- Clean up old notes periodically
- Use meaningful key names for easy retrieval

## Common Use Cases

### 1. Job Execution Logging
\`\`\`javascript
await notes.write('job-log', JSON.stringify({
  jobId: 'backup-job',
  startTime: startTime,
  endTime: endTime,
  status: 'success',
  artifacts: ['backup.tar.gz']
}))
\`\`\`

### 2. Configuration Management
\`\`\`javascript
await notes.write('config', JSON.stringify({
  schedule: '0 2 * * *',
  paths: ['src/', 'docs/'],
  retention: 30
}))
\`\`\`

### 3. Audit Trail
\`\`\`javascript
await notes.write('audit', JSON.stringify({
  operation: 'file-write',
  file: 'config.json',
  user: 'system',
  timestamp: new Date().toISOString()
}))
\`\`\`

### 4. Receipt Generation
\`\`\`javascript
await notes.write('receipt', JSON.stringify({
  jobId: 'deploy-job',
  status: 'success',
  artifacts: ['dist/'],
  checksum: 'sha256:abc123'
}))
\`\`\`
`;
