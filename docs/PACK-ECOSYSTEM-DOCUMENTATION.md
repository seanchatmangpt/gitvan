# GitVan Pack Ecosystem Documentation

**Version**: 2.1.0  
**Last Updated**: September 18, 2025  
**Status**: Production Ready  

## 📦 Overview

The GitVan Pack Ecosystem is a comprehensive collection of reusable, modular packages that extend GitVan's core functionality. Packs provide pre-built solutions for common development tasks, from simple project scaffolding to complex AI-powered applications.

## 🏗️ Architecture

### Pack Structure
```
pack-name/
├── pack.json              # Pack metadata and configuration
├── jobs/                  # GitVan jobs for automation
│   ├── create-project.mjs
│   ├── build-project.mjs
│   └── deploy-project.mjs
├── templates/             # Template files for scaffolding
│   ├── src/
│   ├── config/
│   └── docs/
├── docker-compose.yml     # Containerized development (optional)
├── Dockerfile.dev         # Development container (optional)
├── setup-*.sh            # Setup scripts (optional)
├── test-*.sh             # Testing scripts (optional)
├── README.md              # Pack documentation
└── LICENSE                # License file
```

### Pack Types

#### 1. **Application Packs**
- **Purpose**: Complete application scaffolding
- **Examples**: `nextjs-dashboard-pack`, `nextjs-cms-pack`
- **Features**: Full-stack applications with UI, backend, and deployment

#### 2. **Framework Packs**
- **Purpose**: Framework-specific tooling and configurations
- **Examples**: `next-min`, `unrouting`
- **Features**: Framework setup, routing, and utilities

#### 3. **Built-in Packs**
- **Purpose**: Core GitVan functionality
- **Examples**: `nodejs-basic`, `docs-enterprise`
- **Features**: Essential development tools and documentation

#### 4. **Remote Packs**
- **Purpose**: External pack integration
- **Examples**: `remote-example`
- **Features**: Remote pack discovery and installation

## 🚀 Available Packs

### **Next.js Dashboard Pack v2.0**
**Hyper-Advanced AI-Powered Dashboard for 2026**

```json
{
  "name": "nextjs-dashboard-pack",
  "version": "2.0.0",
  "description": "A hyper-advanced Next.js dashboard pack with AI-powered features, real-time data, and cutting-edge UI components for 2026"
}
```

**Key Features:**
- **Next.js 15.5.2** + **React 19** + **TypeScript 5.7**
- **AI-Powered Insights**: Intelligent data analysis and recommendations
- **Real-time Data**: Live updates and notifications
- **Modern UI**: shadcn/ui components with Radix UI primitives
- **Advanced Visualization**: deck.gl for complex data visualization
- **Docker Integration**: Live development with hot reloading
- **Performance**: Turbopack builds and Edge Runtime optimization

**Available Jobs:**
- `create-dashboard-project` - Creates complete AI-powered dashboard
- `add-dashboard-component` - Generates new components with AI assistance
- `generate-dashboard-data` - Creates realistic data with AI patterns
- `setup-dashboard-auth` - Configures NextAuth.js v5 authentication
- `deploy-dashboard` - Deploys to Vercel, Netlify, or AWS
- `dashboard-dev-server` - Starts development server with hot reloading
- `setup-ai-features` - Configures AI/ML integration
- `configure-realtime` - Sets up real-time data streaming
- `optimize-performance` - Applies performance optimizations

**Tech Stack:**
- Next.js 15.5.2, React 19, TypeScript 5.7
- Tailwind CSS 3.4, Chart.js 4.4, React Query 5.59
- NextAuth.js 5.0, Prisma 5.20, PostgreSQL, Redis
- Framer Motion 11.11, Lucide React 0.460, Radix UI
- React Hook Form 7.53, Zod 3.23, Jotai 2.9, Zustand 5.0
- Socket.io 4.8, AI/ML Integration, Edge Runtime, Turbopack

### **Next.js CMS Pack v1.0**
**Static CMS with React Components in Markdown**

```json
{
  "name": "nextjs-cms-pack",
  "version": "1.0.0",
  "description": "A GitVan pack for creating Next.js static CMS with React components embedded in markdown pages"
}
```

