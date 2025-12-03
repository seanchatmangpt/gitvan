# Tutorial 4: GitVan + Vue/Nuxt Setup

**Time**: 20 minutes
**Level**: Intermediate
**Goal**: Integrate GitVan into a Vue 3 + Nuxt 3 application

## Prerequisites

- Completed Tutorial 1: Hello GitVan
- Node.js 18+
- Familiarity with Vue 3 and Nuxt

## Part 1: Create Nuxt Project (5 minutes)

```bash
npx nuxi init my-gitvan-nuxt
cd my-gitvan-nuxt
npm install
npm install gitvan
npx gitvan init
```

## Part 2: Vue/Nuxt-Specific Hooks (5 minutes)

### Hook 1: Enforce Semantic Commits

`.gitvan/hooks/enforce-semantic-commits.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:EnforceSemanticCommits a gh:Hook ;
  gh:name "Enforce Semantic Commits" ;
  gh:description "Require semantic versioning in commits" ;

  gh:trigger [
    a git:CommitMsgEvent
  ] ;

  gh:condition [
    a gh:PatternMatch ;
    gh:pattern "(feat|fix|refactor|perf|docs|style|test|chore):" ;
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      MSG=$(cat "$1")
      TYPES="feat|fix|refactor|perf|docs|style|test|chore"
      if ! echo "$MSG" | grep -E "^($TYPES)(\(.+\))?:" > /dev/null; then
        echo "❌ Invalid commit message"
        exit 1
      fi
    """
  ] .
```

### Hook 2: Auto-Version Bumping

`.gitvan/hooks/auto-version-bump.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:AutoVersionBump a gh:Hook ;
  gh:name "Auto Version Bump" ;
  gh:description "Automatically bump version on main" ;

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
      npm run version:bump
      git add package.json
      git commit -m "chore: bump version"
    """
  ] .
```

### Hook 3: Preview Deploy

`.gitvan/hooks/preview-deploy.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:PreviewDeploy a gh:Hook ;
  gh:name "Preview Deploy" ;
  gh:description "Deploy preview on feature branch push" ;

  gh:trigger [
    a git:PostPushEvent
  ] ;

  gh:condition [
    a gh:PatternMatch ;
    gh:pattern "feature/.*" ;
  ] ;

  gh:action [
    a gh:WebhookAction ;
    gh:url "https://api.vercel.com/v13/deployments" ;
    gh:method "POST"
  ] .
```

## Part 3: Create GitVan Composable (5 minutes)

Create `composables/useGitVan.ts`:

```typescript
import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface GitVanEvent {
  type: string;
  timestamp: Date;
  author: string;
  branch: string;
  message?: string;
}

export interface GitVanMetrics {
  totalEvents: number;
  commitCount: number;
  pushCount: number;
  mergeCount: number;
}

export function useGitVan() {
  const events = ref<GitVanEvent[]>([]);
  const metrics = ref<GitVanMetrics | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isRefreshing = ref(false);

  // Fetch metrics from API
  const fetchMetrics = async () => {
    try {
      loading.value = true;
      const response = await $fetch('/api/gitvan/metrics');
      metrics.value = response;
      error.value = null;
    } catch (err) {
      error.value = (err as Error).message;
      console.error('Failed to fetch metrics:', err);
    } finally {
      loading.value = false;
    }
  };

  // Fetch recent events
  const fetchEvents = async (limit = 20) => {
    try {
      isRefreshing.value = true;
      const response = await $fetch(`/api/gitvan/events?limit=${limit}`);
      events.value = response.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
      error.value = null;
    } catch (err) {
      error.value = (err as Error).message;
      console.error('Failed to fetch events:', err);
    } finally {
      isRefreshing.value = false;
    }
  };

  // Refresh all data
  const refresh = async () => {
    await Promise.all([fetchMetrics(), fetchEvents()]);
  };

  // Computed properties
  const hasEvents = computed(() => events.value.length > 0);
  const lastEvent = computed(() => events.value[0] || null);
  const eventsByAuthor = computed(() => {
    const authors: Record<string, GitVanEvent[]> = {};
    events.value.forEach((event) => {
      if (!authors[event.author]) authors[event.author] = [];
      authors[event.author].push(event);
    });
    return authors;
  });

  // Auto-refresh on mount
  onMounted(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    onUnmounted(() => clearInterval(interval));
  });

  return {
    events,
    metrics,
    loading,
    error,
    isRefreshing,
    hasEvents,
    lastEvent,
    eventsByAuthor,
    fetchMetrics,
    fetchEvents,
    refresh,
  };
}
```

## Part 4: Create Dashboard Component (5 minutes)

Create `components/GitVanDashboard.vue`:

