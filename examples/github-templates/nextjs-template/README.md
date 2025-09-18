# Next.js GitVan Template

This is a GitHub template repository that creates a complete Next.js project using GitVan's autonomic system.

## What This Template Provides

- **Automatic Pack Installation**: Installs `nextjs-github-pack` automatically
- **AI-Powered Commits**: Uses Vercel AI/Ollama for commit messages
- **Autonomic Workflow**: Jobs run automatically on Git events
- **Zero Configuration**: Just `gitvan init` and everything works

## How to Use

1. **Create repository from this template**
2. **Clone your new repository**
3. **Run one command**: `gitvan init`
4. **Start coding**: Edit files and use `gitvan save`

That's it! The system will:
- Install the Next.js pack automatically
- Start the daemon
- Install Git hooks
- Run jobs automatically on commits

## The Autonomic Workflow

```bash
# After gitvan init, just:
gitvan save
# → AI generates commit message
# → Jobs run automatically
# → Next.js project created
# → Dev server started
```

## What Gets Installed

- **nextjs-github-pack**: Complete Next.js project structure
- **Jobs**: `create-next-app`, `start-next-app`
- **Templates**: Ready-to-use Next.js components
- **Configuration**: TypeScript, ESLint, Tailwind CSS

## Customization

Edit `gitvan.config.js` to:
- Add more packs to `autoInstall.packs`
- Configure AI settings
- Customize project data
- Add custom templates

This template demonstrates GitVan's **360 project lifecycle** - where everything happens automatically after initialization.
