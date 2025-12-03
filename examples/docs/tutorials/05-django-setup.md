# Tutorial 5: GitVan + Django Setup

**Time**: 20 minutes
**Level**: Intermediate
**Goal**: Integrate GitVan into a Django REST Framework project

## Prerequisites

- Completed Tutorial 1: Hello GitVan
- Python 3.10+
- Familiarity with Django and DRF

## Part 1: Create Django Project (5 minutes)

```bash
mkdir my-gitvan-django
cd my-gitvan-django
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install django djangorestframework python-dotenv
pip install gitvan  # Or: npm install -g gitvan
django-admin startproject gitvan_api .
python manage.py startapp gitvan_integration

# Initialize GitVan
gitvan init
```

## Part 2: Django-Specific Hooks (5 minutes)

### Hook 1: Enforce Migrations

`.gitvan/hooks/enforce-migrations.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:EnforceMigrations a gh:Hook ;
  gh:name "Enforce Migrations" ;
  gh:description "Require migrations for model changes" ;

  gh:trigger [
    a git:CommitMsgEvent
  ] ;

  gh:condition [
    a gh:FileMatch ;
    gh:pattern ".*models\\.py$"
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
      MODELS_CHANGED=$(git diff --cached --name-only | grep -c models.py || true)
      MIGRATIONS_CHANGED=$(git diff --cached --name-only | grep -c migrations || true)

      if [ $MODELS_CHANGED -gt 0 ] && [ $MIGRATIONS_CHANGED -eq 0 ]; then
        echo "❌ Models changed but no migrations created"
        echo ""
        echo "Create migrations with:"
        echo "  python manage.py makemigrations"
        echo "  git add migrations/"
        exit 1
      fi
    """
  ] .
```

### Hook 2: Auto-Test Suite

`.gitvan/hooks/auto-test-suite.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:AutoTestSuite a gh:Hook ;
  gh:name "Auto Test Suite" ;
  gh:description "Run tests on push to main" ;

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
      python manage.py test --verbosity=2
      if [ $? -ne 0 ]; then
        echo "⚠️  Tests failed"
        exit 1
      fi
      echo "✅ All tests passed"
    """
  ] .
```

### Hook 3: Security Scan

`.gitvan/hooks/security-scan.ttl`:

```ttl
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:SecurityScan a gh:Hook ;
  gh:name "Security Scan" ;
  gh:description "Run Django security checks" ;

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
      python manage.py check --deploy
      echo "✅ Security checks passed"
    """
  ] .
```

## Part 3: Create GitVan Integration Module (5 minutes)

Create `gitvan_integration/models.py`:

```python
from django.db import models

class GitVanEvent(models.Model):
    """Store GitVan events in database"""
    EVENT_TYPES = [
        ('commit', 'Commit'),
        ('push', 'Push'),
        ('merge', 'Merge'),
        ('tag', 'Tag'),
    ]

    type = models.CharField(max_length=20, choices=EVENT_TYPES)
    author = models.CharField(max_length=200)
    branch = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    commit_hash = models.CharField(max_length=40, blank=True)
    files_changed = models.IntegerField(default=0)
    additions = models.IntegerField(default=0)
    deletions = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['author', '-timestamp']),
            models.Index(fields=['branch', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.type} by {self.author} on {self.branch}"


class GitVanMetrics(models.Model):
    """Track aggregated metrics"""
    total_events = models.IntegerField(default=0)
    commit_count = models.IntegerField(default=0)
    push_count = models.IntegerField(default=0)
    merge_count = models.IntegerField(default=0)
    date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Metrics for {self.date}"
```

Create `gitvan_integration/serializers.py`:

```python
from rest_framework import serializers
from .models import GitVanEvent, GitVanMetrics

class GitVanEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = GitVanEvent
        fields = ['id', 'type', 'author', 'branch', 'message', 'commit_hash',
                  'files_changed', 'additions', 'deletions', 'timestamp']
        read_only_fields = ['timestamp']


class GitVanMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GitVanMetrics
        fields = ['total_events', 'commit_count', 'push_count', 'merge_count', 'date']
        read_only_fields = ['date']
```

Create `gitvan_integration/views.py`:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from .models import GitVanEvent, GitVanMetrics
from .serializers import GitVanEventSerializer, GitVanMetricsSerializer


class GitVanEventViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for GitVan events"""
    queryset = GitVanEvent.objects.all()
    serializer_class = GitVanEventSerializer

    @action(detail=False, methods=['get'])
    def by_branch(self, request):
        """Get events for a specific branch"""
        branch = request.query_params.get('branch')
        if not branch:
            return Response({'error': 'branch parameter required'}, status=400)

        events = GitVanEvent.objects.filter(branch=branch)
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_author(self, request):
        """Get events by specific author"""
        author = request.query_params.get('author')
        if not author:
            return Response({'error': 'author parameter required'}, status=400)

        events = GitVanEvent.objects.filter(author=author)
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's events"""
        today = timezone.now().date()
        events = GitVanEvent.objects.filter(
            timestamp__date=today
        )
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get event statistics"""
        last_24h = timezone.now() - timedelta(hours=24)
        events = GitVanEvent.objects.filter(timestamp__gte=last_24h)

        stats = {
            'total': events.count(),
            'by_type': dict(events.values('type').annotate(count=Count('id')).values_list('type', 'count')),
            'by_author': dict(events.values('author').annotate(count=Count('id')).values_list('author', 'count')),
            'by_branch': dict(events.values('branch').annotate(count=Count('id')).values_list('branch', 'count')),
        }
        return Response(stats)


class GitVanMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for GitVan metrics"""
    queryset = GitVanMetrics.objects.all()
    serializer_class = GitVanMetricsSerializer

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get today's metrics"""
        today = timezone.now().date()
        metrics, created = GitVanMetrics.objects.get_or_create(date=today)
        serializer = self.get_serializer(metrics)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def week(self, request):
        """Get metrics for past week"""
        week_ago = timezone.now().date() - timedelta(days=7)
        metrics = GitVanMetrics.objects.filter(date__gte=week_ago)
        serializer = self.get_serializer(metrics, many=True)
        return Response(serializer.data)
