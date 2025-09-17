// extension-framework.mjs
// GitVan v2 — Extension Framework
// Supports future extensions and custom plugins

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { EvolutionConfig } from "./evolution-config.mjs";

export class ExtensionFramework {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.extensionsDir = join(projectRoot, "extensions");
    this.config = null;
  }

  async initialize() {
    this.config = await new EvolutionConfig(
      join(this.projectRoot, "evolution.config.json")
    ).load();
    await this.createExtensionsDirectory();
  }

  async createExtensionsDirectory() {
    await fs.mkdir(this.extensionsDir, { recursive: true });

    // Create extension structure
    const structure = {
      "README.md": `# GitVan Extensions

This directory contains custom extensions and plugins for GitVan.

## Extension Types

- **Jobs**: Custom automation jobs
- **Templates**: Custom template engines
- **Packs**: Custom automation packs
- **Plugins**: Custom functionality plugins

## Creating Extensions

See the examples in each subdirectory for how to create custom extensions.
`,

      "jobs/README.md": `# Custom Jobs

Custom job extensions for GitVan.

## Example Job Extension

\`\`\`javascript
// custom-job.mjs
export default {
  name: 'custom-job',
  description: 'A custom job extension',
  schedule: 'on-commit',
  steps: [
    { type: 'js', module: './custom-logic.mjs' }
  ]
};
\`\`\`
`,

      "templates/README.md": `# Custom Templates

Custom template extensions for GitVan.

## Example Template Extension

\`\`\`javascript
// custom-template.mjs
export default {
  name: 'custom-template',
  description: 'A custom template engine',
  render: async (template, data) => {
    // Custom rendering logic
    return renderedContent;
  }
};
\`\`\`
`,

      "packs/README.md": `# Custom Packs

Custom pack extensions for GitVan.

## Example Pack Extension

\`\`\`json
{
  "name": "custom-pack",
  "version": "1.0.0",
  "description": "A custom automation pack",
  "jobs": ["custom-job"],
  "templates": ["custom-template"],
  "dependencies": []
}
\`\`\`
`,

      "plugins/README.md": `# Custom Plugins

Custom functionality plugins for GitVan.

## Example Plugin Extension

\`\`\`javascript
// custom-plugin.mjs
export default {
  name: 'custom-plugin',
  description: 'A custom functionality plugin',
  hooks: {
    'before-job': async (job) => {
      // Custom pre-job logic
    },
    'after-job': async (job, result) => {
      // Custom post-job logic
    }
  }
};
\`\`\`
`,
    };

    for (const [file, content] of Object.entries(structure)) {
      const filePath = join(this.extensionsDir, file);
      await fs.writeFile(filePath, content);
    }

    // Create subdirectories
    const subdirs = ["jobs", "templates", "packs", "plugins"];
    for (const subdir of subdirs) {
      await fs.mkdir(join(this.extensionsDir, subdir), { recursive: true });
    }
  }

  async createExtension(type, name, config) {
    const extensionDir = join(this.extensionsDir, type);
    await fs.mkdir(extensionDir, { recursive: true });
    const extensionFile = join(extensionDir, `${name}.mjs`);

    let extensionContent = "";

    switch (type) {
      case "job":
        extensionContent = this.createJobExtension(name, config);
        break;
      case "template":
        extensionContent = this.createTemplateExtension(name, config);
        break;
      case "pack":
        extensionContent = this.createPackExtension(name, config);
        break;
      case "plugin":
        extensionContent = this.createPluginExtension(name, config);
        break;
      default:
        throw new Error(`Unknown extension type: ${type}`);
    }

    await fs.writeFile(extensionFile, extensionContent);

    // Register extension
    await this.registerExtension(type, name, extensionFile);

    return extensionFile;
  }

  createJobExtension(name, config) {
    return `// ${name}.mjs
// Custom job extension

import { defineJob } from 'gitvan';

export default defineJob({
  name: '${name}',
  description: '${config.description || "Custom job extension"}',
  schedule: '${config.schedule || "on-commit"}',
  steps: ${JSON.stringify(
    config.steps || [
      { type: "cli", command: `echo "Running ${name}"` },
      { type: "js", module: `./${name}-logic.mjs` },
    ],
    null,
    2
  )}
});

// Custom logic module
export async function run${name.charAt(0).toUpperCase() + name.slice(1)}() {
  console.log('Executing custom job: ${name}');
  
  // Add your custom logic here
  ${config.customLogic || "// Custom logic goes here"}
  
  return {
    success: true,
    message: '${name} completed successfully',
    timestamp: new Date().toISOString()
  };
}
`;
  }

  createTemplateExtension(name, config) {
    return `// ${name}.mjs
// Custom template extension

export default {
  name: '${name}',
  description: '${config.description || "Custom template extension"}',
  version: '${config.version || "1.0.0"}',
  
  async render(template, data) {
    // Custom template rendering logic
    ${
      config.renderLogic ||
      `return template.replace(/\\{\\{([^}]+)\\}\\}/g, (match, key) => {
      return data[key] || match;
    });`
    }
  },
  
  async compile(template) {
    // Custom template compilation logic
    ${config.compileLogic || "return template;"}
  }
};
`;
  }

  createPackExtension(name, config) {
    return `// ${name}.mjs
// Custom pack extension

export default {
  name: '${name}',
  version: '${config.version || "1.0.0"}',
  description: '${config.description || "Custom pack extension"}',
  author: '${config.author || "GitVan User"}',
  
  jobs: ${JSON.stringify(config.jobs || [], null, 2)},
  templates: ${JSON.stringify(config.templates || [], null, 2)},
  dependencies: ${JSON.stringify(config.dependencies || [], null, 2)},
  
  async install() {
    // Custom installation logic
    ${
      config.installLogic ||
      "console.log('Installing custom pack:', this.name);"
    }
  },
  
  async uninstall() {
    // Custom uninstallation logic
    ${
      config.uninstallLogic ||
      "console.log('Uninstalling custom pack:', this.name);"
    }
  }
};
`;
  }

  createPluginExtension(name, config) {
    return `// ${name}.mjs
// Custom plugin extension

export default {
  name: '${name}',
  description: '${config.description || "Custom plugin extension"}',
  version: '${config.version || "1.0.0"}',
  
  hooks: {
    ${Object.entries(config.hooks || {})
      .map(
        ([hook, logic]) =>
          `'${hook}': async (...args) => {
        ${logic || "// Custom hook logic"}
      }`
      )
      .join(",\n    ")}
  },
  
  async initialize() {
    // Plugin initialization logic
    ${config.initLogic || "console.log('Initializing plugin:', this.name);"}
  },
  
  async destroy() {
    // Plugin cleanup logic
    ${config.destroyLogic || "console.log('Destroying plugin:', this.name);"}
  }
};
`;
  }

  async registerExtension(type, name, filePath) {
    const registryFile = join(this.extensionsDir, "registry.json");

    let registry = {};
    try {
      const data = await fs.readFile(registryFile, "utf8");
      registry = JSON.parse(data);
    } catch (error) {
      // Registry doesn't exist yet, create it
    }

    if (!registry[type]) {
      registry[type] = {};
    }

    registry[type][name] = {
      file: filePath,
      registered: new Date().toISOString(),
      enabled: true,
    };

    await fs.writeFile(registryFile, JSON.stringify(registry, null, 2));
  }

  async listExtensions(type = null) {
    const registryFile = join(this.extensionsDir, "registry.json");

    try {
      const data = await fs.readFile(registryFile, "utf8");
      const registry = JSON.parse(data);

      if (type) {
        return registry[type] || {};
      }

      return registry;
    } catch (error) {
      return {};
    }
  }

  async enableExtension(type, name) {
    const registryFile = join(this.extensionsDir, "registry.json");

    try {
      const data = await fs.readFile(registryFile, "utf8");
      const registry = JSON.parse(data);

      if (registry[type] && registry[type][name]) {
        registry[type][name].enabled = true;
        await fs.writeFile(registryFile, JSON.stringify(registry, null, 2));
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async disableExtension(type, name) {
    const registryFile = join(this.extensionsDir, "registry.json");

    try {
      const data = await fs.readFile(registryFile, "utf8");
      const registry = JSON.parse(data);

      if (registry[type] && registry[type][name]) {
        registry[type][name].enabled = false;
        await fs.writeFile(registryFile, JSON.stringify(registry, null, 2));
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async createFutureExtension(name, config) {
    // Create extension based on future roadmap
    const futureConfig = this.config.future.roadmap.phases.find((phase) =>
      phase.name.toLowerCase().includes(config.phase.toLowerCase())
    );

    if (!futureConfig) {
      throw new Error(`Unknown future phase: ${config.phase}`);
    }

    const extensionConfig = {
      description: `Extension for ${futureConfig.name}`,
      phase: futureConfig.phase,
      features: futureConfig.features,
      targetDate: futureConfig.targetDate,
      ...config,
    };

    return await this.createExtension(config.type, name, extensionConfig);
  }

  async generateExtensionTemplate(type, name) {
    const templates = {
      job: {
        description: "Custom job extension",
        schedule: "on-commit",
        steps: [
          { type: "cli", command: `echo "Running ${name}"` },
          { type: "js", module: `./${name}-logic.mjs` },
        ],
      },
      template: {
        description: "Custom template extension",
        version: "1.0.0",
      },
      pack: {
        description: "Custom pack extension",
        version: "1.0.0",
        author: "GitVan User",
        jobs: [],
        templates: [],
        dependencies: [],
      },
      plugin: {
        description: "Custom plugin extension",
        version: "1.0.0",
        hooks: {},
      },
    };

    return await this.createExtension(type, name, templates[type]);
  }
}

export async function createExtensionFramework(projectRoot = process.cwd()) {
  const framework = new ExtensionFramework(projectRoot);
  await framework.initialize();
  return framework;
}

export default ExtensionFramework;
