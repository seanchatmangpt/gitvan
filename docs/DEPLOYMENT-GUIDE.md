# GitVan Deployment Guide

**Version:** 3.0.0
**Date:** January 9, 2026
**Target:** Production deployment for all RDF phases (1-4)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Phase-Specific Configuration](#phase-specific-configuration)
7. [Monitoring Setup](#monitoring-setup)
8. [Testing Deployment](#testing-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 20 GB SSD
- Node.js: 18.x or 20.x

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 8+ GB
- Disk: 50+ GB SSD with fast I/O
- Node.js: 20.x LTS

### Software Dependencies

```bash
# Required
- Node.js 18+ (recommend 20.x LTS)
- Git 2.30+
- npm 9+

# For Docker deployment
- Docker 24+
- Docker Compose 2.20+

# For Kubernetes deployment
- kubectl 1.28+
- Kubernetes cluster 1.28+
- Helm 3.12+ (optional)
```

### Network Requirements

- **Outbound**: Access to npm registry, GitHub (for submodules)
- **Inbound** (if serving HTTP): Port 3000
- **Monitoring**: Ports 9090 (Prometheus), 3001 (Grafana), 9093 (AlertManager)

---

## Quick Start

### Option 1: Docker Compose (Fastest)

```bash
# Clone repository
git clone https://github.com/your-org/gitvan.git
cd gitvan

# Initialize submodules
git submodule update --init --recursive

# Copy environment template
cp .env.example .env
# Edit .env and add your API keys

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f gitvan
```

**Access:**
- GitVan: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### Option 2: Kubernetes (Production)

```bash
# Create namespace
kubectl create -f deploy/kubernetes/namespace.yaml

# Create secrets
cp deploy/kubernetes/secrets.yaml.example deploy/kubernetes/secrets.yaml
# Edit secrets.yaml with real values
kubectl apply -f deploy/kubernetes/secrets.yaml

# Deploy application
kubectl apply -f deploy/kubernetes/deployment.yaml

# Check deployment
kubectl get pods -n gitvan
kubectl logs -f deployment/gitvan -n gitvan
```

---

## Docker Deployment

### Building the Image

```bash
# Build multi-stage production image
docker build -t gitvan:3.0.0 .

# Tag for registry (optional)
docker tag gitvan:3.0.0 your-registry.com/gitvan:3.0.0

# Push to registry
docker push your-registry.com/gitvan:3.0.0
```

### Docker Compose Setup

**1. Create `.env` file:**

```bash
# .env
NODE_ENV=production
TZ=UTC
LANG=C

# AI Provider
ANTHROPIC_API_KEY=your_key_here
OLLAMA_HOST=http://ollama:11434

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure_password_here
```

**2. Start services:**

```bash
docker-compose up -d
```

**3. Verify deployment:**

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                     STATUS
# gitvan                   Up
# gitvan-prometheus        Up
# gitvan-grafana           Up
# gitvan-alertmanager      Up
# gitvan-node-exporter     Up
```

**4. Run health checks:**

```bash
# Check GitVan health
docker exec gitvan node -e "console.log('healthy')"

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Access Grafana
open http://localhost:3001
```

### Docker Volume Management

```bash
# Backup data
docker run --rm -v gitvan-data:/data -v $(pwd):/backup alpine tar czf /backup/gitvan-backup.tar.gz /data

# Restore data
docker run --rm -v gitvan-data:/data -v $(pwd):/backup alpine tar xzf /backup/gitvan-backup.tar.gz

# Inspect volume
docker volume inspect gitvan-data
```

---

## Kubernetes Deployment

### Cluster Setup

**1. Create namespace:**

```bash
kubectl create namespace gitvan
kubectl label namespace gitvan environment=production
```

**2. Configure secrets:**

```bash
# Create from file
kubectl create secret generic gitvan-secrets \
  --from-literal=anthropic-api-key=YOUR_KEY \
  --from-literal=grafana-admin-password=SECURE_PASSWORD \
  -n gitvan

# Or use the template
kubectl apply -f deploy/kubernetes/secrets.yaml
```

**3. Deploy application:**

```bash
kubectl apply -f deploy/kubernetes/deployment.yaml
```

**4. Verify deployment:**

```bash
# Check pods
kubectl get pods -n gitvan

# Check services
kubectl get svc -n gitvan

# Check PVC
kubectl get pvc -n gitvan

# View logs
kubectl logs -f deployment/gitvan -n gitvan --tail=100
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment gitvan --replicas=5 -n gitvan

# Check HPA status
kubectl get hpa -n gitvan

# Describe HPA
kubectl describe hpa gitvan-hpa -n gitvan
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/gitvan gitvan=gitvan:3.0.1 -n gitvan

# Watch rollout
kubectl rollout status deployment/gitvan -n gitvan

# Rollback if needed
kubectl rollout undo deployment/gitvan -n gitvan

# Check rollout history
kubectl rollout history deployment/gitvan -n gitvan
```

### Ingress Setup (Optional)

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gitvan-ingress
  namespace: gitvan
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - gitvan.yourdomain.com
      secretName: gitvan-tls
  rules:
    - host: gitvan.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: gitvan
                port:
                  number: 3000
```

```bash
kubectl apply -f ingress.yaml
```

---

## Manual Deployment

### Installation

**1. Clone and setup:**

```bash
git clone https://github.com/your-org/gitvan.git
cd gitvan

# Initialize submodules
git submodule update --init --recursive

# Install dependencies
npm install

# Build UnRDF submodule
cd vendor/unrdf
npm install
npm run build
cd ../..

# Build GitVan
npm run build
```

**2. Configure environment:**

```bash
# Set environment variables
export NODE_ENV=production
export TZ=UTC
export LANG=C
export GITVAN_HOME=/var/lib/gitvan
export GITVAN_GRAPH_DIR=/var/lib/gitvan/graph
export ANTHROPIC_API_KEY=your_key_here

# Create data directories
sudo mkdir -p /var/lib/gitvan/{graph,benchmarks,logs}
sudo chown -R $USER:$USER /var/lib/gitvan
```

**3. Run application:**

```bash
# Foreground
node dist/cli.mjs

# Background with PM2
npm install -g pm2
pm2 start dist/cli.mjs --name gitvan
pm2 save
pm2 startup

# Or with systemd
sudo cp deploy/systemd/gitvan.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gitvan
sudo systemctl start gitvan
```

### Systemd Service

Create `/etc/systemd/system/gitvan.service`:

```ini
[Unit]
Description=GitVan - Git-Native Development Automation
After=network.target

[Service]
Type=simple
User=gitvan
WorkingDirectory=/opt/gitvan
Environment="NODE_ENV=production"
Environment="TZ=UTC"
Environment="LANG=C"
Environment="GITVAN_HOME=/var/lib/gitvan"
EnvironmentFile=/etc/gitvan/environment
ExecStart=/usr/bin/node /opt/gitvan/dist/cli.mjs
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gitvan

[Install]
WantedBy=multi-user.target
```

---

## Phase-Specific Configuration

### Phase 1: Git-Native I/O

```javascript
// gitvan.config.js
export default {
  gitNative: {
    locks: {
      timeout: 60000,      // 60 seconds
      maxRetries: 3,
      deadlockDetection: true
    },
    snapshots: {
      compression: true,
      maxSize: 10485760,   // 10MB
      retention: 30        // days
    },
    queues: {
      maxSize: 10000,
      priority: true,
      persistence: true
    }
  },
  // RDF ontology paths
  rdf: {
    ontologies: [
      'src/rdf/ontologies/lock-ontology.ttl',
      'src/rdf/ontologies/snapshot-ontology.ttl',
      'src/rdf/ontologies/queue-ontology.ttl'
    ]
  }
}
```

### Phase 2: Performance Monitoring

```javascript
export default {
  performance: {
    enabled: true,
    recording: {
      sampleRate: 1.0,     // Record all operations
      includeStack: false
    },
    budgets: {
      'build': { maxDuration: 5000, maxMemory: 512000 },
      'test': { maxDuration: 3000, maxMemory: 256000 },
      'deploy': { maxDuration: 10000, maxMemory: 1024000 }
    },
    anomalyDetection: {
      enabled: true,
      threshold: 1.5,      // 1.5x standard deviations
      windowSize: 100
    }
  },
  rdf: {
    ontologies: [
      'src/rdf/ontologies/performance-ontology.ttl',
      'src/rdf/ontologies/metrics-ontology.ttl',
      'src/rdf/ontologies/anomaly-ontology.ttl'
    ],
    rules: [
      'src/rdf/rules/performance-rules.n3'
    ]
  }
}
```

### Phase 3: RevOps

```javascript
export default {
  revops: {
    enabled: true,
    churnPrediction: {
      model: 'sparql',
      threshold: 0.6,
      updateInterval: 86400000  // 24 hours
    },
    expansionDiscovery: {
      minUsage: 0.8,
      planUpgradeThreshold: 0.7
    },
    cohortAnalysis: {
      segmentBy: 'plan',
      retentionWindows: [30, 90, 180, 365]
    }
  },
  rdf: {
    ontologies: [
      'src/rdf/ontologies/revops-ontology.ttl',
      'src/rdf/ontologies/customer-ontology.ttl',
      'src/rdf/ontologies/product-ontology.ttl'
    ]
  }
}
```

### Phase 4: Pack System

```javascript
export default {
  packs: {
    registry: {
      local: '/var/lib/gitvan/packs',
      remote: ['https://marketplace.gitvan.dev/registry']
    },
    resolution: {
      strategy: 'highest-compatible',
      timeout: 30000,
      maxDepth: 50
    },
    federation: {
      enabled: true,
      registries: [
        'https://marketplace.gitvan.dev/sparql',
        'https://community.gitvan.dev/sparql'
      ]
    },
    licenseCompliance: {
      projectLicense: 'MIT',
      strictMode: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause']
    }
  },
  rdf: {
    ontologies: [
      'src/rdf/ontologies/pack-ontology.ttl',
      'src/rdf/ontologies/registry-ontology.ttl',
      'src/rdf/ontologies/dependency-ontology.ttl'
    ]
  }
}
```

---

## Monitoring Setup

### Prometheus Configuration

Prometheus is automatically configured in Docker Compose and Kubernetes deployments.

**Manual setup:**

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xzf prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64

# Copy config
cp /path/to/gitvan/deploy/prometheus/prometheus.yml .

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

### Grafana Dashboards

**Import dashboards:**

1. Access Grafana: http://localhost:3001
2. Login (default: admin/admin)
3. Go to Dashboards → Import
4. Use dashboard IDs or upload JSON files

**Dashboard links:**
- Phase 1: Git-Native I/O
- Phase 2: Performance Monitoring
- Phase 3: RevOps Analytics
- Phase 4: Pack System Operations

### AlertManager

Configure notifications in `deploy/prometheus/alertmanager.yml`:

```yaml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK'

receivers:
  - name: 'slack'
    slack_configs:
      - channel: '#gitvan-alerts'
```

---

## Testing Deployment

### Health Checks

```bash
# Docker
docker exec gitvan node -e "console.log('healthy')"

# Kubernetes
kubectl exec -it deployment/gitvan -n gitvan -- node -e "console.log('healthy')"

# Manual
node -e "console.log('healthy')"
```

### Smoke Tests

```bash
# Phase 1: Lock operations
gitvan test phase1-locks

# Phase 2: Performance benchmarks
node scripts/benchmark-phase2.mjs

# Phase 3: RevOps queries
gitvan test phase3-revops

# Phase 4: Pack operations
gitvan pack list
```

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
wget https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz

# Run load test
k6 run tests/load/gitvan-load-test.js
```

---

## Troubleshooting

### Common Issues

**1. Submodule not initialized:**
```bash
Error: Cannot find module 'unrdf'

Solution:
git submodule update --init --recursive
cd vendor/unrdf && npm install && npm run build
```

**2. Out of memory:**
```bash
Error: JavaScript heap out of memory

Solution:
export NODE_OPTIONS="--max-old-space-size=4096"
# Or increase resources in Docker/K8s
```

**3. Lock timeout:**
```bash
Error: Lock acquisition timeout

Solution:
# Increase timeout in config
locks: { timeout: 120000 }

# Check for deadlocks
gitvan debug locks --check-deadlocks
```

**4. Performance regression:**
```bash
Solution:
# Run benchmarks
node scripts/benchmark-phase2.mjs

# Check for issues
node scripts/check-regressions.mjs

# Review Grafana dashboards
```

### Logs

```bash
# Docker
docker-compose logs -f gitvan --tail=100

# Kubernetes
kubectl logs -f deployment/gitvan -n gitvan --tail=100

# Manual (systemd)
journalctl -u gitvan -f

# Manual (PM2)
pm2 logs gitvan
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=gitvan:*
export LOG_LEVEL=debug

# Run with debugging
node --inspect dist/cli.mjs
```

---

## Next Steps

After deployment:

1. **Configure monitoring alerts** in AlertManager
2. **Set up backups** for persistent data
3. **Review security settings** (see SECURITY-GUIDE.md)
4. **Configure CI/CD pipelines** for updates
5. **Train team** on operations (see OPERATIONS-GUIDE.md)

---

**Support:**
- Documentation: https://docs.gitvan.dev
- Issues: https://github.com/your-org/gitvan/issues
- Community: https://community.gitvan.dev
