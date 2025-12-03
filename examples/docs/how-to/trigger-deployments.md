# How-To: Trigger Deployments

**Goal**: Auto-deploy on specific git events (tags, branches, merges)
**Time**: 20 minutes
**Difficulty**: Intermediate

## Problem

Manual deployments are slow and error-prone:
- Developers forget to deploy after merging
- Staging/prod out of sync
- Deployment timing inconsistent

## Solution

GitVan hooks trigger deployments automatically on git events.

## Setup

### Step 1: Create Deployment Hook

Create `.gitvan/hooks/deploy-on-release-tag.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:DeployOnReleaseTag a gh:Hook ;
  gh:name "Deploy on Release Tag" ;
  gh:description "Deploy to production on semantic version tag" ;

  # Trigger on tag creation
  gh:trigger [
    a git:TagEvent
  ] ;

  # Only on version tags (v1.0.0, v2.3.1, etc)
  gh:condition [
    a gh:PatternMatch ;
    gh:pattern "^v[0-9]+\\.[0-9]+\\.[0-9]+" ;
  ] ;

  gh:action [
    a gh:WebhookAction ;
    gh:name "Deploy to Production" ;
    gh:url "https://api.vercel.com/v13/deployments" ;
    gh:method "POST" ;
    gh:headers [
      gh:header "Authorization" "Bearer $VERCEL_TOKEN" ;
      gh:header "Content-Type" "application/json"
    ] ;
    gh:body """
    {
      "name": "my-app",
      "gitSource": {
        "type": "git",
        "org": "myorg",
        "repo": "my-app",
        "ref": "{{ .tag }}"
      }
    }
    """
  ] .
```

### Step 2: Create Staging Hook

Create `.gitvan/hooks/deploy-to-staging.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:DeployToStaging a gh:Hook ;
  gh:name "Deploy to Staging" ;
  gh:description "Deploy to staging on push to develop" ;

  gh:trigger [
    a git:PostPushEvent
  ] ;

  gh:condition [
    a gh:BranchMatch ;
    gh:pattern "develop" ;
  ] ;

  gh:action [
    a gh:WebhookAction ;
    gh:url "https://api.railway.app/deploy" ;
    gh:method "POST" ;
    gh:headers [
      gh:header "Authorization" "Bearer $RAILWAY_TOKEN"
    ] ;
    gh:body """
    {
      "environment": "staging",
      "branch": "develop",
      "service": "api"
    }
    """
  ] .
```

### Step 3: Setup Environment Variables

Create `.env.local` (never commit!):

```bash
# Vercel (production)
VERCEL_TOKEN=your_vercel_token_here

# Railway (staging)
RAILWAY_TOKEN=your_railway_token_here

# GitHub (notifications)
GITHUB_TOKEN=your_github_token_here
```

Add to `.gitignore`:
```bash
.env.local
.env*.local
```

### Step 4: Test the Hook

#### Test with Staging

```bash
# Switch to develop
git checkout develop

# Make a change
echo "test" >> test.md
git add test.md
git commit -m "test: verify staging deployment"

# Push (triggers hook)
git push origin develop

# Watch deployment
# Railway will receive webhook and start deploy
```

#### Test with Production

```bash
# Create release tag
git tag v1.0.0

# Push tag (triggers hook)
git push origin v1.0.0

# Watch production deployment
# Vercel will receive webhook and start deploy
```

## Advanced: Conditional Deployments

Deploy to different environments based on conditions:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:SmartDeploy a gh:Hook ;
  gh:name "Smart Deploy" ;
  gh:description "Deploy to appropriate environment" ;

  gh:trigger [
    a git:PostPushEvent
  ] ;

  gh:condition [
    a gh:MultiCondition ;
    gh:conditions [
      gh:tests-pass [ a gh:TestPassCondition ] ;
      gh:linting-passes [ a gh:LintPassCondition ] ;
    ]
  ] ;

  gh:action [
    a gh:ConditionalAction ;
    gh:if [
      a gh:BranchMatch ;
      gh:pattern "main"
    ] ;
    gh:then [
      a gh:DeployAction ;
      gh:environment "production"
    ] ;
    gh:else [
      a gh:DeployAction ;
      gh:environment "staging"
    ]
  ] .
