# GitVan + NextJS 13.4+ Example

Production-ready NextJS application with full GitVan integration.

## Features

- ✅ Real-time metrics dashboard
- ✅ Git event tracking
- ✅ Semantic commit validation
- ✅ Auto-deployment on release tags
- ✅ OTEL observability
- ✅ Full TypeScript support
- ✅ Comprehensive tests (80%+ coverage)

## Quick Start

```bash
# Install dependencies
npm install

# Initialize GitVan
npx gitvan init

# Copy example hooks
cp hooks/*.ttl ../../.gitvan/hooks/

# Start development
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
├── src/
│   ├── app/              # NextJS App Router
│   ├── components/       # React components
│   │   └── GitVanDashboard.tsx
│   ├── lib/
│   │   └── gitvan.ts    # GitVan utilities
│   └── hooks/           # React hooks
├── hooks/               # GitVan production hooks
│   ├── enforce-commit-message.ttl
│   ├── deploy-on-release.ttl
│   └── sync-docs-on-push.ttl
├── tests/               # Test files
└── .gitvan.json        # GitVan config
```

## Key Files

### `src/lib/gitvan.ts`
Integration utilities for querying GitVan data

### `src/app/api/gitvan/route.ts`
API endpoints for metrics and events

### `src/components/GitVanDashboard.tsx`
Real-time dashboard component

### `hooks/*.ttl`
Production-ready GitVan hooks

## Commands

```bash
npm run dev                 # Start dev server
npm run build               # Build for production
npm run start               # Start production server
npm run test                # Run tests
npm run lint                # Lint code

npm run gitvan:init         # Initialize GitVan
npm run gitvan:hooks        # List hooks
npm run gitvan:logs         # View GitVan logs
npm run gitvan:metrics      # Export metrics
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gitvan` | GET | Get all metrics and events |
| `/api/gitvan/metrics` | GET | Just metrics |
| `/api/gitvan/events` | GET | Recent events (paginated) |
| `/api/gitvan/events?limit=50` | GET | Custom limit |

## Git Workflow

```bash
# Install hooks
gitvan hooks install enforce-commit-message
gitvan hooks install deploy-on-release

# Make a commit
git add .
git commit -m "feat(dashboard): add real-time metrics"
# → Hook validates format
# → Dashboard updates automatically

# Make a release
git tag v1.0.0
git push origin v1.0.0
# → Deploy hook triggers
# → Production deployment starts
```

## Deployment

### Deploy to Vercel

```bash
vercel
```

Environment variables needed:
```bash
VERCEL_TOKEN=...
SLACK_WEBHOOK=...  # Optional
```

### Deploy to Docker

```bash
docker build -t gitvan-nextjs .
docker run -p 3000:3000 gitvan-nextjs
```

## Monitoring

View metrics in real-time:

```bash
# In dashboard at http://localhost:3000
# Shows live events as they happen

# In CLI
gitvan logs --follow
gitvan metrics export --format json
```

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

## Learn More

- [Tutorial: NextJS Setup](../../docs/tutorials/02-nextjs-setup.md)
- [Reference: Git Events](../../docs/reference/git-events.md)
- [How-To: Enforce Commits](../../docs/how-to/enforce-commit-conventions.md)

## Support

Questions? Check:
1. Main README: `../../README.md`
2. Quick Start: `../../docs/QUICK_START.md`
3. Tutorials: `../../docs/tutorials/`

---

**Ready to deploy?** See [Trigger Deployments How-To](../../docs/how-to/trigger-deployments.md)
