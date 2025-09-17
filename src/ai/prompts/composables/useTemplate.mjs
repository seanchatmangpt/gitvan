/**
 * GitVan useTemplate() Composable Context
 * Comprehensive education for LLMs about GitVan's template system
 */

export const USE_TEMPLATE_CONTEXT = `
# GitVan useTemplate() Composable

## Overview
The useTemplate() composable provides Nunjucks-based template rendering with frontmatter support, inflection filters, and deterministic operations. It's essential for generating dynamic content in GitVan jobs.

## Key Features
- **Nunjucks Engine**: Powerful templating with filters and inheritance
- **Frontmatter Support**: Parse YAML frontmatter from templates
- **Inflection Filters**: capitalize, pluralize, singularize, camelize, dasherize
- **Deterministic**: No random() or now() calls - predictable output
- **Path Resolution**: Automatic template path discovery
- **Caching**: Environment caching for performance
- **Config Integration**: Uses GitVan config system for template directories

## Core Methods

### Template Rendering
- **render(templatePath, data)**: Render file template with data
- **renderString(templateString, data)**: Render string template with data
- **parseFrontmatter(filePath)**: Parse YAML frontmatter from file
- **plan(templatePath, data)**: Create execution plan for template
- **apply(plan)**: Apply template execution plan

## Usage Pattern
\`\`\`javascript
import { useTemplate } from 'file:///Users/sac/gitvan/src/index.mjs'

const template = useTemplate({ paths: ['templates'] })

// Render file template
const rendered = await template.render('changelog.njk', {
  commits: commits,
  version: '1.0.0',
  date: new Date().toISOString().split('T')[0]
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
  - Author: {{ commit.author }}
  - Date: {{ commit.date }}
{% endfor %}

## Summary
- Total commits: {{ commits | length }}
- Contributors: {{ commits | map(attribute='author') | unique | length }}
\`\`\`

### Job Template (job.njk)
\`\`\`nunjucks
---
name: {{ jobName }}
desc: {{ description }}
tags: [{{ tags | join(', ') }}]
author: {{ author }}
version: {{ version }}
---

# {{ jobName | capitalize }}

{{ description }}

## Operations
{% for op in operations %}
- {{ op.description }}
{% endfor %}

## Configuration
{% if cron %}
- Schedule: {{ cron }}
{% endif %}
{% if on %}
- Triggers: {{ on | dump }}
{% endif %}
\`\`\`

### Documentation Template (docs.njk)
\`\`\`nunjucks
# {{ title | capitalize }}

## Overview
{{ description }}

## API Reference
{% for method in methods %}
### {{ method.name | camelize }}
\`\`\`javascript
{{ method.signature }}
\`\`\`

{{ method.description }}
{% endfor %}
\`\`\`

## Inflection Filters

### Available Filters
- **capitalize**: "hello world" → "Hello World"
- **pluralize**: "user" → "users", "person" → "people"
- **singularize**: "users" → "user", "people" → "person"
- **camelize**: "hello_world" → "helloWorld"
- **dasherize**: "helloWorld" → "hello-world"
- **underscore**: "helloWorld" → "hello_world"
- **titleize**: "hello world" → "Hello World"

### Usage Examples
\`\`\`nunjucks
{{ "hello world" | capitalize }}     <!-- Hello World -->
{{ "user" | pluralize }}              <!-- users -->
{{ "hello_world" | camelize }}         <!-- helloWorld -->
{{ "helloWorld" | dasherize }}         <!-- hello-world -->
\`\`\`

## Frontmatter Schema
\`\`\`yaml
name: string                    # Job name
desc: string                   # Job description
tags: string[]                 # Job tags
author: string                 # Author name
version: string                # Version number
on: object | string | array    # Event triggers
cron: string                   # Cron expression
schedule: string               # Human-readable schedule
template: string               # Template to use
output: string                 # Output file path
\`\`\`

## Common Patterns

### Dynamic Content Generation
\`\`\`javascript
const template = useTemplate()
const git = useGit()

// Read data
const commits = await git.log({ maxCount: 10 })
const config = await git.readFile('config.json')

// Generate changelog
const changelog = await template.render('changelog.njk', {
  commits: commits,
  version: '1.0.0',
  date: new Date().toISOString().split('T')[0]
})

// Write result
await git.writeFile('CHANGELOG.md', changelog)
\`\`\`

### Configuration-Driven Templates
\`\`\`javascript
const template = useTemplate()

// Parse frontmatter to get template config
const { data } = await template.parseFrontmatter('job-config.md')

// Use config to render template
const rendered = await template.render(data.template, {
  ...data,
  timestamp: new Date().toISOString()
})

// Write output
await git.writeFile(data.output, rendered)
\`\`\`

### Multi-Template Workflows
\`\`\`javascript
const template = useTemplate()

// Generate multiple outputs from same data
const data = { commits: commits, version: '1.0.0' }

const changelog = await template.render('changelog.njk', data)
const releaseNotes = await template.render('release-notes.njk', data)
const apiDocs = await template.render('api-docs.njk', data)

// Write all outputs
await git.writeFile('CHANGELOG.md', changelog)
await git.writeFile('RELEASE_NOTES.md', releaseNotes)
await git.writeFile('API.md', apiDocs)
\`\`\`

## Integration with GitVan Jobs
\`\`\`javascript
export default defineJob({
  meta: {
    name: 'generate-docs',
    desc: 'Generate documentation from templates'
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
      await notes.write('docs-generated', {
        template: 'docs.njk',
        output: 'docs.md',
        timestamp: new Date().toISOString()
      })
      
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

## Error Handling
\`\`\`javascript
try {
  const rendered = await template.render('template.njk', data)
} catch (error) {
  if (error.message.includes('template not found')) {
    console.error('Template file not found')
  } else if (error.message.includes('syntax error')) {
    console.error('Template syntax error:', error.message)
  } else {
    console.error('Template rendering failed:', error.message)
  }
  throw error
}
\`\`\`

## Performance Tips
- Use template caching (enabled by default)
- Minimize data passed to templates
- Use string templates for simple cases
- Pre-compile templates for repeated use
- Use frontmatter for configuration-driven templates
`;
