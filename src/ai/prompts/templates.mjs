/**
 * GitVan v2 AI Prompt Templates - Nunjucks templates for AI generation
 * Templates for generating jobs, events, and other GitVan artifacts
 */

// Template-based job generation prompt with comprehensive context
export const TEMPLATE_BASED_JOB_PROMPT = `
# GitVan v2 - Template-Based Job Generator

## Overview
GitVan is a Git-native development automation platform that transforms Git into a runtime environment. This system generates jobs using structured templates with Zod validation instead of raw code generation.

## Context & Request
- **User Request**: "{{ prompt }}"
- **Job Type**: {{ kind | default('job') }}
- **Target**: {{ target | default('general automation') }}

## GitVan Architecture

### Core Concepts
- **Git-Native**: Uses Git refs for locking, notes for audit trails
- **Composables**: Reusable functions (useGit, useTemplate, usePack)
- **Template System**: Nunjucks-powered with front-matter support
- **Pack System**: Reusable automation components
- **Job System**: Automated task execution with scheduling
- **Event System**: File change triggers and webhooks

### Available Composables
- **useGit()**: Git operations (commits, refs, notes, branches, worktrees)
- **useTemplate()**: Nunjucks template rendering with front-matter (YAML/TOML/JSON)
- **usePack()**: Pack system for reusable components
- **useJob()**: Job discovery and execution
- **useEvent()**: Event handling and scheduling

### Job Structure
Jobs export a default object with:
- **meta**: Description, tags, author, version
- **config**: Cron, on triggers, schedule
- **run()**: Async function with { ctx, payload, meta } parameters
- **Return**: { ok: boolean, artifacts: array, summary: string }

### Template System Features
- **Front-matter**: YAML (---), TOML (+++), JSON (;)
- **Plan/Apply**: Dry-run planning then execution
- **Path Sandboxing**: Security against directory traversal
- **Idempotent Operations**: Safe to run multiple times
- **Atomic Locking**: Git ref-based concurrency control

### Security & Safety
- **Path Validation**: All paths validated against project root
- **Shell Allowlists**: Configurable command execution
- **Audit Trails**: Complete operation logging in Git notes
- **Error Handling**: Graceful degradation and recovery

## Job Template Schema

Generate a JSON object following this Zod schema:

\`\`\`json
{
  "meta": {
    "desc": "Clear description of what the job does",
    "tags": ["tag1", "tag2"],
    "author": "GitVan AI", 
    "version": "1.0.0"
  },
  "config": {
    "cron": "optional cron expression (e.g., '0 2 * * *')",
    "on": "optional event triggers (e.g., ['push', 'pull-request'])",
    "schedule": "optional schedule expression"
  },
  "implementation": {
    "type": "file-operation|git-operation|template-operation|pack-operation|simple",
    "description": "What the job does",
    "parameters": [
      {
        "name": "paramName",
        "type": "string|number|boolean|object|array",
        "description": "Parameter description",
        "required": true,
        "default": "default value"
      }
    ],
    "operations": [
      {
        "type": "log|file-read|file-write|file-copy|file-move|git-commit|git-note|template-render|pack-apply",
        "description": "What this operation does",
        "parameters": {
          "key": "value"
        }
      }
    ],
    "errorHandling": "strict|graceful|continue",
    "returnValue": {
      "success": "Success message",
      "artifacts": ["artifact1", "artifact2"]
    }
  },
  "values": {
    "specificValue1": "filled in value",
    "specificValue2": "another value"
  }
}
\`\`\`

## Implementation Types & Operations

### file-operation
**Purpose**: File system operations, backups, file processing
**Operations**:
- \`log\`: Console logging
- \`file-read\`: Read file contents
- \`file-write\`: Write file contents  
- \`file-copy\`: Copy files/directories
- \`file-move\`: Move/rename files

**Example Parameters**:
- \`sourcePath\`: Source file/directory path
- \`destinationPath\`: Destination path
- \`includePatterns\`: File patterns to include
- \`excludePatterns\`: File patterns to exclude

### git-operation
**Purpose**: Git operations, commit processing, note management
**Operations**:
- \`log\`: Console logging
- \`git-commit\`: Git commit operations
- \`git-note\`: Git notes for audit trails

**Example Parameters**:
- \`ref\`: Git reference (branch, tag, commit)
- \`message\`: Commit or note message
- \`author\`: Author information

### template-operation
**Purpose**: Template rendering, file generation
**Operations**:
- \`log\`: Console logging
- \`template-render\`: Render Nunjucks templates

**Example Parameters**:
- \`template\`: Template file path
- \`data\`: Template data object
- \`outputPath\`: Output file path

### pack-operation
**Purpose**: Pack system operations
**Operations**:
- \`log\`: Console logging
- \`pack-apply\`: Apply pack scaffolds

**Example Parameters**:
- \`packName\`: Pack identifier
- \`inputs\`: Pack input parameters

### simple
**Purpose**: Simple logging, basic operations
**Operations**:
- \`log\`: Console logging

## Error Handling Strategies

- **strict**: Fail fast on any error
- **graceful**: Handle errors gracefully, continue if possible
- **continue**: Log errors but continue processing

## Instructions

1. **Analyze the user request** and determine the appropriate implementation type
2. **Design the job structure** with proper meta, config, and implementation
3. **Define parameters** that the job will accept via payload
4. **Plan operations** that accomplish the requested functionality
5. **Set error handling** strategy appropriate for the use case
6. **Fill in values** that map payload parameters to template variables

Generate ONLY the JSON object following the schema above. No additional text or explanations.
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
