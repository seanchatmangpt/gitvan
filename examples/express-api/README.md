# GitVan + Express.js Example

Production-ready Express REST API with full GitVan integration.

## Features

- ✅ REST API endpoints for git metrics
- ✅ Event stream and statistics
- ✅ Branch and author filtering
- ✅ Semantic commit validation
- ✅ Automated changelog generation
- ✅ Alert on test failures
- ✅ Full TypeScript support
- ✅ Error handling and monitoring

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

# Test API
curl http://localhost:3000/api/gitvan/stats
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/api/gitvan/stats` | GET | Workflow statistics |
| `/api/gitvan/events` | GET | Recent events (limit param) |
| `/api/gitvan/branch/:branch` | GET | Branch commits |
| `/api/gitvan/author/:author` | GET | Author commits |

## Example Requests

```bash
# Get statistics
curl http://localhost:3000/api/gitvan/stats | jq

# Get recent events
curl http://localhost:3000/api/gitvan/events?limit=10 | jq

# Get branch commits
curl http://localhost:3000/api/gitvan/branch/main | jq

# Get author commits
curl http://localhost:3000/api/gitvan/author/john@example.com | jq
```

## Project Structure

```
├── src/
│   ├── server.ts          # Express app
│   ├── lib/
│   │   └── gitvan.ts     # GitVan utilities
│   ├── routes/
│   │   └── gitvan.ts     # API routes
│   └── middleware/
│       └── gitvan-middleware.ts
├── hooks/                 # GitVan hooks
│   ├── enforce-branch-naming.ttl
│   ├── auto-changelog.ttl
│   └── alert-on-errors.ttl
├── tests/
└── .gitvan.json
```

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Build TypeScript
npm run start         # Start production
npm run test          # Run tests
npm run lint          # Lint code
npm run gitvan:init   # Initialize GitVan
```

## Git Workflow

```bash
# Install hooks
gitvan hooks install enforce-branch-naming
gitvan hooks install auto-changelog
gitvan hooks install alert-on-errors

# Create feature branch
git checkout -b feature/new-endpoint
# → Branch naming hook validates format

# Make commits
git commit -m "feat(api): add new endpoint"

# Push to trigger CI/CD
git push origin feature/new-endpoint
# → Tests run automatically
# → Changelog updates
# → On error, Slack notification sent
```

## Deployment

### Deploy to Railway

```bash
railway init
railway up
```

### Deploy to Heroku

```bash
heroku create
git push heroku main
```

### Deploy with Docker

```bash
docker build -t gitvan-express .
docker run -p 3000:3000 gitvan-express
```

## Monitoring

```bash
# Stream logs
npm run gitvan:logs

# View metrics
npm run gitvan:metrics

# Export data
gitvan events list --format json > events.json
```

## Testing

```bash
npm run test
npm run test -- --coverage
npm run test -- --watch
```

## Learn More

- [Tutorial: Express Setup](../../docs/tutorials/03-express-setup.md)
- [Reference: Git Events](../../docs/reference/git-events.md)
- [How-To: Trigger Deployments](../../docs/how-to/trigger-deployments.md)

---

**Ready to deploy?** Check [Production Deployment Guide](../../docs/how-to/trigger-deployments.md)