```vue
<template>
  <div class="gitvan-dashboard">
    <h2 class="text-2xl font-bold mb-4">📊 GitVan Dashboard</h2>

    <!-- Loading State -->
    <div v-if="loading" class="text-gray-500">
      Loading metrics...
    </div>

    <!-- Error State -->
    <div v-if="error" class="text-red-600 bg-red-50 p-4 rounded">
      ⚠️ {{ error }}
    </div>

    <!-- Metrics Grid -->
    <div v-if="metrics" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-4 rounded border">
        <div class="text-gray-600 text-sm">Total Events</div>
        <div class="text-3xl font-bold">{{ metrics.totalEvents }}</div>
      </div>

      <div class="bg-white p-4 rounded border">
        <div class="text-gray-600 text-sm">Commits</div>
        <div class="text-3xl font-bold">{{ metrics.commitCount }}</div>
      </div>

      <div class="bg-white p-4 rounded border">
        <div class="text-gray-600 text-sm">Pushes</div>
        <div class="text-3xl font-bold">{{ metrics.pushCount }}</div>
      </div>

      <div class="bg-white p-4 rounded border">
        <div class="text-gray-600 text-sm">Merges</div>
        <div class="text-3xl font-bold">{{ metrics.mergeCount }}</div>
      </div>
    </div>

    <!-- Recent Events -->
    <div class="bg-white p-4 rounded border">
      <h3 class="text-lg font-semibold mb-4">Recent Events</h3>

      <button
        @click="refresh"
        :disabled="isRefreshing"
        class="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
      </button>

      <div v-if="hasEvents" class="space-y-2 max-h-96 overflow-y-auto">
        <div
          v-for="(event, idx) in events"
          :key="idx"
          class="p-3 bg-gray-50 rounded border-l-4 border-blue-500"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-semibold">{{ event.type }}</div>
              <div class="text-sm text-gray-600">{{ event.message }}</div>
              <div class="text-xs text-gray-500 mt-1">
                by <span class="font-mono">{{ event.author }}</span>
                on <span class="font-mono">{{ event.branch }}</span>
              </div>
            </div>
            <div class="text-xs text-gray-500">
              {{ formatTime(event.timestamp) }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-gray-500">
        No events yet
      </div>
    </div>

    <!-- Events by Author -->
    <div v-if="Object.keys(eventsByAuthor).length > 0" class="mt-8">
      <h3 class="text-lg font-semibold mb-4">Events by Author</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="(authorEvents, author) in eventsByAuthor"
          :key="author"
          class="bg-white p-4 rounded border"
        >
          <div class="font-semibold mb-2">{{ author }}</div>
          <div class="text-2xl font-bold text-blue-600">
            {{ authorEvents.length }}
          </div>
          <div class="text-xs text-gray-500">events</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGitVan } from '~/composables/useGitVan';

const {
  events,
  metrics,
  loading,
  error,
  isRefreshing,
  hasEvents,
  eventsByAuthor,
  refresh,
} = useGitVan();

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString();
}
</script>

<style scoped>
.gitvan-dashboard {
  padding: 2rem;
  background: #f9fafb;
}
</style>
```

## Part 5: Create API Routes (5 minutes)

Create `server/api/gitvan/metrics.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default defineEventHandler(async () => {
  try {
    const { stdout } = await execAsync('gitvan metrics export --format json');
    return JSON.parse(stdout);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch metrics',
    });
  }
});
```

Create `server/api/gitvan/events.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
  try {
    const limit = getQuery(event).limit || '20';
    const { stdout } = await execAsync(
      `gitvan events list --limit ${limit} --format json`
    );
    return JSON.parse(stdout);
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch events',
    });
  }
});
```

## Part 6: Add to App Layout (3 minutes)

Create `app.vue`:

```vue
<template>
  <div>
    <NuxtRouteAnnouncer />
    <main>
      <GitVanDashboard />
      <NuxtPage />
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}
</style>
```

## Part 7: Test It All (3 minutes)

```bash
# Start development server
npm run dev

# In another terminal, make a commit
echo "Testing" > test.md
git add test.md
git commit -m "feat: test vue integration"

# Check dashboard at http://localhost:3000
```

## Part 8: Deploy Options (Optional)

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm run build
# Drag dist/ folder to Netlify
```

## Summary

You've successfully:
✓ Created a Nuxt 3 app with GitVan
✓ Added production-ready hooks
✓ Created a composable for GitVan integration
✓ Built a real-time dashboard component
✓ Set up API routes for metrics
✓ Tested hooks in your workflow

## Next Steps

1. **How-To Guides**: Learn more patterns
   - [Enforce Commit Conventions](../how-to/enforce-commit-conventions.md)
   - [Auto-Version Bumping](../how-to/auto-version-bumping.md)

2. **Production**: Deploy to production

3. **Learning**: Deep dive into architecture

---

**Continue to other frameworks or How-To Guides.**
