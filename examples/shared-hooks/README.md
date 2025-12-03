# Shared Hooks Library

Production-ready GitVan hooks that work with any framework.

## Organization

### Base Hooks (`base-hooks/`)

Essential hooks for any project.

| Hook | Purpose | Trigger | Example |
|------|---------|---------|---------|
| `enforce-branch-naming.ttl` | Validate branch name format | `git checkout` | `feature/user-auth`, `bugfix/null-pointer` |
| `prevent-force-push.ttl` | Block dangerous operations | `pre-push` | Prevents `git push --force-with-lease` |
| `track-metrics.ttl` | Collect workflow metrics | All events | Tracks commits/day, authors, branches |
| `alert-on-hotfix.ttl` | Notify on hotfix commits | `post-commit` | Alerts when hotfix commits made |

### CI/CD Hooks (`ci-cd-hooks/`)

Automation for continuous integration and deployment.

| Hook | Purpose | Trigger | Example |
|------|---------|---------|---------|
| `run-tests-on-push.ttl` | Execute test suite | `post-push` | Runs `npm test` or equivalent |
| `deploy-staging.ttl` | Deploy to staging | `post-push` (develop) | Deploys to staging environment |
| `health-check.ttl` | Verify deployment | After deploy | Checks service health |
| `slack-notifications.ttl` | Send team updates | Various | Posts to Slack channel |

## Installation

### Option 1: Copy All Base Hooks

```bash
cp shared-hooks/base-hooks/*.ttl .gitvan/hooks/
gitvan hooks install --all
```

### Option 2: Copy Specific Hooks

```bash
# Just branch naming
cp shared-hooks/base-hooks/enforce-branch-naming.ttl .gitvan/hooks/
gitvan hooks install enforce-branch-naming

# Just hotfix alerts
cp shared-hooks/base-hooks/alert-on-hotfix.ttl .gitvan/hooks/
gitvan hooks install alert-on-hotfix
```

### Option 3: Copy All CI/CD Hooks

```bash
cp shared-hooks/ci-cd-hooks/*.ttl .gitvan/hooks/
gitvan hooks install --pattern "^run-tests|deploy|health|slack"
```

## Usage Examples

### Example 1: Branch Protection

Prevent direct commits to main/master:

```bash
# Copy hook
cp shared-hooks/base-hooks/enforce-branch-naming.ttl .gitvan/hooks/

# Install
gitvan hooks install enforce-branch-naming

# Try to commit to main
git checkout main
git add .
git commit -m "test"
# ❌ ERROR: Invalid branch name "main"
# Instead use: feature/*, bugfix/*, hotfix/*, release/*, docs/*

# Use proper branch
git checkout -b feature/my-change
git commit -m "feat: my change"
# ✅ SUCCESS
```

### Example 2: Prevent Accidental Force Push

```bash
# Copy hook
cp shared-hooks/base-hooks/prevent-force-push.ttl .gitvan/hooks/

# Install
gitvan hooks install prevent-force-push

# Try force push
git push --force-with-lease
# ❌ ERROR: Force push not allowed. Use --no-verify only in emergencies.

# Normal push
git push
# ✅ SUCCESS
```

### Example 3: Track Developer Metrics

```bash
# Copy hook
cp shared-hooks/base-hooks/track-metrics.ttl .gitvan/hooks/

# Install
gitvan hooks install track-metrics

# Make commits normally
git add .
git commit -m "feat: new feature"

# View metrics
gitvan metrics export --format json | jq '.daily_metrics'
# {
#   "date": "2024-12-03",
#   "commits": 5,
#   "authors": 2,
#   "branches": 3,
#   "pushes": 2
# }
```

### Example 4: CI/CD Pipeline

```bash
# Copy all CI/CD hooks
cp shared-hooks/ci-cd-hooks/*.ttl .gitvan/hooks/

# Install
gitvan hooks install --pattern "run-tests|deploy|health|slack"

# Workflow:
git add .
git commit -m "feat: new feature"
git push origin feature/new-feature

# Automatically:
# 1. run-tests-on-push → Tests execute
# 2. If develop → deploy-staging → Deploy to staging
# 3. health-check → Verify deployment
# 4. slack-notifications → Notify team
```

