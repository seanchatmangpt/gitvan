# GitVan v2 Pack Authoring Guide

This guide covers everything you need to know about creating, publishing, and maintaining GitVan packs.

## Table of Contents

- [What are Packs?](#what-are-packs)
- [Pack Structure](#pack-structure)
- [Pack Manifest Schema](#pack-manifest-schema)
- [Creating Your First Pack](#creating-your-first-pack)
- [Pack Development](#pack-development)
- [Testing Packs](#testing-packs)
- [Publishing Packs](#publishing-packs)
- [Pack Versioning](#pack-versioning)
- [Pack Dependencies](#pack-dependencies)
- [Advanced Pack Features](#advanced-pack-features)
- [Pack Best Practices](#pack-best-practices)
- [Pack Registry Integration](#pack-registry-integration)

## What are Packs?

Packs are reusable automation components that encapsulate jobs, templates, and configuration. They provide:

- **Modularity**: Reusable automation components
- **Discoverability**: Available through the marketplace
- **Versioning**: Semantic versioning with dependency management
- **Composability**: Packs can depend on other packs
- **Templates**: Nunjucks templates for code generation
- **Jobs**: Executable automation tasks

## Pack Structure

A GitVan pack follows this directory structure:

```
my-pack/
├── pack.json              # Pack manifest
├── README.md              # Pack documentation
├── jobs/                  # Job definitions
│   ├── create-project.mjs
│   └── deploy.mjs
├── templates/             # Nunjucks templates
│   ├── project/
│   │   ├── package.json.njk
│   │   └── src/
│   │       └── index.js.njk
│   └── config/
│       └── webpack.config.js.njk
├── schemas/               # Zod validation schemas
│   └── project-config.zod.mjs
└── examples/              # Usage examples
    ├── basic-usage.mjs
    └── advanced-usage.mjs
```

## Pack Manifest Schema

The `pack.json` file defines your pack's metadata and capabilities:

```json
{
  "name": "my-pack",
  "version": "1.0.0",
  "description": "A comprehensive pack for project automation",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "homepage": "https://github.com/your-org/my-pack",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/my-pack.git"
  },
  "keywords": ["react", "typescript", "automation", "scaffolding"],
  "categories": ["frontend", "scaffolding", "development"],
  "tags": ["react", "typescript", "webpack", "jest"],
  "engines": {
    "gitvan": ">=2.0.0"
  },
  "dependencies": {
    "react-pack": "^1.2.0",
    "testing-pack": "^2.1.0"
  },
  "peerDependencies": {
    "node": ">=16.0.0"
  },
  "gitvan": {
    "jobs": [
      {
        "id": "create-project",
        "name": "Create New Project",
        "description": "Scaffolds a new project with best practices",
        "file": "jobs/create-project.mjs",
        "tags": ["scaffolding", "initialization"]
      },
      {
        "id": "deploy",
        "name": "Deploy Project",
        "description": "Deploys the project to production",
        "file": "jobs/deploy.mjs",
        "tags": ["deployment", "production"]
      }
    ],
    "templates": [
      {
        "id": "project-structure",
        "name": "Project Structure",
        "description": "Complete project structure template",
        "path": "templates/project/",
        "tags": ["scaffolding", "structure"]
      }
    ],
    "schemas": [
      {
        "id": "project-config",
        "name": "Project Configuration",
        "description": "Project configuration schema",
        "file": "schemas/project-config.zod.mjs"
      }
    ],
    "hooks": {
      "pre-install": "jobs/pre-install.mjs",
      "post-install": "jobs/post-install.mjs"
    },
    "config": {
      "defaults": {
        "typescript": true,
        "testing": "jest",
        "bundler": "webpack"
      },
      "schema": "schemas/pack-config.zod.mjs"
    }
  }
}
```

### Schema Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Pack identifier (kebab-case) |
| `version` | string | ✅ | Semantic version |
| `description` | string | ✅ | Pack description |
| `author` | string | ✅ | Author information |
| `license` | string | ✅ | License identifier |
| `homepage` | string | ❌ | Project homepage URL |
| `repository` | object | ❌ | Git repository information |
| `keywords` | string[] | ❌ | Search keywords |
| `categories` | string[] | ❌ | Pack categories |
| `tags` | string[] | ❌ | Pack tags |
| `engines.gitvan` | string | ❌ | Required GitVan version |
| `dependencies` | object | ❌ | Pack dependencies |
| `peerDependencies` | object | ❌ | Peer dependencies |
| `gitvan.jobs` | array | ❌ | Job definitions |
| `gitvan.templates` | array | ❌ | Template definitions |
| `gitvan.schemas` | array | ❌ | Schema definitions |
| `gitvan.hooks` | object | ❌ | Lifecycle hooks |
| `gitvan.config` | object | ❌ | Configuration options |

## Creating Your First Pack

### 1. Initialize Pack Structure

```bash
mkdir my-react-pack
cd my-react-pack

# Create basic structure
mkdir -p jobs templates schemas examples
touch pack.json README.md
```

### 2. Create Pack Manifest

```json
{
  "name": "my-react-pack",
  "version": "1.0.0",
  "description": "A React project scaffolding pack",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "keywords": ["react", "typescript", "scaffolding"],
  "categories": ["frontend", "scaffolding"],
  "tags": ["react", "typescript", "vite"],
  "gitvan": {
    "jobs": [
      {
        "id": "create-react-app",
        "name": "Create React App",
        "description": "Scaffolds a new React application",
        "file": "jobs/create-react-app.mjs",
        "tags": ["scaffolding", "react"]
      }
    ],
    "templates": [
      {
        "id": "react-project",
        "name": "React Project Template",
        "description": "Complete React project structure",
        "path": "templates/react-project/",
        "tags": ["react", "typescript", "vite"]
      }
    ]
  }
}
```

### 3. Create Job Definition

```javascript
// jobs/create-react-app.mjs
/**
 * GitVan Job: Create React App
 * Scaffolds a new React application with TypeScript and Vite
 */

export default {
  meta: {
    name: 'Create React App',
    description: 'Scaffolds a new React application with TypeScript and Vite',
    tags: ['scaffolding', 'react', 'typescript'],
    version: '1.0.0'
  },

  async run({ payload, ctx }) {
    const { projectName, useTypeScript = true, useVite = true } = payload;
    
    if (!projectName) {
      throw new Error('Project name is required');
    }

    // Use GitVan composables
    const { useTemplate, useGit } = await import('gitvan/composables');
    const template = useTemplate({ paths: ['templates'] });
    const git = useGit();

    // Create project structure
    const projectData = {
      projectName,
      useTypeScript,
      useVite,
      timestamp: new Date().toISOString(),
      author: ctx.user || 'GitVan User'
    };

    // Apply templates
    const plan = await template.plan('react-project', projectData);
    const result = await template.apply(plan);

    // Initialize Git repository
    await git.init();
    await git.add('.');
    await git.commit('Initial commit: React app scaffolded by GitVan');

    return {
      success: true,
      artifacts: result.artifacts,
      projectPath: result.targetPath,
      message: `React app '${projectName}' created successfully`
    };
  }
};
```

### 4. Create Templates

```html
<!-- templates/react-project/package.json.njk -->
{
  "name": "{{ projectName }}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "{% if useVite %}vite{% else %}react-scripts start{% endif %}",
    "build": "{% if useVite %}vite build{% else %}react-scripts build{% endif %}",
    "test": "{% if useVite %}vitest{% else %}react-scripts test{% endif %}",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    {% if useTypeScript %}
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    {% endif %}
    {% if useVite %}
    "vite": "^4.4.0",
    "@vitejs/plugin-react": "^4.0.0",
    {% else %}
    "react-scripts": "5.0.1",
    {% endif %}
    "eslint": "^8.45.0"
  }
}
```

```html
<!-- templates/react-project/src/App.tsx.njk -->
{% if useTypeScript %}
import React from 'react';
import './App.css';

function App(): JSX.Element {
  return (
    <div className="App">
      <header className="App-header">
        <h1>{{ projectName }}</h1>
        <p>Welcome to your new React app!</p>
      </header>
    </div>
  );
}

export default App;
{% else %}
import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>{{ projectName }}</h1>
        <p>Welcome to your new React app!</p>
      </header>
    </div>
  );
}

export default App;
{% endif %}
```

### 5. Create Schema Validation

```javascript
// schemas/project-config.zod.mjs
import { z } from 'zod';

export const ProjectConfigSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  useTypeScript: z.boolean().default(true),
  useVite: z.boolean().default(true),
  features: z.object({
    testing: z.boolean().default(true),
    linting: z.boolean().default(true),
    formatting: z.boolean().default(true)
  }).default({}),
  dependencies: z.array(z.string()).default([])
});

export default ProjectConfigSchema;
```

## Pack Development

### Development Workflow

1. **Local Development**
   ```bash
   # Link pack for local testing
   cd my-react-pack
   npm link
   
   # Test in a GitVan project
   cd ../test-project
   gitvan pack install my-react-pack
   gitvan run create-react-app
   ```

2. **Iterative Development**
   ```bash
   # Make changes to pack
   # Test locally
   gitvan pack test my-react-pack
   
   # Validate pack structure
   gitvan pack validate my-react-pack
   ```

3. **Version Management**
   ```bash
   # Bump version
   npm version patch  # or minor, major
   
   # Update changelog
   git add .
   git commit -m "chore: bump version to 1.0.1"
   git tag v1.0.1
   ```

### Pack Testing

Create comprehensive tests for your pack:

```javascript
// tests/create-react-app.test.mjs
import { describe, it, expect } from 'vitest';
import { withGitVan } from 'gitvan/core';
import { useJob } from 'gitvan/composables';

describe('Create React App Job', () => {
  it('should create a React app with TypeScript', async () => {
    await withGitVan({ cwd: '/tmp/test-project', env: process.env }, async () => {
      const job = useJob();
      
      const result = await job.run('create-react-app', {
        projectName: 'test-app',
        useTypeScript: true,
        useVite: true
      });
      
      expect(result.success).toBe(true);
      expect(result.artifacts).toContain('package.json');
      expect(result.artifacts).toContain('src/App.tsx');
    });
  });
  
  it('should validate required parameters', async () => {
    await withGitVan({ cwd: '/tmp/test-project', env: process.env }, async () => {
      const job = useJob();
      
      await expect(job.run('create-react-app', {}))
        .rejects.toThrow('Project name is required');
    });
  });
});
```

## Publishing Packs

### 1. Prepare for Publishing

```bash
# Ensure pack is valid
gitvan pack validate my-react-pack

# Run tests
npm test

# Build documentation
npm run docs

# Update version
npm version patch
```

### 2. Publish to Registry

```bash
# Publish to GitVan registry
gitvan pack publish

# Or publish to npm (if using npm as registry)
npm publish
```

### 3. Registry Configuration

Configure your pack for the GitVan registry:

```json
{
  "gitvan": {
    "registry": {
      "url": "https://registry.gitvan.dev",
      "auth": {
        "type": "token",
        "token": "${GITVAN_TOKEN}"
      }
    },
    "publish": {
      "access": "public",
      "tags": ["latest"]
    }
  }
}
```

## Pack Versioning

### Semantic Versioning

Follow semantic versioning for pack releases:

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Version Management

```bash
# Bump version
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0

# Pre-release versions
npm version prerelease --preid=beta  # 1.0.0 -> 1.0.1-beta.0
npm version prerelease --preid=alpha # 1.0.0 -> 1.0.1-alpha.0
```

### Changelog Management

Maintain a `CHANGELOG.md`:

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- Support for Vite bundler option
- TypeScript configuration templates
- Jest testing setup

### Changed
- Updated React version to 18.2.0
- Improved error messages

### Fixed
- Template path resolution issue
- Job validation bug

## [1.0.0] - 2024-01-01

### Added
- Initial release
- React project scaffolding
- TypeScript support
- Basic testing setup
```

## Pack Dependencies

### Declaring Dependencies

```json
{
  "dependencies": {
    "react-pack": "^1.2.0",
    "testing-pack": "^2.1.0"
  },
  "peerDependencies": {
    "node": ">=16.0.0"
  }
}
```

### Dependency Resolution

GitVan resolves pack dependencies automatically:

```bash
# Install pack with dependencies
gitvan pack install my-react-pack

# This will also install:
# - react-pack@^1.2.0
# - testing-pack@^2.1.0
```

### Dependency Conflicts

Handle dependency conflicts gracefully:

```json
{
  "gitvan": {
    "conflicts": {
      "bundler": {
        "webpack": "vite-pack",
        "vite": "webpack-pack"
      }
    }
  }
}
```

## Advanced Pack Features

### Lifecycle Hooks

```javascript
// jobs/pre-install.mjs
export default {
  meta: {
    name: 'Pre-install Hook',
    description: 'Runs before pack installation'
  },

  async run({ payload, ctx }) {
    const { targetPath } = payload;
    
    // Check prerequisites
    const nodeVersion = process.version;
    if (parseInt(nodeVersion.slice(1)) < 16) {
      throw new Error('Node.js 16+ is required');
    }
    
    // Create target directory
    await fs.mkdir(targetPath, { recursive: true });
    
    return { success: true };
  }
};
```

### Configuration Schemas

```javascript
// schemas/pack-config.zod.mjs
import { z } from 'zod';

export const PackConfigSchema = z.object({
  bundler: z.enum(['webpack', 'vite', 'rollup']).default('vite'),
  testing: z.enum(['jest', 'vitest', 'none']).default('jest'),
  linting: z.boolean().default(true),
  formatting: z.boolean().default(true),
  typescript: z.boolean().default(true),
  features: z.array(z.string()).default([])
});

export default PackConfigSchema;
```

### Custom Filters and Globals

```javascript
// templates/custom-filters.mjs
export const customFilters = {
  kebabCase: (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
  pascalCase: (str) => str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase()),
  camelCase: (str) => str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
};

export const customGlobals = {
  currentYear: new Date().getFullYear(),
  gitvanVersion: '2.0.0'
};
```

## Pack Best Practices

### 1. Naming Conventions

- **Pack names**: Use kebab-case (`my-react-pack`)
- **Job IDs**: Use kebab-case (`create-react-app`)
- **Template IDs**: Use kebab-case (`react-project`)
- **File names**: Use kebab-case (`create-react-app.mjs`)

### 2. Documentation

- Write comprehensive README.md
- Include usage examples
- Document all configuration options
- Provide troubleshooting guide

### 3. Error Handling

```javascript
export default {
  async run({ payload, ctx }) {
    try {
      // Job logic
      return { success: true, artifacts: [] };
    } catch (error) {
      // Log error
      console.error('Job failed:', error.message);
      
      // Return structured error
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      };
    }
  }
};
```

### 4. Testing

- Write unit tests for jobs
- Test template rendering
- Validate schema definitions
- Test error scenarios

### 5. Performance

- Use efficient template rendering
- Minimize file I/O operations
- Cache expensive operations
- Use parallel processing where possible

## Pack Registry Integration

### Registry Discovery

```bash
# Browse available packs
gitvan marketplace browse

# Search packs
gitvan marketplace search react

# Get pack details
gitvan marketplace info my-react-pack
```

### Pack Installation

```bash
# Install pack
gitvan pack install my-react-pack

# Install specific version
gitvan pack install my-react-pack@1.2.0

# Install with configuration
gitvan pack install my-react-pack --config config.json
```

### Pack Management

```bash
# List installed packs
gitvan pack list

# Update pack
gitvan pack update my-react-pack

# Remove pack
gitvan pack remove my-react-pack
```

This comprehensive guide provides everything needed to create, develop, test, and publish GitVan packs effectively. Follow these practices to build high-quality, reusable automation components that integrate seamlessly with the GitVan ecosystem.
