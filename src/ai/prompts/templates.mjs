/**
 * GitVan v2 AI Prompt Templates - Nunjucks templates for AI generation
 * Templates for generating jobs, events, and other GitVan artifacts
 */

// Enhanced verbose job writer template with comprehensive guidance
export const VERBOSE_JOB_WRITER_TEMPLATE = `
# GitVan Job Generator - Comprehensive Template

You are an expert GitVan developer creating a production-ready job module. Follow these guidelines:

## Context & Requirements
- **User Request**: "{{ prompt }}"
- **Job Type**: {{ kind | default('job') }}
- **Target**: {{ target | default('general automation') }}

## GitVan Architecture Guidelines

### 1. Job Structure
- Use \`defineJob()\` from "gitvan/define"
- Include comprehensive \`meta\` object with description and tags
- Implement proper error handling and logging
- Return structured results with \`artifacts\` array

### 2. Available Composables
- **useGit()**: Git operations (commits, refs, notes, branches)
- **useTemplate()**: Nunjucks template rendering with front-matter
- **usePack()**: Pack system for reusable components
- **useJob()**: Job discovery and execution
- **useEvent()**: Event handling and scheduling

### 3. Template System Integration
- Use \`useTemplate()\` for file generation with front-matter
- Support YAML, TOML, JSON front-matter formats
- Implement plan/apply lifecycle for safe operations
- Use path sandboxing for security

### 4. Git Integration Best Practices
- Use atomic operations where possible
- Implement proper locking with Git refs
- Write receipts to Git notes for audit trails
- Handle Git errors gracefully

### 5. Security & Safety
- Validate all inputs and paths
- Use allowlists for shell commands
- Implement idempotent operations
- Sandbox file operations to project root

## Generated Job Template

\`\`\`javascript
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "{{ desc | default('Generated job') }}", 
    tags: {{ tags | default("[]") | safe }},
    author: "{{ author | default('GitVan AI') }}",
    version: "{{ version | default('1.0.0') }}"
  },
  {% if cron %}cron: "{{ cron }}",{% endif %}
  {% if on %}on: {{ on | safe }},{% endif %}
  {% if schedule %}schedule: "{{ schedule }}",{% endif %}
  async run({ ctx, payload, meta }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const { usePack } = await import("gitvan/composables/pack")
    
    const git = useGit()
    const template = await useTemplate()
    const pack = await usePack()
    
    try {
      // Job implementation
      {{ body | default("// TODO: implement job logic") }}
      
      return { 
        ok: true, 
        artifacts: [],
        summary: "{{ summary | default('Job completed successfully') }}"
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

## Implementation Guidelines

### Template Usage Examples
\`\`\`javascript
// Generate files with front-matter
const plan = await template.plan('templates/component.njk', { name: 'MyComponent' })
const result = await template.apply(plan)

// Render templates with data
const content = await template.render('templates/readme.njk', {
  project: { name: 'my-project', description: 'A great project' }
})
\`\`\`

### Git Operations Examples
\`\`\`javascript
// Safe Git operations
const head = await git.head()
const commits = await git.log({ maxCount: 10 })
await git.noteAppend('refs/notes/gitvan/results', JSON.stringify(result))
\`\`\`

### Pack System Examples
\`\`\`javascript
// Apply packs
const packResult = await pack.apply('react-component', {
  name: 'Button',
  props: ['variant', 'size']
})
\`\`\`

## Requirements for Generated Code

1. **Complete Implementation**: Generate fully functional code, not TODOs
2. **Error Handling**: Include proper try/catch blocks and error returns
3. **Logging**: Add appropriate console.log statements for debugging
4. **Documentation**: Include JSDoc comments for complex functions
5. **Type Safety**: Use proper parameter destructuring and validation
6. **Git Integration**: Leverage Git composables for file operations
7. **Template Usage**: Use useTemplate() for file generation when appropriate
8. **Security**: Implement path validation and sandboxing
9. **Idempotency**: Ensure operations can be run multiple times safely
10. **Audit Trail**: Write receipts for important operations

Generate a complete, production-ready job that follows all these guidelines.
`;

