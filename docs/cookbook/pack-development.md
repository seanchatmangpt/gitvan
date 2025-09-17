# Pack Development Cookbook

## Overview

This cookbook provides recipes for creating, managing, and distributing GitVan packs.

## Creating Your First Pack

### Basic Pack Structure

```javascript
// my-pack/pack.json
{
  "name": "my-awesome-pack",
  "version": "1.0.0",
  "description": "A pack that does awesome things",
  "author": "Your Name",
  "license": "MIT",

  "inputs": {
    "projectName": {
      "type": "string",
      "required": true,
      "description": "Name of the project"
    },
    "features": {
      "type": "array",
      "default": [],
      "items": {
        "type": "string",
        "enum": ["auth", "api", "database", "testing"]
      }
    }
  },

  "provides": {
    "jobs": [
      {
        "name": "setup",
        "file": "jobs/setup.mjs",
        "description": "Initial project setup"
      }
    ],
    "templates": [
      {
        "name": "component",
        "file": "templates/component.njk"
      }
    ],
    "configs": [
      {
        "name": "eslint",
        "file": "configs/.eslintrc.json",
        "merge": true
      }
    ]
  }
}
```

### Pack Job Definition

```javascript
// my-pack/jobs/setup.mjs
export default {
  name: 'setup',
  description: 'Set up project from pack',

  async run({ input, useExec, useTemplate, useGit }) {
    const exec = useExec();
    const template = useTemplate();
    const git = useGit();

    console.log(`🚀 Setting up ${input.projectName}`);

    // Initialize package.json from template
    await template.render('package.njk', {
      name: input.projectName,
      features: input.features
    });

    // Install dependencies
    await exec.cli('npm', ['install']);

    // Initialize Git
    await git.init();
    await git.add({ all: true });
    await git.commit({ message: 'Initial setup from pack' });

    return { success: true };
  }
};
```

### Pack Templates

```nunjucks
{# my-pack/templates/component.njk #}
import React from 'react';
import './{{ name | kebabCase }}.css';

interface {{ name }}Props {
  {% for prop in props %}
  {{ prop.name }}: {{ prop.type }};
  {% endfor %}
}

export function {{ name }}({ {{ props | map('name') | join(', ') }} }: {{ name }}Props) {
  return (
    <div className="{{ name | kebabCase }}">
      {/* Component implementation */}
    </div>
  );
}
```

## Advanced Pack Features

### Input Validation

```javascript
// pack.json with validation
{
  "inputs": {
    "port": {
      "type": "number",
      "required": true,
      "min": 1024,
      "max": 65535,
      "description": "Server port"
    },
    "email": {
      "type": "string",
      "pattern": "^[^@]+@[^@]+\\.[^@]+$",
      "transform": "toLowerCase",
      "description": "Admin email"
    },
    "database": {
      "type": "string",
      "enum": ["postgres", "mysql", "sqlite"],
      "default": "postgres"
    }
  },

  "validation": {
    "rules": [
      {
        "field": "port",
        "validator": "custom",
        "function": "validatePort"
      }
    ]
  }
}
```

### Pack Dependencies

```javascript
// pack.json with dependencies
{
  "dependencies": {
    "gitvan:eslint-config": "^2.0.0",
    "gitvan:testing-utils": "^1.5.0"
  },

  "requirements": {
    "gitvan": ">=2.0.0",
    "node": ">=18.0.0",
    "git": ">=2.40.0"
  }
}
```

### Pack Hooks

```javascript
// pack.json with lifecycle hooks
{
  "hooks": {
    "preInstall": "scripts/pre-install.mjs",
    "postInstall": "scripts/post-install.mjs",
    "preApply": "scripts/validate.mjs",
    "postApply": "scripts/cleanup.mjs"
  }
}
```

```javascript
// scripts/pre-install.mjs
export default async function preInstall({ inputs, context }) {
  console.log('Preparing to install pack...');

  // Validate environment
  const node = process.version;
  if (!node.startsWith('v18') && !node.startsWith('v20')) {
    throw new Error('Node.js 18+ required');
  }

  // Check for required tools
  const { useExec } = context;
  const exec = useExec();

  try {
    await exec.cli('docker', ['--version']);
  } catch {
    console.warn('Docker not found - some features may not work');
  }

  return true;
}
```

## Pack Operations

### File Transformations

```javascript
// Transform existing files
{
  "provides": {
    "transforms": [
      {
        "file": "package.json",
        "operations": [
          {
            "type": "merge",
            "data": {
              "scripts": {
                "dev": "vite",
                "build": "vite build"
              },
              "devDependencies": {
                "vite": "^4.0.0"
              }
            }
          }
        ]
      },
      {
        "file": "tsconfig.json",
        "operations": [
          {
            "type": "jsonpath",
            "path": "$.compilerOptions.strict",
            "value": true
          }
        ]
      }
    ]
  }
}
```

### Scaffolding

