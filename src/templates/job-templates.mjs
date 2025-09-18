/**
 * GitVan Job Templates - Reusable job templates with value injection
 * Templates that can be filled with specific values to generate jobs
 */

// Base job template with placeholders
export const BASE_JOB_TEMPLATE = `
export default {
  meta: { 
    desc: "{{ meta.desc }}", 
    tags: {{ meta.tags | safe }},
    author: "{{ meta.author }}",
    version: "{{ meta.version }}"
  },
  {% if config.cron %}cron: "{{ config.cron }}",{% endif %}
  {% if config.on %}on: {{ config.on | safe }},{% endif %}
  {% if config.schedule %}schedule: "{{ config.schedule }}",{% endif %}
  async run({ ctx, payload, meta }) {
    try {
      // Import GitVan composables (available when running in GitVan context)
      let git, template, pack
      try {
        const gitModule = await import("gitvan/composables/git")
        const templateModule = await import("gitvan/composables/template")
        const packModule = await import("gitvan/composables/pack")
        git = gitModule.useGit()
        template = await templateModule.useTemplate()
        pack = await packModule.usePack()
      } catch (importError) {
        console.log("GitVan composables not available, running in standalone mode")
        git = null
        template = null
        pack = null
      }
      
      {{ implementation.body }}
      
      return { 
        ok: true, 
        artifacts: {{ implementation.artifacts | safe }},
        summary: "{{ implementation.successMessage }}"
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
}
`;

// File operation template
export const FILE_OPERATION_TEMPLATE = `
      // File operation: {{ implementation.description }}
      {% for param in implementation.parameters %}
      const {{ param.name }} = payload.{{ param.name }} || {{ param.default | safe }}
      {% endfor %}
      
      {% for operation in implementation.operations %}
      {% if operation.type == "log" %}
      console.log("{{ operation.description }}")
      {% elif operation.type == "file-read" %}
      const fs = await import('fs/promises')
      const content = await fs.readFile({{ operation.parameters.path }}, 'utf8')
      console.log("Read file: {{ operation.description }}")
      {% elif operation.type == "file-write" %}
      const fs = await import('fs/promises')
      await fs.writeFile({{ operation.parameters.path }}, {{ operation.parameters.content }})
      console.log("Wrote file: {{ operation.description }}")
      {% elif operation.type == "file-copy" %}
      const fs = await import('fs/promises')
      await fs.copyFile({{ operation.parameters.source }}, {{ operation.parameters.destination }})
      console.log("Copied file: {{ operation.description }}")
      {% elif operation.type == "file-move" %}
      const fs = await import('fs/promises')
      await fs.rename({{ operation.parameters.source }}, {{ operation.parameters.destination }})
      console.log("Moved file: {{ operation.description }}")
      {% endif %}
      {% endfor %}
`;

// Git operation template
export const GIT_OPERATION_TEMPLATE = `
      // Git operation: {{ implementation.description }}
      {% for param in implementation.parameters %}
      const {{ param.name }} = payload.{{ param.name }} || {{ param.default | safe }}
      {% endfor %}
      
      {% for operation in implementation.operations %}
      {% if operation.type == "log" %}
      console.log("{{ operation.description }}")
      {% elif operation.type == "git-commit" %}
      if (git) {
        const head = await git.currentHead()
        console.log("Current HEAD: {{ operation.description }}")
      }
      {% elif operation.type == "git-note" %}
      if (git) {
        const noteContent = JSON.stringify({{ operation.parameters.content | safe }})
        await git.noteAppend('{{ operation.parameters.ref }}', noteContent)
        console.log("Added Git note: {{ operation.description }}")
      }
      {% endif %}
      {% endfor %}
`;