// Job writer template
export const JOB_WRITER_TEMPLATE = `
Emit ONLY valid ESM for a GitVan job module:

import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "{{ desc | default('Generated job') }}", 
    tags: {{ tags | default("[]") | safe }}
  },
  {% if cron %}cron: "{{ cron }}",{% endif %}
  {% if on %}on: {{ on | safe }},{% endif %}
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    {{ body | default("// TODO: implement") }}
    
    return { ok: true, artifacts: [] }
  }
})
`;

// Event writer template
export const EVENT_WRITER_TEMPLATE = `
Emit ONLY valid ESM for a GitVan event job module:

import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "{{ desc | default('Generated event job') }}", 
    tags: {{ tags | default("[]") | safe }}
  },
  on: {{ on | safe }},
  async run({ ctx, payload, meta }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    {{ body | default("// TODO: implement event handler") }}
    
    return { ok: true, artifacts: [] }
  }
})
`;

// Template generator template
export const TEMPLATE_GENERATOR_TEMPLATE = `
Generate a Nunjucks template for GitVan:

{# {{ name | default('Generated Template') }} #}
{# Generated: {{ now | default('now') }} #}

{{ content | default('<!-- TODO: implement template -->') }}
`;

// Changelog template
export const CHANGELOG_TEMPLATE = `
# Changelog

## {{ version | default('Unreleased') }} - {{ date | default('now') | date('YYYY-MM-DD') }}

{% if commits %}
### Changes
{% for commit in commits %}
- {{ commit.message | truncate(80) }} ({{ commit.author }})
{% endfor %}
{% endif %}

{% if features %}
### Features
{% for feature in features %}
- {{ feature }}
{% endfor %}
{% endif %}

{% if fixes %}
### Fixes
{% for fix in fixes %}
- {{ fix }}
{% endfor %}
{% endif %}
`;

// Release notes template
export const RELEASE_NOTES_TEMPLATE = `
# Release Notes - {{ version }}

**Release Date:** {{ date | default('now') | date('YYYY-MM-DD') }}

## Summary
{{ summary | default('This release includes various improvements and bug fixes.') }}

## What's New
{% if features %}
{% for feature in features %}
- **{{ feature.title }}**: {{ feature.description }}
{% endfor %}
{% endif %}

## Bug Fixes
{% if fixes %}
{% for fix in fixes %}
- {{ fix }}
{% endfor %}
{% endif %}

## Breaking Changes
{% if breaking %}
{% for change in breaking %}
- {{ change }}
{% endfor %}
{% endif %}

## Contributors
{% if contributors %}
{% for contributor in contributors %}
- {{ contributor }}
{% endfor %}
{% endif %}
`;

// Dev diary template
export const DEV_DIARY_TEMPLATE = `
# Dev Diary - {{ date | default('now') | date('YYYY-MM-DD') }}

## Today's Focus
{{ focus | default('Working on various tasks') }}

## Completed
{% if completed %}
{% for item in completed %}
- {{ item }}
{% endfor %}
{% endif %}

## In Progress
{% if inProgress %}
{% for item in inProgress %}
- {{ item }}
{% endfor %}
{% endif %}

## Blockers
{% if blockers %}
{% for blocker in blockers %}
- {{ blocker }}
{% endfor %}
{% endif %}

## Notes
{{ notes | default('No additional notes') }}
`;

// Refinement template
export const REFINER_TEMPLATE = `
Refine the following {{ type | default('job') }} specification:

**Original:**
{{ original | safe }}

**Requirements:**
{{ requirements | default('Improve the specification') }}

**Context:**
{{ context | default('No additional context') }}

Provide an improved version that addresses the requirements while maintaining compatibility with GitVan v2.
`;
