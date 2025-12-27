# GitVan v4 Migration Guide

This guide helps you migrate from GitVan v2/v3 to the new hooks-based v4 API.

## Overview

GitVan v4 introduces a completely new hooks-based reactive API system, inspired by `@unrdf/hooks` patterns. The new API provides:

- **Reactive Signals**: Fine-grained reactivity for state management
- **Dependency Injection**: Scoped providers with automatic cleanup
- **Composable Hooks**: Reusable logic patterns
- **Type-Safe Builders**: Fluent API builders for routes and requests
- **Error Boundaries**: Automatic error handling and recovery

## Quick Start

### Installation

```bash
npm install @gitvan/v4
```

### Basic Usage

```typescript
import {
  initGitVan,
  runInContext,
  useGit,
  useJob,
  signal,
  effect,
} from '@gitvan/v4';

// Initialize GitVan
const { context, cleanup } = await initGitVan({
  root: process.cwd(),
});

// Run code in context
runInContext(context, () => {
  const git = useGit();
  console.log('Current branch:', git.branch);
});

// Cleanup when done
await cleanup();
```

## Migration Patterns

### 1. State Management

**Before (v2/v3):**
```typescript
// Mutable state
let count = 0;
function increment() {
  count++;
  notifySubscribers();
}
```

**After (v4):**
```typescript
import { signal, effect } from '@gitvan/v4';

// Reactive signal
const count = signal(0);

// Auto-runs when count changes
effect(() => {
  console.log('Count is:', count());
});

// Update value
count.set(count() + 1);
// Or use update
count.update(n => n + 1);
```

### 2. API Handlers

**Before (v2/v3):**
```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**After (v4):**
```typescript
import {
  createRouter,
  createRouterHandler,
  useErrorBoundary,
} from '@gitvan/v4';

const router = createRouter();

router.get('/data')
  .output(DataSchema)
  .handler(async (req) => {
    const data = await fetchData();
    return { success: true, data };
  });

export const handler = createRouterHandler(router);
```

### 3. Dependency Injection

**Before (v2/v3):**
```typescript
// Global singletons
const logger = new Logger();
const database = new Database();

export function getUsers() {
  logger.info('Fetching users');
  return database.query('SELECT * FROM users');
}
```

**After (v4):**
```typescript
import {
  token,
  createContext,
  provide,
  inject,
  runInContext,
} from '@gitvan/v4';

// Define tokens
const LoggerToken = token<Logger>('logger');
const DatabaseToken = token<Database>('database');

// Create context with providers
const ctx = createContext();
provide(ctx, LoggerToken, new Logger());
provide(ctx, DatabaseToken, new Database());

// Use in functions
function getUsers() {
  const logger = inject(LoggerToken);
  const database = inject(DatabaseToken);

  logger.info('Fetching users');
  return database.query('SELECT * FROM users');
}

// Run in context
runInContext(ctx, () => {
  const users = getUsers();
});
```

### 4. Middleware

**Before (v2/v3):**
```typescript
function withAuth(handler) {
  return async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = await validateToken(token);
    return handler(req, res);
  };
}

export default withAuth(async (req, res) => {
  // Handler code
});
```

**After (v4):**
```typescript
import {
  createPipeline,
  defineMiddleware,
  createHandler,
} from '@gitvan/v4';

const authMiddleware = defineMiddleware({
  name: 'auth',
  priority: 'high',
  handler: async (request, next) => {
    const token = request.headers.authorization;
    if (!token) {
      return {
        status: 401,
        body: { error: 'Unauthorized' },
      };
    }
    request.meta.user = await validateToken(token);
    return next();
  },
});

const pipeline = createPipeline();
pipeline.use(authMiddleware);

const handler = createHandler(async (ctx) => {
  const user = ctx.request.meta.user;
  // Handler code
});
```

### 5. Error Handling

**Before (v2/v3):**
```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  console.error('Error:', error);
  // Manual retry logic
  for (let i = 0; i < 3; i++) {
    try {
      return await riskyOperation();
    } catch {
      await sleep(1000 * (i + 1));
    }
  }
  throw error;
}
```

**After (v4):**
```typescript
import { useErrorBoundary } from '@gitvan/v4';

const boundary = useErrorBoundary({
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
  onError: (error) => console.error('Error:', error),
});

const result = await boundary.wrap(() => riskyOperation());

if (boundary.state.hasError) {
  console.log('Failed after retries:', boundary.state.error);
}
```

### 6. Git Operations

**Before (v2/v3):**
```typescript
import { useGit } from 'gitvan';

const git = useGit();
const branch = git.branch();
const head = git.head();
```

**After (v4):**
```typescript
import { useGit } from '@gitvan/v4';

const git = useGit();

// Reactive properties
console.log('Branch:', git.branch);
console.log('Head:', git.head);
console.log('Is dirty:', git.isDirty);

// Subscribe to events
git.onCommit((commit) => {
  console.log('New commit:', commit.hash);
});

// Async operations
const status = await git.run(['status', '--short']);
```

### 7. Job Execution

**Before (v2/v3):**
```typescript
import { runJobWithContext } from 'gitvan';

const result = await runJobWithContext(ctx, job, payload);
if (!result.ok) {
  console.error('Job failed:', result.stderr);
}
```

**After (v4):**
```typescript
import { useJob } from '@gitvan/v4';