```javascript
// pack.json with scaffolds
{
  "scaffolds": {
    "component": {
      "description": "Generate a new component",
      "inputs": {
        "name": {
          "type": "string",
          "required": true
        },
        "style": {
          "type": "string",
          "enum": ["css", "scss", "styled"],
          "default": "css"
        }
      },
      "generates": [
        {
          "template": "scaffolds/component.njk",
          "output": "src/components/{{ name }}/{{ name }}.tsx"
        },
        {
          "template": "scaffolds/component.test.njk",
          "output": "src/components/{{ name }}/{{ name }}.test.tsx"
        },
        {
          "template": "scaffolds/component.style.njk",
          "output": "src/components/{{ name }}/{{ name }}.{{ style }}"
        }
      ]
    }
  }
}
```

## Pack Distribution

### Publishing to Registry

```javascript
// .gitvan/jobs/publish-pack.mjs
export default {
  name: 'publish-pack',
  description: 'Publish pack to registry',

  inputs: {
    path: {
      type: 'string',
      default: '.',
      description: 'Pack directory'
    }
  },

  async run({ input, usePack }) {
    const pack = usePack();
    const { path } = input;

    // Load and validate pack
    const loaded = await pack.load(path);
    const validation = await loaded.validate({ strict: true });

    if (!validation.valid) {
      throw new Error(`Pack validation failed: ${validation.errors.join(', ')}`);
    }

    // Sign pack
    const signature = await pack.sign(loaded, {
      privateKey: process.env.PACK_PRIVATE_KEY
    });

    // Publish to registry
    const result = await pack.publish(loaded, {
      registry: 'https://registry.gitvan.dev',
      token: process.env.GITVAN_TOKEN,
      signature
    });

    console.log(`✅ Published ${loaded.manifest.name}@${loaded.manifest.version}`);

    return result;
  }
};
```

### Installing from Registry

```javascript
// .gitvan/jobs/install-from-registry.mjs
export default {
  name: 'install-from-registry',
  description: 'Install pack from registry',

  inputs: {
    pack: {
      type: 'string',
      required: true,
      description: 'Pack identifier (e.g., gitvan:react-app@2.0.0)'
    }
  },

  async run({ input, usePack }) {
    const pack = usePack();
    const manager = pack.getManager();

    // Search for pack
    const results = await manager.search({
      query: input.pack
    });

    if (results.length === 0) {
      throw new Error(`Pack not found: ${input.pack}`);
    }

    // Install pack
    const installed = await manager.install(input.pack, {
      save: true,
      dependencies: true
    });

    console.log(`✅ Installed ${installed.name}@${installed.version}`);

    // Apply pack
    const applied = await installed.apply({
      interactive: true
    });

    return applied.receipt;
  }
};
```

## Pack Composition

### Combining Multiple Packs

```javascript
// compose.yaml
name: full-stack-app
version: 1.0.0
description: Compose frontend and backend packs

packs:
  - id: gitvan:react-frontend
    inputs:
      projectName: "{{ projectName }}-frontend"
      port: 3000

  - id: gitvan:express-backend
    inputs:
      projectName: "{{ projectName }}-backend"
      port: 3001
      database: postgres

  - id: gitvan:docker-compose
    inputs:
      services:
        - frontend
        - backend
        - database

outputs:
  - merge: package.json
  - copy: docker-compose.yml
  - generate: README.md
```

```javascript
// .gitvan/jobs/compose-packs.mjs
export default {
  name: 'compose-packs',
  description: 'Compose multiple packs',

  async run({ useExec }) {
    const exec = useExec();

    // Run composition
    await exec.cli('gitvan', [
      'compose',
      '--file', 'compose.yaml',
      '--output', './full-stack-app'
    ]);

    console.log('✅ Composed full-stack application');

    return { composed: true };
  }
};
```

## Pack Security

### Signing Packs

```javascript
// .gitvan/jobs/sign-pack.mjs
export default {
  name: 'sign-pack',
  description: 'Sign pack for distribution',

  async run({ usePack }) {
    const security = usePack().getSecurity();

    // Generate key pair
    const { publicKey, privateKey } = await security.generateKeys();

    // Sign pack
    const signature = await security.sign({
      manifest: './pack.json',
      files: ['**/*'],
      privateKey
    });

    // Add signature to manifest
    const manifest = JSON.parse(
      await fs.readFile('./pack.json', 'utf-8')
    );

    manifest.security = {
      signature,
      signedBy: 'team@example.com',
      signedAt: new Date().toISOString(),
      publicKey
    };

    await fs.writeFile(
      './pack.json',
      JSON.stringify(manifest, null, 2)
    );

    console.log('✅ Pack signed successfully');

    return { signature };
  }
};
```

## Best Practices

1. **Validate all inputs** thoroughly
2. **Use semantic versioning** for packs
3. **Document pack features** in README
4. **Test packs** before publishing
5. **Sign packs** for security
6. **Handle errors gracefully**
7. **Provide clear descriptions**
8. **Include examples** in pack

## See Also

- [Pack API Reference](../api/pack.md)
- [Pack Authoring Guide](../guides/pack-authoring.md)
- [Security Best Practices](../security/best-practices.md)