// Template operation template
export const TEMPLATE_OPERATION_TEMPLATE = `
      // Template operation: {{ implementation.description }}
      {% for param in implementation.parameters %}
      const {{ param.name }} = payload.{{ param.name }} || {{ param.default | safe }}
      {% endfor %}
      
      {% for operation in implementation.operations %}
      {% if operation.type == "log" %}
      console.log("{{ operation.description }}")
      {% elif operation.type == "template-render" %}
      if (template) {
        const plan = await template.plan('{{ operation.parameters.template }}', {{ operation.parameters.data | safe }})
        const result = await template.apply(plan)
        console.log("Rendered template: {{ operation.description }}")
      }
      {% endif %}
      {% endfor %}
`;

// Pack operation template
export const PACK_OPERATION_TEMPLATE = `
      // Pack operation: {{ implementation.description }}
      {% for param in implementation.parameters %}
      const {{ param.name }} = payload.{{ param.name }} || {{ param.default | safe }}
      {% endfor %}
      
      {% for operation in implementation.operations %}
      {% if operation.type == "log" %}
      console.log("{{ operation.description }}")
      {% elif operation.type == "pack-apply" %}
      if (pack) {
        const result = await pack.apply('{{ operation.parameters.packName }}', {{ operation.parameters.inputs | safe }})
        console.log("Applied pack: {{ operation.description }}")
      }
      {% endif %}
      {% endfor %}
`;

// Simple operation template
export const SIMPLE_OPERATION_TEMPLATE = `
      // Simple operation: {{ implementation.description }}
      {% for param in implementation.parameters %}
      const {{ param.name }} = payload.{{ param.name }} || {{ param.default | safe }}
      {% endfor %}
      
      {% for operation in implementation.operations %}
      {% if operation.type == "log" %}
      console.log("{{ operation.description }}")
      {% endif %}
      {% endfor %}
`;

// Template mapping
export const TEMPLATE_MAP = {
  "file-operation": FILE_OPERATION_TEMPLATE,
  "git-operation": GIT_OPERATION_TEMPLATE,
  "template-operation": TEMPLATE_OPERATION_TEMPLATE,
  "pack-operation": PACK_OPERATION_TEMPLATE,
  simple: SIMPLE_OPERATION_TEMPLATE,
};

/**
 * Generate job code from template and values
 * @param {object} jobWithValues - Job template with filled values
 * @returns {string} Generated job code
 */
export function generateJobFromTemplate(jobWithValues) {
  const { meta, config, implementation, values } = jobWithValues;

  // Get the appropriate template for the implementation type
  const operationTemplate =
    TEMPLATE_MAP[implementation.type] || SIMPLE_OPERATION_TEMPLATE;

  // Create the context for template rendering
  const context = {
    meta,
    config: config || {},
    implementation: {
      ...implementation,
      body: operationTemplate,
      artifacts: implementation.returnValue?.artifacts || [],
      successMessage:
        implementation.returnValue?.success || "Job completed successfully",
    },
    values,
  };

  // For now, return a simple template with placeholders
  // In a real implementation, this would use Nunjucks to render
  return BASE_JOB_TEMPLATE.replace(/\{\{\s*meta\.desc\s*\}\}/g, meta.desc)
    .replace(/\{\{\s*meta\.tags\s*\|\s*safe\s*\}\}/g, JSON.stringify(meta.tags))
    .replace(/\{\{\s*meta\.author\s*\}\}/g, meta.author)
    .replace(/\{\{\s*meta\.version\s*\}\}/g, meta.version)
    .replace(/\{\{\s*config\.cron\s*\}\}/g, config?.cron || "")
    .replace(
      /\{\{\s*config\.on\s*\|\s*safe\s*\}\}/g,
      config?.on ? JSON.stringify(config.on) : ""
    )
    .replace(/\{\{\s*config\.schedule\s*\}\}/g, config?.schedule || "")
    .replace(/\{\{\s*implementation\.body\s*\}\}/g, operationTemplate)
    .replace(
      /\{\{\s*implementation\.artifacts\s*\|\s*safe\s*\}\}/g,
      JSON.stringify(implementation.returnValue?.artifacts || [])
    )
    .replace(
      /\{\{\s*implementation\.successMessage\s*\}\}/g,
      implementation.returnValue?.success || "Job completed successfully"
    );
}
