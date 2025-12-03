# GitVan + Vue 3 + Nuxt 3 Example

Production-ready Nuxt 3 application with full GitVan integration.

## Features

- ✅ Real-time GitVan dashboard
- ✅ Composable-based architecture
- ✅ Server-side event processing
- ✅ Semantic commit validation
- ✅ Auto-version bumping
- ✅ Preview deployments
- ✅ Full TypeScript support
- ✅ SSR capabilities

## Quick Start

```bash
# Install dependencies
npm install

# Initialize GitVan
npx gitvan init

# Copy hooks
cp hooks/*.ttl ../../.gitvan/hooks/

# Start development
npm run dev

# Open http://localhost:3000
```

## Features

### Real-Time Dashboard

Component: `components/GitVanDashboard.vue`

Displays:
- Total events count
- Commits, pushes, merges statistics
- Recent events stream
- Events grouped by author

### Composable Integration

File: `composables/useGitVan.ts`

Provides:
- Event fetching with reactivity
- Metrics computation
- Auto-refresh capability
- Error handling

### Server Routes

```
/server/api/gitvan/metrics.ts  - Get metrics
/server/api/gitvan/events.ts   - Get events
```

## Project Structure

```
├── app.vue                # Root component
├── app/
│   └── app.vue           # Layout
├── components/
│   └── GitVanDashboard.vue
├── composables/
│   └── useGitVan.ts
├── server/
│   └── api/
│       └── gitvan/
│           ├── metrics.ts
│           └── events.ts
├── hooks/                # GitVan hooks
│   ├── enforce-semantic-commits.ttl
│   ├── auto-version-bump.ttl
│   └── preview-deploy.ttl
└── .gitvan.json
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run generate     # Generate static site
npm run gitvan:init  # Initialize GitVan
```

## Deployment

### Deploy to Vercel

```bash
vercel
```

### Deploy to Netlify

```bash
npm run generate
# Drag dist/ to Netlify
```

### Deploy to Railway

```bash
railway init
railway up
```

## Git Workflow

```bash
# Install hooks
gitvan hooks install enforce-semantic-commits
gitvan hooks install auto-version-bump
gitvan hooks install preview-deploy

# Create feature branch
git checkout -b feature/dashboard-improvements

# Commit
git commit -m "feat(dashboard): add chart visualization"
# → Semantic format validated
# → Dashboard updates in real-time

# Push triggers preview
git push origin feature/dashboard-improvements
# → Preview deployment automatically created

# Merge to main bumps version
git checkout main
git merge feature/dashboard-improvements
# → Version automatically bumped
# → Changelog generated
# → Production deployment triggered
```

## Learn More

- [Tutorial: Vue/Nuxt Setup](../../docs/tutorials/04-vue-setup.md)
- [Reference: Git Events](../../docs/reference/git-events.md)
- [How-To: Auto-Version Bumping](../../docs/how-to/auto-version-bumping.md)

---

**Ready to deploy?** See [Trigger Deployments How-To](../../docs/how-to/trigger-deployments.md)
