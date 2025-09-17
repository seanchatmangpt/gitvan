# GitVan v2 Tutorials

Step-by-step tutorials for common GitVan workflows and use cases.

## Table of Contents

- [Tutorial 1: Auto-Scaffold a React App](#tutorial-1-auto-scaffold-a-react-app)
- [Tutorial 2: Automated Release Notes](#tutorial-2-automated-release-notes)
- [Tutorial 3: CI/CD Integration](#tutorial-3-cicd-integration)
- [Tutorial 4: Multi-Environment Deployment](#tutorial-4-multi-environment-deployment)
- [Tutorial 5: Custom Pack Development](#tutorial-5-custom-pack-development)

## Tutorial 1: Auto-Scaffold a React App

This tutorial shows how to create a complete React application scaffolding system using GitVan.

### Step 1: Initialize GitVan Project

```bash
# Create new project
mkdir my-react-scaffolder
cd my-react-scaffolder

# Initialize GitVan
gitvan init

# Install dependencies
pnpm install
```

### Step 2: Create Project Structure

```bash
# Create directories
mkdir -p jobs templates schemas examples

# Create pack manifest
touch pack.json
```

### Step 3: Define Pack Manifest

```json
{
  "name": "react-scaffolder",
  "version": "1.0.0",
  "description": "Complete React application scaffolding",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "keywords": ["react", "typescript", "scaffolding", "vite"],
  "categories": ["frontend", "scaffolding"],
  "tags": ["react", "typescript", "vite", "tailwind"],
  "gitvan": {
    "jobs": [
      {
        "id": "create-react-app",
        "name": "Create React App",
        "description": "Scaffolds a complete React application",
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
    ],
    "schemas": [
      {
        "id": "project-config",
        "name": "Project Configuration",
        "description": "Project configuration schema",
        "file": "schemas/project-config.zod.mjs"
      }
    ]
  }
}
```

### Step 4: Create Configuration Schema

```javascript
// schemas/project-config.zod.mjs
import { z } from 'zod';

export const ProjectConfigSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  useTypeScript: z.boolean().default(true),
  useVite: z.boolean().default(true),
  useTailwind: z.boolean().default(true),
  useTesting: z.boolean().default(true),
  useLinting: z.boolean().default(true),
  useFormatting: z.boolean().default(true),
  features: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([])
});

export default ProjectConfigSchema;
```

### Step 5: Create Job Definition

```javascript
// jobs/create-react-app.mjs
/**
 * GitVan Job: Create React App
 * Scaffolds a complete React application with modern tooling
 */

import { ProjectConfigSchema } from '../schemas/project-config.zod.mjs';

export default {
  meta: {
    name: 'Create React App',
    description: 'Scaffolds a complete React application with TypeScript, Vite, and Tailwind',
    tags: ['scaffolding', 'react', 'typescript'],
    version: '1.0.0'
  },

  async run({ payload, ctx }) {
    // Validate input
    const config = ProjectConfigSchema.parse(payload);
    
    // Use GitVan composables
    const { useTemplate, useGit } = await import('gitvan/composables');
    const template = useTemplate({ paths: ['templates'] });
    const git = useGit();

    // Prepare project data
    const projectData = {
      projectName: config.projectName,
      useTypeScript: config.useTypeScript,
      useVite: config.useVite,
      useTailwind: config.useTailwind,
      useTesting: config.useTesting,
      useLinting: config.useLinting,
      useFormatting: config.useFormatting,
      features: config.features,
      dependencies: config.dependencies,
      timestamp: new Date().toISOString(),
      author: ctx.user || 'GitVan User',
      year: new Date().getFullYear()
    };

    // Create project structure
    const plan = await template.plan('react-project', projectData);
    const result = await template.apply(plan);

    // Initialize Git repository
    await git.init();
    await git.add('.');
    await git.commit(`Initial commit: React app '${config.projectName}' scaffolded by GitVan`);

    return {
      success: true,
      artifacts: result.artifacts,
      projectPath: result.targetPath,
      message: `React app '${config.projectName}' created successfully with ${config.features.length} features`
    };
  }
};
```

### Step 6: Create Templates

#### Package.json Template

```html
<!-- templates/react-project/package.json.njk -->
{
  "name": "{{ projectName | kebabCase }}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "{% if useVite %}vite{% else %}react-scripts start{% endif %}",
    "build": "{% if useVite %}vite build{% else %}react-scripts build{% endif %}",
    "preview": "{% if useVite %}vite preview{% endif %}",
    "test": "{% if useTesting %}{% if useVite %}vitest{% else %}react-scripts test{% endif %}{% endif %}",
    {% if useLinting %}"lint": "eslint src --ext .ts,.tsx",{% endif %}
    {% if useFormatting %}"format": "prettier --write src/**/*.{ts,tsx,js,jsx}",{% endif %}
    "type-check": "{% if useTypeScript %}tsc --noEmit{% endif %}"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"{% if useTailwind %},
    "clsx": "^2.0.0"{% endif %}
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
    {% if useTailwind %}
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    {% endif %}
    {% if useTesting %}
    {% if useVite %}
    "vitest": "^0.34.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^22.0.0",
    {% else %}
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.0.0",
    {% endif %}
    {% endif %}
    {% if useLinting %}
    "eslint": "^8.45.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    {% endif %}
    {% if useFormatting %}
    "prettier": "^3.0.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    {% endif %}
    {% for dependency in dependencies %}
    "{{ dependency }}": "latest",
    {% endfor %}
  }
}
```

#### React App Template

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
        <p>Built with {% if useVite %}Vite{% else %}Create React App{% endif %} and {% if useTypeScript %}TypeScript{% else %}JavaScript{% endif %}</p>
        {% if useTailwind %}
        <div className="mt-8 p-4 bg-blue-500 text-white rounded-lg">
          <p>Tailwind CSS is configured and ready to use!</p>
        </div>
        {% endif %}
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
        <p>Built with {% if useVite %}Vite{% else %}Create React App{% endif %}</p>
        {% if useTailwind %}
        <div className="mt-8 p-4 bg-blue-500 text-white rounded-lg">
          <p>Tailwind CSS is configured and ready to use!</p>
        </div>
        {% endif %}
      </header>
    </div>
  );
}

export default App;
{% endif %}
```

#### Vite Configuration

```html
<!-- templates/react-project/vite.config.ts.njk -->
{% if useVite %}
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
{% endif %}
```

### Step 7: Create Usage Examples

```javascript
// examples/basic-usage.mjs
import { withGitVan } from 'gitvan/core';
import { useJob } from 'gitvan/composables';

await withGitVan({ cwd: '/tmp/react-app', env: process.env }, async () => {
  const job = useJob();
  
  // Create a basic React app
  const result = await job.run('create-react-app', {
    projectName: 'my-awesome-app',
    useTypeScript: true,
    useVite: true,
    useTailwind: true,
    useTesting: true,
    useLinting: true,
    useFormatting: true,
    features: ['routing', 'state-management'],
    dependencies: ['react-router-dom', 'zustand']
  });
  
  console.log('App created:', result.message);
  console.log('Files created:', result.artifacts);
});
```

### Step 8: Test the Pack

```bash
# Test the pack locally
gitvan pack test react-scaffolder

# Create a test app
mkdir test-app
cd test-app
gitvan run create-react-app --projectName="Test App" --useTypeScript --useVite --useTailwind
```

### Step 9: Publish the Pack

```bash
# Validate pack
gitvan pack validate react-scaffolder

# Publish to registry
gitvan pack publish
```

## Tutorial 2: Automated Release Notes

This tutorial shows how to create an automated release notes generation system.

### Step 1: Create Release Notes Job

```javascript
// jobs/generate-release-notes.mjs
/**
 * GitVan Job: Generate Release Notes
 * Automatically generates release notes from Git commits
 */

export default {
  meta: {
    name: 'Generate Release Notes',
    description: 'Generates release notes from Git commits and PRs',
    tags: ['release', 'documentation', 'automation'],
    version: '1.0.0'
  },

  async run({ payload, ctx }) {
    const { 
      version, 
      previousVersion, 
      format = 'markdown',
      includeCommits = true,
      includePRs = true 
    } = payload;

    // Use GitVan composables
    const { useGit, useTemplate } = await import('gitvan/composables');
    const git = useGit();
    const template = useTemplate({ paths: ['templates'] });

    // Get commit range
    const commitRange = previousVersion ? `${previousVersion}..HEAD` : 'HEAD~10..HEAD';
    const commits = await git.getCommits(commitRange);

    // Categorize commits
    const categorizedCommits = categorizeCommits(commits);

    // Generate release notes
    const releaseData = {
      version,
      previousVersion,
      date: new Date().toISOString().split('T')[0],
      commits: categorizedCommits,
      stats: {
        total: commits.length,
        features: categorizedCommits.features.length,
        fixes: categorizedCommits.fixes.length,
        breaking: categorizedCommits.breaking.length
      }
    };

    // Render template
    const templateName = `release-notes-${format}`;
    const releaseNotes = await template.render(templateName, releaseData);

    // Write release notes file
    const fileName = `RELEASE_NOTES_${version}.md`;
    await fs.writeFile(fileName, releaseNotes);

    // Commit release notes
    await git.add(fileName);
    await git.commit(`chore: add release notes for ${version}`);

    return {
      success: true,
      artifacts: [fileName],
      message: `Release notes generated for ${version}`,
      stats: releaseData.stats
    };
  }
};

function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    breaking: [],
    docs: [],
    style: [],
    refactor: [],
    test: [],
    chore: []
  };

  commits.forEach(commit => {
    const message = commit.message.toLowerCase();
    
    if (message.includes('feat:') || message.includes('feature:')) {
      categories.features.push(commit);
    } else if (message.includes('fix:') || message.includes('bug:')) {
      categories.fixes.push(commit);
    } else if (message.includes('breaking:') || message.includes('!:')) {
      categories.breaking.push(commit);
    } else if (message.includes('docs:')) {
      categories.docs.push(commit);
    } else if (message.includes('style:')) {
      categories.style.push(commit);
    } else if (message.includes('refactor:')) {
      categories.refactor.push(commit);
    } else if (message.includes('test:')) {
      categories.test.push(commit);
    } else {
      categories.chore.push(commit);
    }
  });

  return categories;
}
```

### Step 2: Create Release Notes Templates

```html
<!-- templates/release-notes-markdown.njk -->
# Release Notes - {{ version }}

**Release Date:** {{ date }}
{% if previousVersion %}**Previous Version:** {{ previousVersion }}{% endif %}

## 📊 Summary

- **Total Changes:** {{ stats.total }} commits
- **New Features:** {{ stats.features }}
- **Bug Fixes:** {{ stats.fixes }}
- **Breaking Changes:** {{ stats.breaking }}

---

## 🚀 New Features

{% for commit in commits.features %}
- **{{ commit.subject }}** ({{ commit.hash.slice(0, 7) }})
  {% if commit.body %}
  {{ commit.body | indent(2) }}
  {% endif %}
{% endfor %}

## 🐛 Bug Fixes

{% for commit in commits.fixes %}
- **{{ commit.subject }}** ({{ commit.hash.slice(0, 7) }})
  {% if commit.body %}
  {{ commit.body | indent(2) }}
  {% endif %}
{% endfor %}

{% if commits.breaking.length > 0 %}
## ⚠️ Breaking Changes

{% for commit in commits.breaking %}
- **{{ commit.subject }}** ({{ commit.hash.slice(0, 7) }})
  {% if commit.body %}
  {{ commit.body | indent(2) }}
  {% endif %}
{% endfor %}
{% endif %}

## 📚 Documentation

{% for commit in commits.docs %}
- **{{ commit.subject }}** ({{ commit.hash.slice(0, 7) }})
{% endfor %}

## 🔧 Other Changes

{% for commit in commits.refactor %}
- **{{ commit.subject }}** ({{ commit.hash.slice(0, 7) }})
{% endfor %}

{% for commit in commits.test %}
- **{{ commit.subject }}** ({{ commit.hash.slice(0, 7) }})
{% endfor %}

{% for commit in commits.chore %}
- **{{ commit.subject }}** ({{ commit.hash.slice(0, 7) }})
{% endfor %}

---

## 📝 Full Changelog

{% for commit in commits.features.concat(commits.fixes).concat(commits.breaking).concat(commits.docs).concat(commits.refactor).concat(commits.test).concat(commits.chore) %}
- {{ commit.hash.slice(0, 7) }} - {{ commit.subject }} (@{{ commit.author }})
{% endfor %}
```

### Step 3: Create Release Event

```javascript
// events/tag/v*.mjs
export default {
  name: 'Version Tag Release',
  description: 'Triggers when a version tag is created',
  type: 'tag',
  pattern: 'v*',
  
  job: 'generate-release-notes',
  
  payload: {
    version: '{{ tag }}',
    previousVersion: '{{ previousTag }}',
    format: 'markdown',
    includeCommits: true,
    includePRs: true
  }
};
```

### Step 4: Create Release Workflow

```javascript
// jobs/create-release.mjs
export default {
  meta: {
    name: 'Create Release',
    description: 'Creates a new release with notes and GitHub release',
    tags: ['release', 'github', 'automation'],
    version: '1.0.0'
  },

  async run({ payload, ctx }) {
    const { version, releaseNotes, draft = false, prerelease = false } = payload;

    // Generate release notes
    const notesResult = await job.run('generate-release-notes', {
      version,
      format: 'markdown'
    });

    // Create GitHub release
    const githubRelease = await createGitHubRelease({
      tag: version,
      title: `Release ${version}`,
      body: notesResult.content,
      draft,
      prerelease
    });

    // Update changelog
    await updateChangelog(version, notesResult.content);

    return {
      success: true,
      artifacts: [notesResult.artifacts, githubRelease.url],
      message: `Release ${version} created successfully`,
      releaseUrl: githubRelease.url
    };
  }
};
```

## Tutorial 3: CI/CD Integration

This tutorial shows how to integrate GitVan with GitHub Actions, GitLab CI, and other CI/CD systems.

### GitHub Actions Integration

```yaml
# .github/workflows/gitvan.yml
name: GitVan Automation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM

jobs:
  gitvan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      with:
        fetch-depth: 0  # Fetch full history for GitVan
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install GitVan
      run: npm install -g gitvan
    
    - name: Install dependencies
      run: npm install
    
    - name: Run GitVan jobs
      run: |
        # Run tests
        gitvan run test-suite
        
        # Run linting
        gitvan run lint-code
        
        # Run security scan
        gitvan run security-scan
        
        # Generate documentation
        gitvan run generate-docs
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        NODE_ENV: production
    
    - name: Deploy on main branch
      if: github.ref == 'refs/heads/main'
      run: |
        gitvan run deploy-production
      env:
        DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  GIT_DEPTH: 0

test:
  stage: test
  image: node:18
  before_script:
    - npm install -g gitvan
    - npm install
  script:
    - gitvan run test-suite
    - gitvan run lint-code
    - gitvan run security-scan
  only:
    - merge_requests
    - main

build:
  stage: build
  image: node:18
  before_script:
    - npm install -g gitvan
    - npm install
  script:
    - gitvan run build-app
    - gitvan run generate-docs
  artifacts:
    paths:
      - dist/
      - docs/
  only:
    - main

deploy:
  stage: deploy
  image: node:18
  before_script:
    - npm install -g gitvan
  script:
    - gitvan run deploy-production
  environment:
    name: production
  only:
    - main
  when: manual
```

### Jenkins Integration

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        GIT_DEPTH = '0'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'npm install -g gitvan'
                sh 'npm install'
            }
        }
        
        stage('Test') {
            steps {
                sh 'gitvan run test-suite'
                sh 'gitvan run lint-code'
                sh 'gitvan run security-scan'
            }
        }
        
        stage('Build') {
            when {
                branch 'main'
            }
            steps {
                sh 'gitvan run build-app'
                sh 'gitvan run generate-docs'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'gitvan run deploy-production'
            }
        }
    }
    
    post {
        always {
            sh 'gitvan run cleanup'
        }
        success {
            sh 'gitvan run notify-success'
        }
        failure {
            sh 'gitvan run notify-failure'
        }
    }
}
```

### GitVan CI Jobs

```javascript
// jobs/ci-test-suite.mjs
export default {
  meta: {
    name: 'CI Test Suite',
    description: 'Runs comprehensive test suite for CI',
    tags: ['ci', 'testing', 'automation'],
    version: '1.0.0'
  },

  async run({ payload, ctx }) {
    const { environment = 'ci', coverage = true } = payload;

    // Run tests with coverage
    const testResult = await runTests({
      environment,
      coverage,
      ci: true
    });

    // Upload coverage to service
    if (coverage && testResult.coverage) {
      await uploadCoverage(testResult.coverage);
    }

    // Generate test report
    const report = await generateTestReport(testResult);

    return {
      success: testResult.success,
      artifacts: [report],
      message: `Test suite completed with ${testResult.passed}/${testResult.total} tests passing`,
      coverage: testResult.coverage
    };
  }
};
```

## Tutorial 4: Multi-Environment Deployment

This tutorial shows how to set up multi-environment deployment with GitVan.

### Environment Configuration

```javascript
// gitvan.config.js
export default {
  environments: {
    development: {
      url: 'http://localhost:3000',
      database: 'dev-db',
      features: ['debug', 'hot-reload']
    },
    staging: {
      url: 'https://staging.example.com',
      database: 'staging-db',
      features: ['debug']
    },
    production: {
      url: 'https://example.com',
      database: 'prod-db',
      features: []
    }
  },
  
  deployment: {
    staging: {
      branch: 'develop',
      autoDeploy: true,
      healthCheck: true
    },
    production: {
      branch: 'main',
      autoDeploy: false,
      healthCheck: true,
      rollback: true
    }
  }
};
```

### Deployment Jobs

```javascript
// jobs/deploy-environment.mjs
export default {
  meta: {
    name: 'Deploy to Environment',
    description: 'Deploys application to specified environment',
    tags: ['deployment', 'environment', 'automation'],
    version: '1.0.0'
  },

  async run({ payload, ctx }) {
    const { environment, version, strategy = 'rolling' } = payload;

    // Validate environment
    const envConfig = await getEnvironmentConfig(environment);
    if (!envConfig) {
      throw new Error(`Environment ${environment} not configured`);
    }

    // Build application
    const buildResult = await buildApplication(environment);

    // Deploy based on strategy
    let deployResult;
    switch (strategy) {
      case 'rolling':
        deployResult = await rollingDeploy(environment, buildResult);
        break;
      case 'blue-green':
        deployResult = await blueGreenDeploy(environment, buildResult);
        break;
      case 'canary':
        deployResult = await canaryDeploy(environment, buildResult);
        break;
      default:
        throw new Error(`Unknown deployment strategy: ${strategy}`);
    }

    // Health check
    const healthCheck = await performHealthCheck(envConfig.url);

    // Update deployment status
    await updateDeploymentStatus(environment, version, {
      status: healthCheck.success ? 'success' : 'failed',
      strategy,
      duration: deployResult.duration
    });

    return {
      success: healthCheck.success,
      artifacts: [buildResult.artifacts, deployResult.artifacts],
      message: `Deployment to ${environment} ${healthCheck.success ? 'successful' : 'failed'}`,
      environment,
      version,
      strategy,
      healthCheck
    };
  }
};
```

### Environment Events

```javascript
// events/merge-to/develop.mjs
export default {
  name: 'Staging Deployment',
  description: 'Deploys to staging when merging to develop',
  type: 'merge',
  pattern: 'develop',
  
  job: 'deploy-environment',
  
  payload: {
    environment: 'staging',
    strategy: 'rolling',
    healthCheck: true
  }
};

// events/merge-to/main.mjs
export default {
  name: 'Production Deployment',
  description: 'Deploys to production when merging to main',
  type: 'merge',
  pattern: 'main',
  
  job: 'deploy-environment',
  
  payload: {
    environment: 'production',
    strategy: 'blue-green',
    healthCheck: true,
    rollback: true
  }
};
```

## Tutorial 5: Custom Pack Development

This tutorial shows how to create a custom pack for a specific technology stack.

### Pack Structure

```
my-vue-pack/
├── pack.json
├── README.md
├── jobs/
│   ├── create-vue-app.mjs
│   ├── add-component.mjs
│   └── build-vue-app.mjs
├── templates/
│   ├── vue-project/
│   │   ├── package.json.njk
│   │   ├── vite.config.js.njk
│   │   └── src/
│   │       ├── App.vue.njk
│   │       └── main.js.njk
│   └── component/
│       └── Component.vue.njk
├── schemas/
│   ├── vue-config.zod.mjs
│   └── component-config.zod.mjs
└── examples/
    ├── basic-usage.mjs
    └── advanced-usage.mjs
```

### Pack Manifest

```json
{
  "name": "vue-scaffolder",
  "version": "1.0.0",
  "description": "Vue.js application scaffolding pack",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "keywords": ["vue", "typescript", "vite", "scaffolding"],
  "categories": ["frontend", "scaffolding"],
  "tags": ["vue", "typescript", "vite", "pinia"],
  "gitvan": {
    "jobs": [
      {
        "id": "create-vue-app",
        "name": "Create Vue App",
        "description": "Scaffolds a new Vue.js application",
        "file": "jobs/create-vue-app.mjs",
        "tags": ["scaffolding", "vue"]
      },
      {
        "id": "add-component",
        "name": "Add Component",
        "description": "Adds a new Vue component",
        "file": "jobs/add-component.mjs",
        "tags": ["component", "vue"]
      }
    ],
    "templates": [
      {
        "id": "vue-project",
        "name": "Vue Project Template",
        "description": "Complete Vue.js project structure",
        "path": "templates/vue-project/",
        "tags": ["vue", "typescript", "vite"]
      },
      {
        "id": "vue-component",
        "name": "Vue Component Template",
        "description": "Vue component template",
        "path": "templates/component/",
        "tags": ["component", "vue"]
      }
    ],
    "schemas": [
      {
        "id": "vue-config",
        "name": "Vue Configuration",
        "description": "Vue project configuration schema",
        "file": "schemas/vue-config.zod.mjs"
      }
    ]
  }
}
```

### Component Job

```javascript
// jobs/add-component.mjs
export default {
  meta: {
    name: 'Add Vue Component',
    description: 'Adds a new Vue component to the project',
    tags: ['component', 'vue', 'scaffolding'],
    version: '1.0.0'
  },

  async run({ payload, ctx }) {
    const { 
      componentName, 
      useTypeScript = true, 
      useCompositionAPI = true,
      usePinia = false 
    } = payload;

    // Use GitVan composables
    const { useTemplate } = await import('gitvan/composables');
    const template = useTemplate({ paths: ['templates'] });

    // Prepare component data
    const componentData = {
      componentName,
      useTypeScript,
      useCompositionAPI,
      usePinia,
      timestamp: new Date().toISOString()
    };

    // Generate component
    const plan = await template.plan('vue-component', componentData);
    const result = await template.apply(plan);

    return {
      success: true,
      artifacts: result.artifacts,
      message: `Vue component '${componentName}' created successfully`
    };
  }
};
```

### Component Template

```html
<!-- templates/component/Component.vue.njk -->
<template>
  <div class="{{ componentName | kebabCase }}">
    <h2>{{ componentName }}</h2>
    <p>This is a {{ componentName }} component</p>
  </div>
</template>

{% if useTypeScript %}
<script setup lang="ts">
{% if useCompositionAPI %}
import { ref, computed } from 'vue'
{% if usePinia %}
import { useStore } from '@/stores/{{ componentName | kebabCase }}'
{% endif %}

// Component logic
const {{ componentName | camelCase }} = ref('Hello {{ componentName }}')

{% if usePinia %}
const store = useStore()
{% endif %}

const computedValue = computed(() => {
  return {{ componentName | camelCase }}.value.toUpperCase()
})
{% else %}
// Options API
export default {
  name: '{{ componentName }}',
  data() {
    return {
      {{ componentName | camelCase }}: 'Hello {{ componentName }}'
    }
  },
  computed: {
    computedValue() {
      return this.{{ componentName | camelCase }}.toUpperCase()
    }
  }
}
{% endif %}
</script>
{% else %}
<script setup>
{% if useCompositionAPI %}
import { ref, computed } from 'vue'
{% if usePinia %}
import { useStore } from '@/stores/{{ componentName | kebabCase }}'
{% endif %}

// Component logic
const {{ componentName | camelCase }} = ref('Hello {{ componentName }}')

{% if usePinia %}
const store = useStore()
{% endif %}

const computedValue = computed(() => {
  return {{ componentName | camelCase }}.value.toUpperCase()
})
{% else %}
// Options API
export default {
  name: '{{ componentName }}',
  data() {
    return {
      {{ componentName | camelCase }}: 'Hello {{ componentName }}'
    }
  },
  computed: {
    computedValue() {
      return this.{{ componentName | camelCase }}.toUpperCase()
    }
  }
}
{% endif %}
</script>
{% endif %}

<style scoped>
.{{ componentName | kebabCase }} {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
```

These tutorials provide comprehensive examples of how to use GitVan for various automation scenarios, from simple scaffolding to complex CI/CD pipelines and multi-environment deployments.
