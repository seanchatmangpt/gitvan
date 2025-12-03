# GitVan + Django REST Framework Example

Production-ready Django application with full GitVan integration.

## Features

- ✅ Django ORM models for events
- ✅ REST API endpoints (DRF)
- ✅ Real-time event streaming
- ✅ Advanced queries (by branch, author, type)
- ✅ Admin interface integration
- ✅ Semantic commit validation
- ✅ Automated testing
- ✅ Database persistence

## Quick Start

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize GitVan
gitvan init

# Copy hooks
cp hooks/*.ttl ../../.gitvan/hooks/

# Run migrations
python manage.py makemigrations gitvan_integration
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver

# Sync events
python manage.py gitvan_sync
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gitvan/events/` | GET | List all events |
| `/api/gitvan/events/today/` | GET | Today's events |
| `/api/gitvan/events/stats/` | GET | Statistics |
| `/api/gitvan/events/by_branch/?branch=main` | GET | Branch events |
| `/api/gitvan/events/by_author/?author=john@example.com` | GET | Author events |
| `/api/gitvan/metrics/` | GET | List metrics |
| `/api/gitvan/metrics/current/` | GET | Today's metrics |
| `/api/gitvan/metrics/week/` | GET | This week's metrics |
| `/admin/` | GET | Django admin interface |

## Example Requests

```bash
# Get today's events
curl http://localhost:8000/api/gitvan/events/today/

# Get events by branch
curl http://localhost:8000/api/gitvan/events/by_branch/?branch=main

# Get statistics
curl http://localhost:8000/api/gitvan/events/stats/

# Get metrics
curl http://localhost:8000/api/gitvan/metrics/current/
```

## Project Structure

```
├── manage.py
├── gitvan_api/           # Django project
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── gitvan_integration/   # Custom app
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   ├── admin.py
│   └── management/
│       └── commands/
│           └── gitvan_sync.py
├── hooks/                # GitVan hooks
│   ├── enforce-migrations.ttl
│   ├── auto-test-suite.ttl
│   └── security-scan.ttl
└── .gitvan.json
```

## Key Files

### `gitvan_integration/models.py`
- `GitVanEvent` - Event storage model
- `GitVanMetrics` - Daily metrics aggregation

### `gitvan_integration/views.py`
- Event API endpoints
- Statistics and filtering
- Metrics endpoints

### Management Commands

```bash
# Sync events from GitVan CLI to database
python manage.py gitvan_sync

# Run in watch mode
python manage.py gitvan_sync --watch
```

## Commands

```bash
python manage.py runserver          # Start dev server
python manage.py gitvan_sync        # Sync GitVan events
python manage.py test               # Run tests
python manage.py migrate            # Run migrations
python manage.py createsuperuser    # Create admin user
```

## Django Admin

Access at: `http://localhost:8000/admin/`

Features:
- Browse all events
- Filter by type, author, branch, date
- Search by message or commit hash
- View metrics

## Git Workflow

```bash
# Install hooks
gitvan hooks install enforce-migrations
gitvan hooks install auto-test-suite
gitvan hooks install security-scan

# Create feature branch
git checkout -b feature/user-api

# Make model changes
# models.py modified → saves files

# Create migrations
python manage.py makemigrations
# → Commit triggers enforce-migrations hook
# → Hook verifies migrations exist

git add migrations/
git commit -m "feat(models): add user table"

# Push to main
git push origin feature/user-api
# → auto-test-suite runs
# → security-scan runs
# → Status reported
```

## Database Models

### GitVanEvent

```python
type             - commit, push, merge, tag
author           - email address
branch           - branch name
message          - commit/merge message
commit_hash      - full commit hash
files_changed    - count
additions        - lines added
deletions        - lines removed
timestamp        - auto-set
```

Indexes:
- timestamp
- author + timestamp
- branch + timestamp

### GitVanMetrics

```python
total_events     - daily total
commit_count     - commits that day
push_count       - pushes that day
merge_count      - merges that day
date             - date of metrics
```

## Deployment

### Deploy to Heroku

```bash
heroku create
git push heroku main
heroku run python manage.py migrate
```

### Deploy to Railway

```bash
railway init
railway up
```

### Deploy with Docker

```bash
docker build -t gitvan-django .
docker run -p 8000:8000 gitvan-django
```

## Monitoring

```bash
# Stream events as they happen
python manage.py gitvan_sync --watch

# Export to JSON
python manage.py gitvan_sync && \
  curl http://localhost:8000/api/gitvan/events/ | jq > events.json

# View statistics
curl http://localhost:8000/api/gitvan/events/stats/
```

## Learn More

- [Tutorial: Django Setup](../../docs/tutorials/05-django-setup.md)
- [Reference: Git Events](../../docs/reference/git-events.md)
- [How-To: Enforce Conventions](../../docs/how-to/enforce-commit-conventions.md)

---

**Ready to deploy?** See [Production Deployment Guide](../../docs/how-to/trigger-deployments.md)