**Key Features:**
- **Markdown-first Content Management**
- **React Components Embedded in Markdown**
- **Static Site Generation for GitHub Pages**
- **Tailwind CSS Styling**
- **GitVan-powered Automation**
- **Responsive Design**
- **SEO Optimized**

**Available Jobs:**
- `cms:create-project` - Creates complete Next.js CMS project structure
- `cms:build` - Builds the static CMS site
- `cms:dev` - Starts the CMS development server
- `cms:deploy` - Deploys to GitHub Pages
- `cms:create-page` - Creates new markdown page with React components

**Project Structure:**
```
cms-project/
├── content/
│   ├── pages/           # Markdown content files
│   └── components/     # React components for embedding
├── src/
│   ├── app/            # Next.js App Router
│   ├── components/     # Core CMS components
│   └── lib/            # Utilities and helpers
├── public/             # Static assets
├── .github/
│   └── workflows/      # GitHub Actions
└── next.config.mjs     # Next.js configuration
```

### **Next.js GitHub Pack**
**GitHub Pages Deployment and Integration**

**Key Features:**
- **GitHub Pages Deployment**
- **GitHub Actions Integration**
- **Repository Management**
- **Automated Workflows**

### **Next.js Minimal Pack**
**Minimal Next.js Setup**

**Key Features:**
- **Minimal Configuration**
- **Essential Dependencies**
- **Quick Setup**
- **Lightweight**

### **Unrouting Pack**
**Advanced Routing Utilities**

**Key Features:**
- **File-based Routing**
- **Dynamic Routes**
- **Route Guards**
- **Navigation Utilities**

### **Built-in Packs**

#### **Node.js Basic Pack**
```json
{
  "name": "nodejs-basic",
  "version": "1.0.0",
  "description": "A basic Node.js application starter pack"
}
```

**Key Features:**
- **Basic Node.js Setup**
- **Development Tools**
- **Essential Dependencies**
- **Quick Scaffolding**

#### **Docs Enterprise Pack**
**Enterprise Documentation System**

**Key Features:**
- **Multi-format Documentation**
- **Version Control**
- **Collaboration Tools**
- **Publishing Pipeline**

#### **React Markdown Server Pack**
**Markdown-based React Server**

**Key Features:**
- **Markdown Processing**
- **React Integration**
- **Server-side Rendering**
- **Content Management**

## 🛠️ Pack Development

### Creating a New Pack

#### 1. **Pack Structure Setup**
```bash
# Create pack directory
mkdir my-awesome-pack
cd my-awesome-pack

# Initialize pack structure
mkdir -p jobs templates src docs
touch pack.json README.md LICENSE
```

#### 2. **Pack Configuration (`pack.json`)**
```json
{
  "name": "my-awesome-pack",
  "version": "1.0.0",
  "description": "A description of what this pack does",
  "author": "Your Name",
  "license": "MIT",
  "tags": ["tag1", "tag2", "tag3"],
  "capabilities": [
    "scaffold",
    "development",
    "deployment"
  ],
  "jobs": [
    "create-project",
    "build-project",
    "deploy-project"
  ],
  "templates": [
    "templates/src/app/layout.tsx",
    "templates/src/app/page.tsx",
    "templates/package.json",
    "templates/next.config.mjs"
  ],
  "features": [
    "Feature 1",
    "Feature 2",
    "Feature 3"
  ],
  "tech_stack": [
    "Next.js 15.5.2",
    "React 19",
    "TypeScript 5.7"
  ],
  "gitvan": {
    "packType": "application",
    "version": "2.0.0",
    "compatibility": {
      "gitvan": ">=2.0.0"
    }
  }
}
```

