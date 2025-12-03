# Tutorial 2: GitVan + NextJS Setup

**Time**: 20 minutes
**Level**: Beginner
**Goal**: Integrate GitVan into a NextJS 13.4+ project

## Prerequisites

- Completed Tutorial 1: Hello GitVan
- NextJS 13.4+ project (or create: `npx create-next-app@latest`)
- Node.js 18+

## Part 1: Project Setup (5 minutes)

### Step 1: Create NextJS Project

```bash
npx create-next-app@latest my-gitvan-app \
  --typescript \
  --tailwind \
  --app \
  --no-eslint
cd my-gitvan-app
```

### Step 2: Install GitVan

```bash
npm install gitvan
npm install -D @vercel/analytics  # For deployment tracking
```

### Step 3: Initialize GitVan

```bash
npx gitvan init
```

Creates:
```
.gitvan/
├── .gitvanrc.json
├── hooks/
└── workflows/
```

## Part 2: Copy Framework-Specific Hooks (5 minutes)

Copy production-ready NextJS hooks:

```bash
cp examples/nextjs-app/hooks/*.ttl .gitvan/hooks/
```

Or copy manually:

### Hook 1: Enforce Commit Message Format

`.gitvan/hooks/enforce-commit-message.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:EnforceCommitFormat a gh:Hook ;
  gh:name "Enforce Commit Format" ;
  gh:description "Require semantic commit format for NextJS" ;

  gh:trigger [
    a git:CommitMsgEvent
  ] ;

  gh:condition [
    a gh:PatternMatch ;
    gh:pattern "(feat|fix|docs|style|refactor|perf|test|chore|build)(\\(.*\\))?:\\s.{10,}" ;
    gh:flags "i"
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      MSG=$(cat "$1")
      if ! echo "$MSG" | grep -E '(feat|fix|docs|style|refactor|perf|test|chore|build)(\(.*\))?:\s' > /dev/null; then
        echo "❌ Invalid commit format"
        echo ""
        echo "Use: type(scope): message"
        echo ""
        echo "Types: feat, fix, docs, style, refactor, perf, test, chore, build"
        echo "Example: feat(auth): add login page"
        exit 1
      fi
    """
  ] .
```

### Hook 2: Auto-Deploy on Release

`.gitvan/hooks/deploy-on-release.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:DeployOnRelease a gh:Hook ;
  gh:name "Deploy on Release" ;
  gh:description "Auto-deploy NextJS app on version tag" ;

  gh:trigger [
    a git:TagEvent
  ] ;

  gh:condition [
    a gh:PatternMatch ;
    gh:pattern "v[0-9]+\\.[0-9]+\\.[0-9]+"  # Semantic versioning
  ] ;

  gh:action [
    a gh:WebhookAction ;
    gh:url "https://vercel.com/deploy" ;
    gh:method "POST" ;
    gh:headers [
      gh:header "Authorization" "Bearer $VERCEL_TOKEN"
    ]
  ] .
```

### Hook 3: Sync Docs on Push

`.gitvan/hooks/sync-docs-on-push.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:SyncDocsOnPush a gh:Hook ;
  gh:name "Sync Docs on Push" ;
  gh:description "Update documentation after push to main" ;

  gh:trigger [
    a git:PostPushEvent
  ] ;

  gh:condition [
    a gh:BranchMatch ;
    gh:pattern "main"
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      npm run build:docs
      npm run publish:docs
      echo "✅ Documentation updated"
    """
  ] .
```

## Part 3: Create GitVan Integration Utilities (5 minutes)

Create `src/lib/gitvan.ts`:

```typescript
// Utilities for interacting with GitVan in your NextJS app

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitVanMetrics {
  totalEvents: number;
  hooksExecuted: number;
  avgLatency: number;
  lastEvent: Date;
}

export interface GitVanEvent {
  type: string;
  author: string;
  timestamp: Date;
  branch: string;
  message?: string;
  files?: string[];
}

/**
 * Get GitVan metrics from the last hour
 */
export async function getGitVanMetrics(): Promise<GitVanMetrics> {
  try {
    const { stdout } = await execAsync('gitvan metrics export --format json --since 1h');
    const data = JSON.parse(stdout);

    return {
      totalEvents: data.total,
      hooksExecuted: data.hooks,
      avgLatency: data.avgLatency,
      lastEvent: new Date(data.lastEvent),
    };
  } catch (error) {
    console.error('Failed to fetch GitVan metrics:', error);
    throw error;
  }
}

/**
 * Get recent git events captured by GitVan
 */
export async function getRecentEvents(limit = 10): Promise<GitVanEvent[]> {
  try {
    const { stdout } = await execAsync(`gitvan events list --limit ${limit} --format json`);
    const events = JSON.parse(stdout);

    return events.map((event: any) => ({
      type: event.type,
      author: event.author,
      timestamp: new Date(event.timestamp),
      branch: event.branch,
      message: event.message,
      files: event.files,
    }));
  } catch (error) {
    console.error('Failed to fetch events:', error);
    throw error;
  }
}

/**
 * Run a specific hook manually
 */
export async function runHook(hookName: string): Promise<void> {
  try {
    await execAsync(`gitvan hooks run ${hookName}`);
    console.log(`✓ Hook executed: ${hookName}`);
  } catch (error) {
    console.error(`✗ Hook failed: ${hookName}`, error);
    throw error;
  }
}

/**
 * Get all installed hooks
 */
export async function getInstalledHooks(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('gitvan hooks list --format json');
    const data = JSON.parse(stdout);
    return data.map((hook: any) => hook.name);
  } catch (error) {
    console.error('Failed to fetch hooks:', error);
    throw error;
  }
}
```

