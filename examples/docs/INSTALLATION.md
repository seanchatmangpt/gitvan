# Installation Guide

Complete setup instructions for integrating GitVan with your project.

## Prerequisites

- Git 2.9+
- Node.js 18+ (for npm/TypeScript examples)
- Python 3.10+ (for Django examples)
- 5-10 minutes

## Option 1: Global CLI Installation

### Install Globally

```bash
npm install -g gitvan
# or
pnpm add -g gitvan
```

Verify:
```bash
gitvan --version
# GitVan v3.3.0
```

### Initialize in Project

```bash
cd your-project
gitvan init
```

This creates:
```
.gitvan/
├── .gitvanrc.json        # Configuration
├── hooks/                # Your hooks directory
└── workflows/            # Workflow definitions
```

### Test It

```bash
# List installed hooks
gitvan hooks list

# View logs
gitvan logs

# Export metrics
gitvan metrics export --format json
```

## Option 2: Project-Level Installation

### Install as Dependency

```bash
npm install gitvan
# or
pip install gitvan  # Python
```

### Use in Scripts

`package.json`:
```json
{
  "scripts": {
    "gitvan:init": "gitvan init",
    "gitvan:hooks": "gitvan hooks list",
    "gitvan:logs": "gitvan logs --tail 20"
  }
}
```

Run:
```bash
npm run gitvan:init
npm run gitvan:hooks
npm run gitvan:logs
```

## Option 3: Docker

### Pull Image

```bash
docker pull gitvan:latest
```

### Run Container

```bash
docker run -v $(pwd):/workspace gitvan:latest init
```

Or with docker-compose:

```yaml
services:
  gitvan:
    image: gitvan:latest
    volumes:
      - .:/workspace
    working_dir: /workspace
```

```bash
docker-compose run gitvan init
```

## Framework-Specific Setup

### NextJS

```bash
cd examples/nextjs-app
npm install
npx gitvan init
npm run dev
```

See: [Tutorial: NextJS Setup](./tutorials/02-nextjs-setup.md)

### Express

```bash
cd examples/express-api
npm install
npx gitvan init
npm run dev
```

See: [Tutorial: Express Setup](./tutorials/03-express-setup.md)

### Vue/Nuxt

```bash
cd examples/vue-nuxt-app
npm install
npx gitvan init
npm run dev
```

See: [Tutorial: Vue/Nuxt Setup](./tutorials/04-vue-setup.md)

### Django

```bash
cd examples/django-api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
gitvan init
python manage.py migrate
python manage.py runserver
```

See: [Tutorial: Django Setup](./tutorials/05-django-setup.md)

## Setup Hooks

### Copy Example Hooks

```bash
# Copy all shared hooks
cp examples/shared-hooks/base-hooks/*.ttl .gitvan/hooks/

# Install them
gitvan hooks install --all
```

### Or Copy Specific Hooks

```bash
# Branch naming only
cp examples/shared-hooks/base-hooks/enforce-branch-naming.ttl .gitvan/hooks/
gitvan hooks install enforce-branch-naming

# Branch naming + metrics
cp examples/shared-hooks/base-hooks/{enforce-branch-naming,track-metrics}.ttl .gitvan/hooks/
gitvan hooks install --pattern "enforce-branch|track-metrics"
```

## Verify Installation

### Test 1: Create Commit

```bash
echo "test" > test.md
git add test.md
git commit -m "test: verify installation"

# Hooks should run automatically
```

### Test 2: View Events

```bash
gitvan events list --limit 5
```

Output should show your recent commit.

### Test 3: Check Metrics

```bash
gitvan metrics export --format json | jq .

# Should show:
# {
#   "total_events": 1,
#   "commits": 1,
#   "pushes": 0,
#   "merges": 0
# }
```

## Configuration

### Basic Config

Edit `.gitvan/.gitvanrc.json`:

```json
{
  "version": "1.0.0",
  "hooks": {
    "enable": true,
    "directory": ".gitvan/hooks"
  },
  "retention": {
    "detail_days": 90,
    "aggregate_days": 365
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

### Environment Variables

```bash
# Enable debug mode
export GITVAN_DEBUG=true

# Custom hooks directory
export GITVAN_HOOKS_DIR=./custom-hooks

# Logging
export GITVAN_LOG_LEVEL=debug

# OTEL tracing
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

## Troubleshooting

### "Command not found: gitvan"

**Solution**: Install globally or use `npx`:
```bash
npm install -g gitvan
# or
npx gitvan init
```

### "Hooks not running"

**Solution**: Check installation:
```bash
gitvan hooks list

# Should show your hooks
# If empty, copy hooks:
cp examples/shared-hooks/base-hooks/*.ttl .gitvan/hooks/
```

### "Cannot find git"

**Solution**: Ensure Git is in PATH:
```bash
which git
# Should output path to git

# If not, install Git or add to PATH
```

### "Permission denied"

**Solution**: Check permissions:
```bash
ls -la .gitvan/hooks/

# Make executable
chmod +x .gitvan/hooks/*
```

## Next Steps

1. **Quick Start**: [5-Minute Quickstart](./QUICK_START.md)

2. **Learn**: Start with tutorials
   - [Hello GitVan](./tutorials/01-hello-gitvan.md)
   - [Your Framework Setup](./tutorials/)

3. **Practice**: Follow How-To guides
   - [Enforce Commit Conventions](./how-to/enforce-commit-conventions.md)
   - [Auto-Version Bumping](./how-to/auto-version-bumping.md)
   - [Trigger Deployments](./how-to/trigger-deployments.md)

4. **Reference**: Check documentation
   - [Git Events Reference](./reference/git-events.md)
   - [SPARQL Patterns](./reference/sparql-patterns.md)

5. **Deploy**: Move to production
   - [Deployment Guide](./how-to/trigger-deployments.md)
   - [Monitoring Setup](./tutorials/06-monitoring.md)

## Getting Help

**Stuck?** Check these resources in order:

1. **Quick Start**: [5-minute guide](./QUICK_START.md)
2. **Tutorials**: Step-by-step guides for your framework
3. **How-To Guides**: Specific tasks and patterns
4. **Reference**: Technical details
5. **Explanation**: Conceptual understanding

## Common Workflows

### Workflow 1: Enforce Conventions

```bash
# Install hook
cp examples/shared-hooks/base-hooks/enforce-branch-naming.ttl .gitvan/hooks/
gitvan hooks install enforce-branch-naming

# Use it
git checkout -b feature/my-feature
git add .
git commit -m "feat: new feature"
# ✅ Hook validates branch and commit format
```

### Workflow 2: Track Metrics

```bash
# Install hook
cp examples/shared-hooks/base-hooks/track-metrics.ttl .gitvan/hooks/
gitvan hooks install track-metrics

# Make commits normally
git add .
git commit -m "feat: metric tracking active"

# View metrics
gitvan metrics export --format json | jq .daily_metrics
```

### Workflow 3: Auto-Deploy

```bash
# Install hook
cp examples/shared-hooks/ci-cd-hooks/deploy-staging.ttl .gitvan/hooks/
gitvan hooks install deploy-staging

# Push to develop
git checkout develop
git push origin develop
# ✅ Hook automatically deploys to staging
```

## Summary

You're now ready to:
- ✅ Run GitVan in your project
- ✅ Use production-ready hooks
- ✅ Track git workflow metrics
- ✅ Automate common patterns
- ✅ Deploy to production

**Next:** Start with [Quick Start](./QUICK_START.md) or your [framework tutorial](./tutorials/).

---

**Questions?** Check the [main README](../README.md) or specific tutorial for your framework.