#### 3. **Job Implementation**
```javascript
// jobs/create-project.mjs
import { defineJob } from "../../src/runtime/define-job.mjs";
import { promises as fs } from "fs";
import { join } from "path";

export const createProject = defineJob({
  name: "create-project",
  description: "Creates a new project using this pack",
  inputs: {
    projectName: {
      type: "string",
      required: true,
      description: "Name of the project to create"
    },
    useTypeScript: {
      type: "boolean",
      default: true,
      description: "Whether to use TypeScript"
    }
  },
  async execute({ inputs, context }) {
    const { projectName, useTypeScript } = inputs;
    
    // Create project directory
    const projectDir = join(process.cwd(), projectName);
    await fs.mkdir(projectDir, { recursive: true });
    
    // Copy templates
    await copyTemplates(projectDir, { useTypeScript });
    
    // Generate package.json
    await generatePackageJson(projectDir, { projectName, useTypeScript });
    
    return {
      success: true,
      message: `Project ${projectName} created successfully`,
      projectDir
    };
  }
});
```

#### 4. **Template System**
```javascript
// templates/package.json
{
  "name": "{{ projectName }}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.5.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"{{#if useTypeScript}},
    "typescript": "^5.7.0"{{/if}}
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.5.2"{{#if useTypeScript}},
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"{{/if}}
  }
}
```

#### 5. **Docker Integration (Optional)**
```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/workspace
      - /workspace/node_modules
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_BASE_PATH=
      - WATCHPACK_POLLING=true
    command: pnpm dev
```

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

# Install git and bash
RUN apk add --no-cache git bash

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /workspace

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the development server
CMD ["pnpm", "dev"]
```

#### 6. **Setup Scripts (Optional)**
```bash
#!/bin/bash
# setup-dev-environment.sh

set -e

PROJECT_DIR="/tmp/test-project"
PACK_DIR="/Users/sac/gitvan/packs/my-awesome-pack"

echo "🚀 Setting up development environment..."

# Clean up previous test run
echo "🧹 Cleaning up previous project directory: $PROJECT_DIR"
rm -rf "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR"

echo "📦 Copying templates to $PROJECT_DIR..."
cp -R "$PACK_DIR/templates/." "$PROJECT_DIR/"

echo "✅ Project setup complete in $PROJECT_DIR"
echo "To start the development server, navigate to $PROJECT_DIR and run: docker compose up --build"
```

### Pack Testing

#### 1. **Unit Testing**
```javascript
// tests/my-awesome-pack.test.mjs
import { describe, it, expect } from "vitest";
import { createProject } from "../jobs/create-project.mjs";

describe("My Awesome Pack", () => {
  it("should create a project successfully", async () => {
    const result = await createProject.execute({
      inputs: {
        projectName: "test-project",
        useTypeScript: true
      },
      context: {}
    });
    
    expect(result.success).toBe(true);
    expect(result.projectDir).toContain("test-project");
  });
});
```

#### 2. **Integration Testing**
```bash
#!/bin/bash
# test-pack-integration.sh

set -e

echo "🧪 Testing pack integration..."

# Test pack discovery
gitvan pack list | grep "my-awesome-pack"

# Test pack installation
gitvan pack install my-awesome-pack

# Test job execution
gitvan run create-project --project_name="test-project" --use_typescript=true

# Test project structure
ls -la test-project/
ls -la test-project/src/
ls -la test-project/templates/

echo "✅ Pack integration test passed!"
```

#### 3. **Docker Testing**
```bash
#!/bin/bash
# test-docker-cleanroom.sh

set -e

echo "🐳 Testing pack in Docker cleanroom..."

# Build cleanroom image
docker build -f Dockerfile.cleanroom -t gitvan-cleanroom .

# Test pack in cleanroom
docker run --rm -v $(pwd):/workspace gitvan-cleanroom \
  gitvan pack install my-awesome-pack

docker run --rm -v $(pwd):/workspace gitvan-cleanroom \
  gitvan run create-project --project_name="test-project"

echo "✅ Docker cleanroom test passed!"
```

## 📚 Pack Usage

### Installing Packs

#### 1. **Local Pack Installation**
```bash
# Install from local directory
gitvan pack install ./packs/my-awesome-pack

# Install from Git repository
gitvan pack install https://github.com/user/my-awesome-pack.git

# Install from npm registry
gitvan pack install my-awesome-pack@1.0.0
```

#### 2. **Pack Discovery**
```bash
# List available packs
gitvan pack list

# Search for packs
gitvan pack search "nextjs"