## Part 4: Create API Route for Metrics (5 minutes)

Create `src/app/api/gitvan/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getGitVanMetrics, getRecentEvents } from '@/lib/gitvan';

export const runtime = 'nodejs';

/**
 * GET /api/gitvan - Get GitVan metrics and recent events
 */
export async function GET() {
  try {
    const [metrics, events] = await Promise.all([
      getGitVanMetrics(),
      getRecentEvents(10),
    ]);

    return NextResponse.json({
      metrics,
      events,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitVan data' },
      { status: 500 }
    );
  }
}
```

## Part 5: Create Dashboard Component (5 minutes)

Create `src/components/GitVanDashboard.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';

interface Metrics {
  totalEvents: number;
  hooksExecuted: number;
  avgLatency: number;
  lastEvent: string;
}

export default function GitVanDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/gitvan');
        const data = await res.json();
        setMetrics(data.metrics);
      } catch (err) {
        setError('Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading GitVan metrics...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!metrics) return <div>No metrics available</div>;

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
      <div className="bg-white p-4 rounded border">
        <div className="text-gray-600 text-sm">Total Events</div>
        <div className="text-3xl font-bold">{metrics.totalEvents}</div>
      </div>

      <div className="bg-white p-4 rounded border">
        <div className="text-gray-600 text-sm">Hooks Executed</div>
        <div className="text-3xl font-bold">{metrics.hooksExecuted}</div>
      </div>

      <div className="bg-white p-4 rounded border">
        <div className="text-gray-600 text-sm">Avg Latency</div>
        <div className="text-3xl font-bold">{metrics.avgLatency}ms</div>
      </div>

      <div className="bg-white p-4 rounded border">
        <div className="text-gray-600 text-sm">Last Event</div>
        <div className="text-sm font-mono">{metrics.lastEvent}</div>
      </div>
    </div>
  );
}
```

## Part 6: Add to Page (2 minutes)

Edit `src/app/page.tsx`:

```typescript
import GitVanDashboard from '@/components/GitVanDashboard';

export default function Home() {
  return (
    <main className="min-h-screen p-24">
      <h1 className="text-4xl font-bold mb-8">NextJS + GitVan</h1>
      <GitVanDashboard />
    </main>
  );
}
```

## Part 7: Test It All (3 minutes)

### Step 1: Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Step 2: Make a Commit

```bash
echo "Testing GitVan" > test.md
git add test.md
git commit -m "feat: add gitvan dashboard"
```

### Step 3: See It Happen

- Commit message validation runs (enforce-commit-message hook)
- Dashboard updates on page (real-time metrics)
- Event appears in logs

### Step 4: View Metrics

```bash
gitvan logs --tail 20
gitvan metrics export --format json | jq .
```

## Part 8: Environment Setup (Optional)

Create `.env.local`:

```bash
# Vercel deployment token (for deploy-on-release hook)
VERCEL_TOKEN=your_token_here

# GitVan configuration
GITVAN_DEBUG=false
GITVAN_RETENTION_DAYS=90
```

## Part 9: CI/CD Integration (Optional)

Create `.github/workflows/gitvan-on-push.yml`:

```yaml
name: GitVan CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  gitvan-hooks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run GitVan hooks
        run: |
          npx gitvan hooks list
          npx gitvan hooks run enforce-commit-message

      - name: Build NextJS
        run: npm run build

      - name: Export metrics
        run: npx gitvan metrics export --format json > metrics.json

      - name: Upload metrics
        uses: actions/upload-artifact@v3
        with:
          name: gitvan-metrics
          path: metrics.json
```

## Summary

You've successfully:
✓ Created a NextJS project with GitVan
✓ Added production-ready hooks
✓ Created utilities for GitVan integration
✓ Built a real-time dashboard
✓ Tested hooks in your workflow
✓ Set up CI/CD integration

## Next Steps

1. **How-To Guides**: Extend with more patterns
   - [Enforce Commit Conventions](../how-to/enforce-commit-conventions.md)
   - [Auto-Version Bumping](../how-to/auto-version-bumping.md)
   - [Trigger Deployments](../how-to/trigger-deployments.md)

2. **Production Deployment**:
   - Deploy to Vercel
   - Add monitoring and alerts
   - Scale to teams

3. **Deep Learning**:
   - [Architecture Explanation](../explanation/knowledge-hooks-architecture.md)
   - [SPARQL Patterns](../reference/sparql-patterns.md)

## Troubleshooting

### Hooks not running?
```bash
# Check if installed
gitvan hooks list

# Debug specific hook
gitvan hooks debug enforce-commit-message --verbose
```

### Dashboard not updating?
```bash
# Check API
curl http://localhost:3000/api/gitvan

# View logs
gitvan logs --follow
```

### Deployment not working?
```bash
# Check Vercel token
echo $VERCEL_TOKEN

# Test hook
gitvan hooks run deploy-on-release --dry-run
```

---

**Continue to other framework tutorials or explore How-To Guides.**
