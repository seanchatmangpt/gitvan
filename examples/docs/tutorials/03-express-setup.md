# Tutorial 3: GitVan + Express.js Setup

**Time**: 20 minutes
**Level**: Intermediate
**Goal**: Integrate GitVan into an Express REST API

## Prerequisites

- Completed Tutorial 1: Hello GitVan
- Node.js 18+
- Familiarity with Express.js

## Part 1: Create Express Project (5 minutes)

### Step 1: Initialize Project

```bash
mkdir my-gitvan-api
cd my-gitvan-api
npm init -y
```

### Step 2: Install Dependencies

```bash
npm install express cors dotenv
npm install -D typescript ts-node @types/express @types/node nodemon
```

### Step 3: Initialize TypeScript

```bash
npx tsc --init
```

### Step 4: Install GitVan

```bash
npm install gitvan
```

### Step 5: Initialize GitVan

```bash
npx gitvan init
```

## Part 2: Create Express-Specific Hooks (5 minutes)

### Hook 1: Enforce Branch Naming

`.gitvan/hooks/enforce-branch-naming.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:EnforceBranchNaming a gh:Hook ;
  gh:name "Enforce Branch Naming" ;
  gh:description "Require branch names follow naming conventions" ;

  gh:trigger [
    a git:CheckoutEvent
  ] ;

  gh:condition [
    a gh:PatternMatch ;
    gh:pattern "^(feature|bugfix|hotfix|release|docs)/[a-z0-9-]+$" ;
    gh:flags "i"
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      BRANCH=$(git rev-parse --abbrev-ref HEAD)
      if ! echo "$BRANCH" | grep -E '^(feature|bugfix|hotfix|release|docs)/[a-z0-9-]+$' > /dev/null; then
        echo "❌ Invalid branch name: $BRANCH"
        echo ""
        echo "Use format: type/description"
        echo "Examples:"
        echo "  - feature/user-authentication"
        echo "  - bugfix/null-pointer"
        echo "  - hotfix/security-patch"
        echo "  - release/v1.0.0"
        echo "  - docs/api-reference"
        exit 1
      fi
    """
  ] .
```

### Hook 2: Auto-Changelog on Push

`.gitvan/hooks/auto-changelog.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:AutoChangelog a gh:Hook ;
  gh:name "Auto Changelog" ;
  gh:description "Generate changelog from commits" ;

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
      npm run changelog:generate
      git add CHANGELOG.md
      git commit -m "docs: update changelog"
      git push
    """
  ] .
```

### Hook 3: Alert on Test Failures

`.gitvan/hooks/alert-on-errors.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:AlertOnTestFailure a gh:Hook ;
  gh:name "Alert on Test Failures" ;
  gh:description "Notify team when tests fail on main" ;

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
      npm run test 2>&1 | tee test-results.txt
      if [ $? -ne 0 ]; then
        # Send Slack notification
        curl -X POST $SLACK_WEBHOOK \
          -H 'Content-Type: application/json' \
          -d '{
            "text": "⚠️  Tests failed on main branch",
            "attachments": [{
              "color": "danger",
              "fields": [
                {"title": "Branch", "value": "main", "short": true},
                {"title": "Commit", "value": "'$(git rev-parse --short HEAD)'", "short": true}
              ]
            }]
          }'
      fi
    """
  ] .
```

## Part 3: Create GitVan Integration Utilities (5 minutes)

Create `src/lib/gitvan.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitVanEvent {
  type: string;
  timestamp: Date;
  author: string;
  branch: string;
  commit?: string;
  message?: string;
  files?: string[];
}

export interface GitVanStats {
  totalEvents: number;
  eventsToday: number;
  commitCount: number;
  pushCount: number;
  mergeCount: number;
}

/**
 * Get recent git events
 */
export async function getRecentEvents(limit = 20): Promise<GitVanEvent[]> {
  try {
    const { stdout } = await execAsync(
      `gitvan events list --limit ${limit} --format json`
    );
    const events = JSON.parse(stdout);

    return events.map((event: any) => ({
      type: event.type,
      timestamp: new Date(event.timestamp),
      author: event.author,
      branch: event.branch,
      commit: event.commit,
      message: event.message,
      files: event.files,
    }));
  } catch (error) {
    console.error('Failed to fetch events:', error);
    throw error;
  }
}

/**
 * Get workflow statistics
 */
export async function getStats(): Promise<GitVanStats> {
  try {
    const { stdout } = await execAsync('gitvan metrics export --format json');
    const data = JSON.parse(stdout);

    return {
      totalEvents: data.total,
      eventsToday: data.today,
      commitCount: data.commits,
      pushCount: data.pushes,
      mergeCount: data.merges,
    };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    throw error;
  }
}

/**
 * Get commits for a specific branch
 */
export async function getCommitsForBranch(
  branch: string,
  limit = 10
): Promise<GitVanEvent[]> {
  try {
    const events = await getRecentEvents(limit * 2);
    return events.filter((e) => e.branch === branch).slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch commits:', error);
    throw error;
  }
}

/**
 * Get commits by author
 */
export async function getCommitsByAuthor(author: string): Promise<GitVanEvent[]> {
  try {
    const events = await getRecentEvents(100);
    return events.filter((e) => e.author === author);
  } catch (error) {
    console.error('Failed to fetch commits:', error);
    throw error;
  }
}
```