```

## Part 4: Add URL Routing (3 minutes)

Create `gitvan_integration/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GitVanEventViewSet, GitVanMetricsViewSet

router = DefaultRouter()
router.register(r'events', GitVanEventViewSet, basename='event')
router.register(r'metrics', GitVanMetricsViewSet, basename='metrics')

urlpatterns = [
    path('', include(router.urls)),
]
```

Update `gitvan_api/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/gitvan/', include('gitvan_integration.urls')),
]
```

## Part 5: Create Management Command (3 minutes)

Create `gitvan_integration/management/commands/gitvan_sync.py`:

```python
from django.core.management.base import BaseCommand
from django.utils import timezone
from gitvan_integration.models import GitVanEvent, GitVanMetrics
import json
import subprocess


class Command(BaseCommand):
    help = 'Sync GitVan events from CLI into database'

    def handle(self, *args, **options):
        try:
            # Get latest events from GitVan CLI
            result = subprocess.run(
                ['gitvan', 'events', 'list', '--format', 'json', '--limit', '100'],
                capture_output=True,
                text=True,
                check=True
            )

            events_data = json.loads(result.stdout)
            created_count = 0

            for event_data in events_data:
                # Skip if already exists
                if GitVanEvent.objects.filter(
                    commit_hash=event_data.get('commit'),
                    type=event_data.get('type')
                ).exists():
                    continue

                GitVanEvent.objects.create(
                    type=event_data.get('type', 'commit'),
                    author=event_data.get('author', 'unknown'),
                    branch=event_data.get('branch', 'main'),
                    message=event_data.get('message', ''),
                    commit_hash=event_data.get('commit', ''),
                    files_changed=len(event_data.get('files', [])),
                    additions=event_data.get('stats', {}).get('additions', 0),
                    deletions=event_data.get('stats', {}).get('deletions', 0),
                )
                created_count += 1

            # Update metrics
            today = timezone.now().date()
            metrics, _ = GitVanMetrics.objects.get_or_create(date=today)
            metrics.total_events = GitVanEvent.objects.count()
            metrics.commit_count = GitVanEvent.objects.filter(type='commit').count()
            metrics.push_count = GitVanEvent.objects.filter(type='push').count()
            metrics.merge_count = GitVanEvent.objects.filter(type='merge').count()
            metrics.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Synced {created_count} new events. '
                    f'Total: {metrics.total_events}'
                )
            )

        except subprocess.CalledProcessError as e:
            self.stdout.write(
                self.style.ERROR(f'✗ GitVan CLI error: {e.stderr}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Sync error: {str(e)}')
            )
```

## Part 6: Setup and Test (4 minutes)

```bash
# Add app to INSTALLED_APPS in settings.py
# Then:

# Run migrations
python manage.py makemigrations gitvan_integration
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver

# In another terminal, sync events
python manage.py gitvan_sync

# Test API
curl http://localhost:8000/api/gitvan/events/
curl http://localhost:8000/api/gitvan/events/today/
curl http://localhost:8000/api/gitvan/events/stats/
curl http://localhost:8000/api/gitvan/metrics/current/
```

## Part 7: Django Admin Integration (2 minutes)

Create `gitvan_integration/admin.py`:

```python
from django.contrib import admin
from .models import GitVanEvent, GitVanMetrics


@admin.register(GitVanEvent)
class GitVanEventAdmin(admin.ModelAdmin):
    list_display = ['type', 'author', 'branch', 'commit_hash', 'timestamp']
    list_filter = ['type', 'branch', 'author', 'timestamp']
    search_fields = ['author', 'branch', 'message', 'commit_hash']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']


@admin.register(GitVanMetrics)
class GitVanMetricsAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_events', 'commit_count', 'push_count', 'merge_count']
    list_filter = ['date']
    ordering = ['-date']
```

Access at: http://localhost:8000/admin/

## Summary

You've successfully:
✓ Created a Django REST API with GitVan
✓ Added production-ready hooks
✓ Created models for event storage
✓ Built REST API endpoints
✓ Created a sync management command
✓ Integrated with Django admin
✓ Tested the full workflow

## Next Steps

1. **How-To Guides**: Learn more patterns
   - [Trigger Deployments](../how-to/trigger-deployments.md)
   - [Run Tests on Events](../how-to/run-tests-on-events.md)

2. **Production Deployment**:
   - Deploy to Heroku, Railway, or AWS
   - Set up database logging
   - Add caching (Redis)

3. **Deep Learning**:
   - [SPARQL Patterns](../reference/sparql-patterns.md)
   - [API Reference](../reference/api-reference.md)

---

**All framework tutorials complete! Continue to How-To Guides.**
