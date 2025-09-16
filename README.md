# GitVan

**AI-Powered Git Workflow Automation & Repository Intelligence**

GitVan transforms your Git repository into an intelligent development environment by integrating Large Language Models (LLMs) directly into your workflow. Automate commit analysis, generate intelligent changelogs, maintain development diaries, and enhance your entire development process with AI assistance.

## 🚀 Quick Start

```bash
# Install GitVan globally
npm install -g gitvan

# Initialize in your repository
cd your-project
gitvan init

# Start the AI-powered workflow
gitvan daemon start
```

## 🏗️ Architecture Overview

GitVan is built as a modern monorepo with focused packages:

```
packages/
├── cli/           # Command-line interface
├── core/          # Core GitVan engine
├── daemon/        # Background service
├── llm/           # LLM provider integrations
├── cookbook/      # Recipe system for workflows
└── schemas/       # TypeScript schemas & validation
```

## 📦 Packages

### Core Packages

- **[@gitvan/cli](./packages/cli/)** - Command-line interface for GitVan
- **[@gitvan/core](./packages/core/)** - Core engine with Git integration
- **[@gitvan/daemon](./packages/daemon/)** - Background service for automation
- **[@gitvan/llm](./packages/llm/)** - LLM provider abstractions

### Extension Packages

- **[@gitvan/cookbook](./packages/cookbook/)** - Workflow recipes and templates
- **[@gitvan/schemas](./packages/schemas/)** - TypeScript schemas and validation

## 🛠️ Installation

### Prerequisites

- **Node.js** 18+ and **pnpm** 8+
- **Git** 2.30+ with GPG signing (recommended)
- **LLM Provider**: Ollama (local) or OpenAI API key

### Development Setup

```bash
# Clone the repository
git clone https://github.com/sac/gitvan.git
cd gitvan

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Using GitVan CLI

```bash
# Global installation
npm install -g @gitvan/cli

# Use in any Git repository
cd your-project
gitvan init
gitvan status
```

## 🎯 Key Features

### 🤖 AI-Powered Workflows

- **Intelligent Commit Analysis** - Automatically analyze commits for quality, security, and improvements
- **Smart Changelog Generation** - Generate meaningful changelogs from commit history
- **Development Diary** - Maintain automated development journals
- **Code Review Assistant** - AI-powered code review suggestions

### 🔧 Developer Experience

- **Zero Configuration** - Works out of the box with sensible defaults
- **Extensible Recipe System** - Create custom workflows with the cookbook system
- **Multiple LLM Support** - Works with Ollama, OpenAI, Anthropic, and more
- **Git Integration** - Seamless integration with Git hooks and workflows

### 🚀 Automation

- **Scheduled Workflows** - Cron-based automation for regular tasks
- **Event-Driven Actions** - Trigger workflows on Git events
- **Background Processing** - Non-blocking AI operations via daemon service

## 📚 Usage Examples

### Basic Repository Intelligence

```bash
# Initialize GitVan in your project
gitvan init

# Analyze recent commits
gitvan analyze --commits=10

# Generate changelog for the current week
gitvan changelog --period=week

# Update development diary
gitvan diary update
```

### Advanced Automation

```bash
# Start background daemon for automation
gitvan daemon start

# Schedule daily development summaries
gitvan schedule add "daily-summary" --cron="0 18 * * *" --recipe="dev-diary"

# Enable commit analysis on every push
gitvan hooks install --trigger="pre-push" --recipe="commit-analysis"
```

### Custom Workflows

```bash
# Install community recipes
gitvan cookbook install security-audit
gitvan cookbook install performance-tracker

# Create custom recipe
gitvan cookbook create my-workflow
gitvan cookbook run my-workflow
```

## ⚙️ Configuration

GitVan uses a flexible configuration system. Create `gitvan.config.js` in your project root:

```javascript
export default {
  repo: {
    defaultBranch: "main",
    notesRef: "refs/notes/gitvan"
  },
  llm: {
    baseURL: "http://localhost:11434", // Ollama
    model: "llama3.2",
    temperature: 0.2
  },
  cookbook: {
    install: ["dev-diary", "changelog", "security-audit"]
  },
  events: [
    {
      id: "daily-summary",
      workflow: "cron",
      schedule: "0 18 * * *",
      run: { type: "cookbook", recipe: "dev-diary" }
    }
  ]
};
```

## 🎨 Recipe System

GitVan's cookbook system allows you to create reusable workflows:

```bash
# List available recipes
gitvan cookbook list

# Install a recipe
gitvan cookbook install changelog

# Run a recipe
gitvan cookbook run changelog --period=week

# Create your own recipe
gitvan cookbook create my-recipe
```

## 🔌 LLM Providers

GitVan supports multiple LLM providers:

- **Ollama** (Recommended for local development)
- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude)
- **Google AI** (Gemini)
- **Custom OpenAI-compatible endpoints**

Configure your provider in `gitvan.config.js` or via environment variables.

## 🛡️ Security & Privacy

- **Local-First**: Runs entirely locally with Ollama
- **Sensitive Data Protection**: Automatically excludes API keys, passwords, and secrets
- **Configurable Exclusions**: Customize what data is sent to LLMs
- **Git Integration**: Leverages Git's built-in security features

## 📖 Documentation

- **[Getting Started Guide](./docs/getting-started.md)** - Complete setup guide
- **[CLI Reference](./docs/cli-reference.md)** - All available commands
- **[Configuration](./docs/configuration.md)** - Configuration options
- **[Recipe Development](./docs/recipes.md)** - Creating custom workflows
- **[API Documentation](./docs/api.md)** - Programmatic usage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## 📄 License

Published under the [MIT](./LICENSE) license.

## 🙏 Acknowledgments

GitVan is inspired by the growing need for AI-powered developer tools that enhance rather than replace human creativity. Special thanks to:

- The Git community for creating such a powerful foundation
- Ollama for making local LLMs accessible
- The open-source community for continuous innovation

---

**Transform your Git workflow with AI intelligence. Start with GitVan today!**