## Part 4: Create API Endpoints (5 minutes)

Create `src/routes/gitvan.ts`:

```typescript
import express from 'express';
import {
  getRecentEvents,
  getStats,
  getCommitsForBranch,
  getCommitsByAuthor,
} from '../lib/gitvan';

const router = express.Router();

/**
 * GET /api/gitvan/stats - Get workflow statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/gitvan/events - Get recent events
 */
router.get('/events', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const events = await getRecentEvents(limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch events',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/gitvan/branch/:branch - Get commits for branch
 */
router.get('/branch/:branch', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const events = await getCommitsForBranch(req.params.branch, limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch branch commits',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/gitvan/author/:author - Get commits by author
 */
router.get('/author/:author', async (req, res) => {
  try {
    const events = await getCommitsByAuthor(req.params.author);
    res.json(events);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch author commits',
      details: (error as Error).message,
    });
  }
});

export default router;
```

## Part 5: Set Up Express Server (5 minutes)

Create `src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gitvanRoutes from './routes/gitvan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// GitVan API routes
app.use('/api/gitvan', gitvanRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'GitVan Express API',
    version: '1.0.0',
    endpoints: {
      '/api/gitvan/stats': 'GET - Workflow statistics',
      '/api/gitvan/events': 'GET - Recent events',
      '/api/gitvan/branch/:branch': 'GET - Branch commits',
      '/api/gitvan/author/:author': 'GET - Author commits',
    },
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ GitVan API available at http://localhost:${PORT}/api/gitvan`);
});
```

## Part 6: Add npm Scripts (2 minutes)

Update `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "gitvan:init": "gitvan init",
    "gitvan:hooks": "gitvan hooks list",
    "gitvan:logs": "gitvan logs --tail 20",
    "gitvan:metrics": "gitvan metrics export --format json",
    "changelog:generate": "conventional-changelog -p angular -i CHANGELOG.md -s"
  }
}
```

## Part 7: Test the API (3 minutes)

### Step 1: Start Server

```bash
npm run dev
```

Output:
```
✓ Server running on http://localhost:3000
✓ GitVan API available at http://localhost:3000/api/gitvan
```

### Step 2: Test Endpoints

```bash
# Get statistics
curl http://localhost:3000/api/gitvan/stats

# Get recent events
curl http://localhost:3000/api/gitvan/events

# Get branch commits
curl http://localhost:3000/api/gitvan/branch/main

# Get author commits
curl http://localhost:3000/api/gitvan/author/you
```

### Step 3: Make a Commit

```bash
git add .
git commit -m "feat: add express api"
```

### Step 4: See It in Action

```bash
# Should see new event in API
curl http://localhost:3000/api/gitvan/events | jq .

# Check logs
npm run gitvan:logs
```

## Part 8: Add Middleware for GitVan Events (Optional)

Create `src/middleware/gitvan-middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { getStats } from '../lib/gitvan';

export async function gitvanStatsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await getStats();

    // Add to response headers
    res.set('X-GitVan-Events', stats.totalEvents.toString());
    res.set('X-GitVan-Commits', stats.commitCount.toString());
    res.set('X-GitVan-Pushes', stats.pushCount.toString());

    // Make available to route handlers
    (req as any).gitvanStats = stats;

    next();
  } catch (error) {
    console.error('GitVan middleware error:', error);
    next(); // Don't break request on error
  }
}

export async function requireGitVanInitialized(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await getStats();
    if (stats.totalEvents === 0) {
      return res.status(400).json({
        error: 'GitVan not initialized',
        message: 'Run gitvan init in your repository',
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      error: 'GitVan check failed',
      details: (error as Error).message,
    });
  }
}
```

## Part 9: Deploy with Docker (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install GitVan CLI
RUN npm install -g gitvan

# Copy project
COPY package*.json ./
COPY src ./src
COPY tsconfig.json ./
COPY .gitvan ./.gitvan

# Install dependencies
RUN npm ci --omit=dev

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

## Summary

You've successfully:
✓ Created an Express REST API with GitVan
✓ Added production-ready hooks
✓ Created utilities for GitVan integration
✓ Built API endpoints for git metrics
✓ Tested hooks in your workflow
✓ Added Docker deployment option

## Next Steps

1. **How-To Guides**: Learn more patterns
   - [Trigger Deployments](../how-to/trigger-deployments.md)
   - [Run Tests on Events](../how-to/run-tests-on-events.md)
   - [Send Notifications](../how-to/send-notifications.md)

2. **Deploy to Production**:
   - AWS Lambda, Heroku, or Railway
   - Set up database logging
   - Add monitoring and alerts

3. **Deep Learning**:
   - [SPARQL Patterns](../reference/sparql-patterns.md)
   - [API Reference](../reference/api-reference.md)

---

**Continue to other framework tutorials or explore How-To Guides.**