const { run, state, cancel } = useJob();

// Subscribe to events
state.onProgress((info) => {
  console.log(`${info.stage}: ${info.percentage}%`);
});

// Run job
try {
  const result = await run(job, ctx);
  console.log('Job completed:', result.data);
} catch (error) {
  console.error('Job failed:', error);
}

// Check state reactively
if (state.isRunning) {
  cancel();
}
```

### 8. Template Rendering

**Before (v2/v3):**
```typescript
import { useTemplate } from 'gitvan';

const template = useTemplate({ autoescape: true });
const html = template.render('<h1>{{ title }}</h1>', { title: 'Hello' });
```

**After (v4):**
```typescript
import { useTemplate } from '@gitvan/v4';

const template = useTemplate();

// Inline rendering
const html = template.render('<h1>{{ title }}</h1>', { title: 'Hello' });

// File rendering with caching
const content = await template.renderFile('email.njk', { user }, {
  cache: true,
});

// Check loading state
if (template.isLoading) {
  console.log('Rendering...');
}
```

## New Features in v4

### Computed Signals

```typescript
import { signal, computed } from '@gitvan/v4';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"
firstName.set('Jane');
console.log(fullName()); // "Jane Doe"
```

### Resource Management

```typescript
import { useResource } from '@gitvan/v4';

const users = useResource(
  async () => fetch('/api/users').then(r => r.json()),
  {
    refetchInterval: 30000, // Refetch every 30 seconds
    onError: (error) => console.error('Failed to fetch users:', error),
  }
);

// Access data
const userList = users();

// Check loading state
if (users.loading()) {
  console.log('Loading...');
}

// Manual refetch
await users.refetch();
```

### Workflow Orchestration

```typescript
import { useWorkflow } from '@gitvan/v4';

const workflow = useWorkflow([
  {
    id: 'validate',
    name: 'Validate Input',
    handler: async (ctx) => {
      return validateInput(ctx.previousResults);
    },
  },
  {
    id: 'process',
    name: 'Process Data',
    handler: async (ctx) => {
      const validated = ctx.previousResults.get('validate');
      return processData(validated);
    },
    onError: 'retry',
    retries: 3,
  },
  {
    id: 'notify',
    name: 'Send Notification',
    handler: async (ctx) => {
      const processed = ctx.previousResults.get('process');
      return sendNotification(processed);
    },
  },
]);

// Run workflow
const results = await workflow.run();

// Check state
console.log('Completed steps:', workflow.state.completedSteps);
console.log('Errors:', workflow.state.errors);
```

### Event System

```typescript
import { useEvents } from '@gitvan/v4';

const events = useEvents<{
  userCreated: { id: string; name: string };
  userDeleted: { id: string };
}>();

// Subscribe
const unsubscribe = events.on('userCreated', (user) => {
  console.log('User created:', user.name);
});

// Emit
events.emit('userCreated', { id: '123', name: 'John' });

// One-time subscription
events.once('userDeleted', (data) => {
  console.log('User deleted:', data.id);
});
```

## Backwards Compatibility

v4 provides compatibility wrappers for common v2/v3 patterns:

```typescript
import { createLegacyAdapter } from '@gitvan/v4/compat';

// Wrap v2 API
const legacyGit = createLegacyAdapter(useGit);

// Use old-style API
const branch = legacyGit.branch(); // Works like v2
```

## Type Changes

### New Type Imports

```typescript
// v4 types
import type {
  Signal,
  WritableSignal,
  ComputedSignal,
  HookContext,
  ApiRequest,
  ApiResponse,
  Middleware,
  ErrorBoundary,
} from '@gitvan/v4';
```

### Updated Job Types

```typescript
// v2/v3
interface JobResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
}

// v4
interface JobResult {
  success: boolean;
  exitCode: number;
  stdout?: string;
  stderr?: string;
  duration: number;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
```

## Breaking Changes

1. **Imports**: All imports now come from `@gitvan/v4`
2. **Context Required**: Most hooks require running in a context
3. **Reactive State**: State is no longer mutable directly
4. **Async Initialization**: `initGitVan()` is async
5. **Middleware Signature**: Middleware uses new pipeline pattern
6. **Error Types**: New error class hierarchy

## Performance Considerations

- Signals are lazily computed
- Batched updates minimize re-renders
- Context cleanup prevents memory leaks
- Middleware pipeline is optimized for common patterns

## Troubleshooting

### "No context available" Error

Ensure you're running code inside `runInContext()`:

```typescript
runInContext(context, () => {
  const git = useGit(); // Now works
});
```

### "Dependency not found" Error

Make sure to provide dependencies before injecting:

```typescript
provide(context, MyToken, myValue);
runInContext(context, () => {
  const value = inject(MyToken); // Now works
});
```

### Signals Not Updating

Check that you're reading the signal value:

```typescript
const count = signal(0);

// Wrong - reading old value
console.log(count); // [Object]

// Correct - calling to get value
console.log(count()); // 0
```

## Support

For migration assistance:
- GitHub Issues: https://github.com/gitvan/gitvan/issues
- Documentation: https://gitvan.dev/docs/v4
- Discord: https://discord.gg/gitvan