# Show pack details
gitvan pack info nextjs-dashboard-pack
```

### Using Pack Jobs

#### 1. **Job Execution**
```bash
# Run a pack job
gitvan run create-dashboard-project --project_name="my-dashboard"

# Run with multiple parameters
gitvan run create-dashboard-project \
  --project_name="my-dashboard" \
  --use_auth=true \
  --use_database=true \
  --use_realtime=true

# Run with configuration file
gitvan run create-dashboard-project --config=./dashboard-config.json
```

#### 2. **Job Chaining**
```bash
# Chain multiple jobs
gitvan run create-dashboard-project --project_name="my-dashboard" && \
gitvan run add-dashboard-component --component="analytics" && \
gitvan run generate-dashboard-data --data_type="users"
```

### Pack Configuration

#### 1. **Global Configuration**
```json
// .gitvan/packs.json
{
  "installedPacks": [
    {
      "name": "nextjs-dashboard-pack",
      "version": "2.0.0",
      "source": "local",
      "path": "./packs/nextjs-dashboard-pack"
    }
  ],
  "defaultPack": "nextjs-dashboard-pack",
  "packSettings": {
    "nextjs-dashboard-pack": {
      "defaultPort": 3000,
      "useDocker": true,
      "enableAI": true
    }
  }
}
```

#### 2. **Project-specific Configuration**
```json
// my-project/.gitvan/pack-config.json
{
  "pack": "nextjs-dashboard-pack",
  "version": "2.0.0",
  "settings": {
    "projectName": "my-dashboard",
    "useAuth": true,
    "useDatabase": true,
    "useRealtime": true,
    "aiProvider": "openai",
    "aiModel": "gpt-4"
  }
}
```

## 🔧 Advanced Features

### Pack Dependencies

#### 1. **Dependency Management**
```json
{
  "dependencies": {
    "nextjs-dashboard-pack": "^2.0.0",
    "nextjs-cms-pack": "^1.0.0"
  },
  "peerDependencies": {
    "gitvan": ">=2.0.0"
  }
}
```

#### 2. **Dependency Resolution**
```bash
# Install pack dependencies
gitvan pack install --dependencies

# Update pack dependencies
gitvan pack update --dependencies