## Customization

### Modify a Hook

Copy and edit:

```bash
# Copy to your project
cp shared-hooks/base-hooks/enforce-branch-naming.ttl .gitvan/hooks/

# Edit pattern
sed -i 's/feature|bugfix/my-pattern/' .gitvan/hooks/enforce-branch-naming.ttl

# Reload
gitvan hooks reload enforce-branch-naming
```

### Create Variants

```bash
# Combine multiple hooks into one
cat > .gitvan/hooks/my-custom-hook.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:MyCustomHook a gh:Hook ;
  gh:name "My Custom Hook" ;
  gh:trigger [ a git:PostPushEvent ] ;
  gh:action [
    a gh:CompositeAction ;
    gh:steps [
      gh:step1 [ a gh:RunTests ] ;
      gh:step2 [ a gh:Deploy ] ;
      gh:step3 [ a gh:NotifySlack ]
    ]
  ] .
EOF

gitvan hooks install my-custom-hook
```

## Best Practices

### 1. Start Small

```bash
# Week 1: Just branch naming
gitvan hooks install enforce-branch-naming

# Week 2: Add metric tracking
gitvan hooks install track-metrics

# Week 3: Add CI/CD
gitvan hooks install run-tests-on-push
```

### 2. Team Communication

Before installing, communicate with team:
- Which hooks will be active
- What formats are required
- How to get help if issues

### 3. Monitor and Adjust

```bash
# View hook usage
gitvan metrics export --format json | jq '.hooks'

# Disable problematic hooks
gitvan hooks disable hook-name

# Review logs
gitvan logs --filter hook-name
```

### 4. Gradual Rollout

```bash
# Dry run: See what would happen
gitvan hooks run enforce-branch-naming --dry-run

# Soft mode: Report but don't block
gitvan hooks run enforce-branch-naming --report-only

# Hard mode: Block violations
gitvan hooks run enforce-branch-naming
```

## Troubleshooting

### "Hook not triggering"

```bash
# Check if installed
gitvan hooks list

# Check if condition matches
gitvan hooks debug my-hook --verbose

# Test manually
gitvan hooks run my-hook --dry-run
```

### "Too strict/loose"

```bash
# View current pattern
gitvan hooks info enforce-branch-naming

# See recent violations
gitvan hooks violations enforce-branch-naming --limit 10

# Adjust pattern
gitvan hooks config enforce-branch-naming --pattern "new-pattern"
```

### "Team resistance"

Start with advisory-only mode:

```bash
# Report violations without blocking
gitvan hooks run my-hook --report-only

# Week later: Switch to enforcement
gitvan hooks run my-hook
```

## Integration with Frameworks

Each hook can be used with:
- ✅ NextJS
- ✅ Express
- ✅ Vue/Nuxt
- ✅ Django
- ✅ Any other framework

Example workflow across all frameworks:

```bash
# All frameworks can use these hooks
cp shared-hooks/base-hooks/* .gitvan/hooks/
cp shared-hooks/ci-cd-hooks/* .gitvan/hooks/

# Framework-specific customization
# (Each framework adds its own hooks if needed)
cp nextjs-app/hooks/* .gitvan/hooks/  # NextJS specific
cp express-api/hooks/* .gitvan/hooks/  # Express specific
```

## Contributing

To add a new hook to shared-hooks:

1. Test in your project
2. Verify it works across frameworks
3. Add documentation
4. Submit pull request

## See Also

- **Framework Examples**: Each framework has its own hooks
  - [NextJS Hooks](../nextjs-app/hooks/)
  - [Express Hooks](../express-api/hooks/)
  - [Vue/Nuxt Hooks](../vue-nuxt-app/hooks/)
  - [Django Hooks](../django-api/hooks/)

- **How-To Guides**: Learn to create your own hooks
  - [Enforce Conventions](../docs/how-to/enforce-commit-conventions.md)
  - [Trigger Deployments](../docs/how-to/trigger-deployments.md)

---

**Ready to use?** Start with [Quick Start Guide](../docs/QUICK_START.md)
