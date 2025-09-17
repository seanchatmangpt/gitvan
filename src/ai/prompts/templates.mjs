/**
 * GitVan v2 AI Prompt Templates - Nunjucks templates for AI generation
 * Templates for generating jobs, events, and other GitVan artifacts
 */

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