```

## Real-World Examples

### Example 1: NextJS on Vercel

```ttl
gh:DeployNextJSToVercel a gh:Hook ;
  gh:trigger [ a git:PostPushEvent ] ;
  gh:condition [ a gh:BranchMatch ; gh:pattern "main" ] ;
  gh:action [
    a gh:WebhookAction ;
    gh:url "https://api.vercel.com/v13/deployments" ;
    gh:method "POST" ;
    gh:headers [
      gh:header "Authorization" "Bearer $VERCEL_TOKEN"
    ] ;
    gh:body """
    {
      "name": "nextjs-app",
      "gitSource": {
        "type": "github",
        "repo": "myorg/nextjs-app",
        "ref": "main"
      },
      "env": {
        "ENVIRONMENT": "production"
      }
    }
    """
  ] .
```

### Example 2: Docker Image Build & Deploy

```ttl
gh:BuildAndDeployDocker a gh:Hook ;
  gh:trigger [ a git:TagEvent ] ;
  gh:condition [ a gh:PatternMatch ; gh:pattern "v.*" ] ;
  gh:action [
    a gh:ShellAction ;
    gh:script """
      TAG=$(git describe --tags --abbrev=0)

      # Build image
      docker build -t myapp:$TAG .

      # Push to registry
      docker push myapp:$TAG

      # Deploy via kubectl
      kubectl set image deployment/myapp \\
        myapp=myapp:$TAG \\
        --record

      # Wait for rollout
      kubectl rollout status deployment/myapp

      echo "✅ Deployment complete: $TAG"
    """
  ] .
```

### Example 3: Database Migrations

```ttl
gh:RunMigrationsOnDeploy a gh:Hook ;
  gh:trigger [ a git:PostPushEvent ] ;
  gh:condition [
    a gh:MultiCondition ;
    gh:changes-include "migrations/*" ;
    gh:branch "main"
  ] ;
  gh:action [
    a gh:ShellAction ;
    gh:script """
      # Run pending migrations
      npm run migrate:up

      # Verify database
      npm run db:check

      # Backup old state
      npm run db:backup
    """
  ] .
```

## Monitoring Deployments

Track deployment history:

```bash
# View deployment events
gitvan events list --type "deploy" --limit 20

# See deployments by date
gitvan metrics export | jq '.deployments | group_by(.date)'

# Find failed deployments
gitvan events search --pattern "deploy.*failed"

# Track deployment frequency
gitvan metrics export --since 1w | jq '.deployments | length'
```

## Rollback Strategy

When something goes wrong:

```ttl
gh:MonitorForFailure a gh:Hook ;
  gh:trigger [ a gh:HealthCheckFailEvent ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      # Get previous working tag
      PREV_TAG=$(git tag --sort=-version:refname | head -n 2 | tail -n 1)

      # Rollback to previous
      kubectl rollout undo deployment/myapp

      # Notify team
      curl -X POST $SLACK_WEBHOOK \\
        -d '{"text":"Deployment rolled back to '$PREV_TAG'"}'
    """
  ] .
```

## Common Issues

### "Deployment not triggering"
**Solution**: Check hook is installed:
```bash
gitvan hooks list
gitvan hooks debug deploy-on-release-tag --verbose
```

### "Authentication failures"
**Solution**: Verify tokens:
```bash
# Check if token is set
echo $VERCEL_TOKEN

# Test API call manually
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v13/deployments
```

### "Wrong environment deployed"
**Solution**: Verify branch condition:
```bash
# Check current branch
git rev-parse --abbrev-ref HEAD

# Test condition manually
gitvan hooks run deploy-on-release-tag --dry-run
```

## Benefits

✅ **Automatic**: No manual deployments
✅ **Fast**: Deploy seconds after push
✅ **Reliable**: Same process every time
✅ **Auditable**: Every deployment tracked
✅ **Reversible**: Rollback available

## Next Steps

1. **Monitoring**: [Setup OTEL observability](../tutorials/06-monitoring.md)
2. **Notifications**: [Send Slack alerts](./send-notifications.md)
3. **Testing**: [Run tests before deploy](./run-tests-on-events.md)

---

**Continue to other How-To Guides.**