# Check for dependency conflicts
gitvan pack check --dependencies
```

### Pack Versioning

#### 1. **Semantic Versioning**
```json
{
  "version": "1.2.3",
  "versioning": {
    "major": 1,
    "minor": 2,
    "patch": 3,
    "prerelease": "beta.1",
    "build": "20240918"
  }
}
```

#### 2. **Version Compatibility**
```json
{
  "compatibility": {
    "gitvan": ">=2.0.0",
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### Pack Hooks

#### 1. **Lifecycle Hooks**
```javascript
// Pack lifecycle hooks
export const packHooks = {
  beforeInstall: async (pack) => {
    console.log(`Installing pack: ${pack.name}`);
  },
  afterInstall: async (pack) => {
    console.log(`Pack installed: ${pack.name}`);
  },
  beforeUninstall: async (pack) => {
    console.log(`Uninstalling pack: ${pack.name}`);
  },
  afterUninstall: async (pack) => {
    console.log(`Pack uninstalled: ${pack.name}`);
  }
};
```

#### 2. **Job Hooks**
```javascript
// Job execution hooks
export const jobHooks = {
  beforeExecute: async (job, inputs) => {
    console.log(`Executing job: ${job.name}`);
  },
  afterExecute: async (job, result) => {
    console.log(`Job completed: ${job.name}`);
  },
  onError: async (job, error) => {
    console.error(`Job failed: ${job.name}`, error);
  }
};
```

## 🚀 Best Practices

### Pack Design

#### 1. **Single Responsibility**
- Each pack should have a clear, single purpose
- Avoid feature creep and unnecessary complexity
- Focus on one domain or technology stack

#### 2. **Modularity**
- Break down complex functionality into smaller, reusable components
- Use composition over inheritance
- Provide clear interfaces and APIs

#### 3. **Documentation**
- Comprehensive README with examples
- Clear API documentation
- Usage examples and tutorials
- Troubleshooting guides

### Development Workflow

#### 1. **Version Control**
- Use semantic versioning
- Tag releases properly
- Maintain changelog
- Use conventional commits

#### 2. **Testing**
- Unit tests for all jobs
- Integration tests for pack functionality
- Docker cleanroom testing
- Performance testing

#### 3. **Quality Assurance**
- Code linting and formatting
- Type checking (TypeScript)
- Security scanning
- Performance monitoring

### Performance Optimization

#### 1. **Template Optimization**
- Minimize template size
- Use efficient template engines
- Cache compiled templates
- Optimize asset loading

#### 2. **Job Optimization**
- Parallel job execution where possible
- Efficient file operations
- Memory management
- Error handling and recovery

## 🔍 Troubleshooting

### Common Issues

#### 1. **Pack Installation Failures**
```bash
# Check pack compatibility
gitvan pack check --compatibility

# Verify pack integrity
gitvan pack verify my-awesome-pack

# Reinstall pack
gitvan pack uninstall my-awesome-pack
gitvan pack install my-awesome-pack
```

#### 2. **Job Execution Errors**
```bash
# Check job dependencies
gitvan job check create-project

# Verify job inputs
gitvan job validate create-project --inputs='{"projectName":"test"}'

# Run job in debug mode
gitvan run create-project --debug --project_name="test"
```

#### 3. **Template Rendering Issues**
```bash
# Validate templates
gitvan template validate

# Test template rendering
gitvan template test --template="package.json" --data='{"projectName":"test"}'

# Check template syntax
gitvan template lint
```

### Debugging Tools

#### 1. **Pack Debugging**
```bash
# Enable debug mode
export GITVAN_DEBUG=true

# Verbose logging
gitvan pack install --verbose my-awesome-pack

# Debug pack discovery
gitvan pack list --debug
```

#### 2. **Job Debugging**
```bash
# Job execution tracing
gitvan run create-project --trace --project_name="test"

# Performance profiling
gitvan run create-project --profile --project_name="test"

# Memory usage monitoring
gitvan run create-project --memory --project_name="test"
```

## 📈 Future Roadmap

### Planned Features

#### 1. **Pack Marketplace**
- Centralized pack registry
- Pack discovery and search
- User ratings and reviews
- Automated pack validation

#### 2. **Advanced Pack Features**
- Pack composition and inheritance
- Dynamic pack loading
- Pack hot-swapping
- Advanced dependency resolution

#### 3. **Developer Experience**
- Pack development tools
- Automated testing framework
- Performance benchmarking
- Security scanning

#### 4. **Enterprise Features**
- Private pack registries
- Enterprise pack management
- Compliance and auditing
- Advanced security features

### Community Contributions

#### 1. **Pack Development**
- Community pack contributions
- Pack development guidelines
- Contribution templates
- Review and approval process

#### 2. **Documentation**
- Community documentation
- Tutorial contributions
- Example pack development
- Best practice guides

## 📞 Support and Resources

### Documentation
- **GitVan Docs**: [docs.gitvan.dev](https://docs.gitvan.dev)
- **Pack Development Guide**: [docs.gitvan.dev/packs](https://docs.gitvan.dev/packs)
- **API Reference**: [docs.gitvan.dev/api](https://docs.gitvan.dev/api)

### Community
- **GitHub**: [github.com/gitvan/gitvan](https://github.com/gitvan/gitvan)
- **Discord**: [discord.gg/gitvan](https://discord.gg/gitvan)
- **Issues**: [github.com/gitvan/gitvan/issues](https://github.com/gitvan/gitvan/issues)

### Examples
- **Pack Examples**: [github.com/gitvan/pack-examples](https://github.com/gitvan/pack-examples)
- **Tutorials**: [docs.gitvan.dev/tutorials](https://docs.gitvan.dev/tutorials)
- **Best Practices**: [docs.gitvan.dev/best-practices](https://docs.gitvan.dev/best-practices)

---

**GitVan Pack Ecosystem v2.1.0** - Where modularity meets automation. Where development becomes effortless. Where the future of development automation begins.

*Transform your development workflow with the power of GitVan's comprehensive pack ecosystem.*
