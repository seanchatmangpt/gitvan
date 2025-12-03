# GitVan Quick Start - 5 Minutes

Get GitVan running in your project in 5 minutes.

## Step 1: Install (1 minute)

```bash
# Option 1: Global CLI
npm install -g gitvan
# or
pnpm add -g gitvan

# Option 2: Project dependency
npm install gitvan
pnpm add gitvan
```

Verify installation:
```bash
gitvan --version
# GitVan v3.3.0
```

## Step 2: Initialize (1 minute)

In your project directory:
```bash
gitvan init
```

This creates:
```
.gitvan/
├── .gitvanrc.json          # Configuration
├── hooks/                  # Your hooks directory
└── workflows/              # Workflow definitions
```

## Step 3: Copy Your First Hook (1 minute)

Choose a hook from `examples/shared-hooks/`:

```bash
# Option A: Enforce branch naming
cp examples/shared-hooks/base-hooks/enforce-branch-naming.ttl .gitvan/hooks/

# Option B: Prevent force push
cp examples/shared-hooks/base-hooks/prevent-force-push.ttl .gitvan/hooks/

# Option C: Track metrics
cp examples/shared-hooks/base-hooks/track-metrics.ttl .gitvan/hooks/
```

View available hooks:
```bash
gitvan hooks list
```

## Step 4: Trigger a Hook (1 minute)

Make a commit to trigger the hook:

```bash
git add .
git commit -m "feat: implement user authentication"
```

GitVan automatically:
1. Captures the git event (commit-msg)
2. Parses it as RDF triples
3. Matches against your hooks
4. Executes matching actions

Check what happened:
```bash
gitvan logs --tail 10
```

## Step 5: View Metrics (1 minute)

```bash
# Real-time dashboard
gitvan dashboard

# Export metrics
gitvan metrics export --format json
```

Output shows:
- Total events captured
- Hooks executed
- Performance metrics
- Trend analysis

---

## Next Steps

- **Framework-Specific Setup**: Follow your framework tutorial
  - [NextJS](../tutorials/02-nextjs-setup.md)
  - [Express](../tutorials/03-express-setup.md)
  - [Vue/Nuxt](../tutorials/04-vue-setup.md)
  - [Django](../tutorials/05-django-setup.md)

- **Learn More**:
  - [Hello GitVan Tutorial](./tutorials/01-hello-gitvan.md) (15 min)
  - [How-To Guides](./how-to/) (Goal-oriented)
  - [Architecture Explanation](./explanation/knowledge-hooks-architecture.md)

- **Production Use**:
  - [Enforce Commit Conventions](./how-to/enforce-commit-conventions.md)
  - [Auto-Version Bumping](./how-to/auto-version-bumping.md)
  - [Trigger Deployments](./how-to/trigger-deployments.md)

---

**Ready to go deeper?** Continue to [Hello GitVan Tutorial](./tutorials/01-hello-gitvan.md).
