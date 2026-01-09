# GitVan Security Guide

**Version:** 3.0.0
**Date:** January 9, 2026
**Target:** Security best practices for all RDF phases (1-4)

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Access Control](#access-control)
3. [Data Privacy](#data-privacy)
4. [Pack Security](#pack-security)
5. [License Compliance](#license-compliance)
6. [Audit Trails](#audit-trails)
7. [Secret Management](#secret-management)
8. [Network Security](#network-security)

---

## Security Overview

### Threat Model

**Assets to Protect:**
- RDF graph data (all phases)
- Customer data (Phase 3: RevOps)
- Pack registry and dependencies (Phase 4)
- API keys and secrets
- Performance metrics (Phase 2)

**Threat Actors:**
- External attackers
- Malicious packages
- Insider threats
- Supply chain attacks

**Attack Vectors:**
- Dependency confusion
- Malicious RDF injection
- Unauthorized SPARQL queries
- License violations
- Data exfiltration

### Security Principles

1. **Least Privilege:** Minimal permissions by default
2. **Defense in Depth:** Multiple security layers
3. **Zero Trust:** Verify all requests
4. **Audit Everything:** Comprehensive logging
5. **Fail Secure:** Safe defaults on errors

---

## Access Control

### Role-Based Access Control (RBAC)

**Roles:**

```yaml
roles:
  # Read-only access to metrics
  - name: viewer
    permissions:
      - read:metrics
      - read:dashboards

  # Developer access
  - name: developer
    permissions:
      - read:metrics
      - write:packs
      - execute:workflows

  # Operations access
  - name: operator
    permissions:
      - read:*
      - write:config
      - restart:services
      - backup:data

  # Admin access
  - name: admin
    permissions:
      - "*"
```

**Implementation (Kubernetes):**

```yaml
# ServiceAccount for GitVan
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gitvan
  namespace: gitvan

---
# Role with limited permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: gitvan
  namespace: gitvan
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gitvan
  namespace: gitvan
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: gitvan
subjects:
  - kind: ServiceAccount
    name: gitvan
    namespace: gitvan
```

### SPARQL Query Access Control

**Phase-specific access:**

```javascript
// gitvan.config.js
export default {
  security: {
    sparql: {
      // Restrict query types by role
      allowedOperations: {
        viewer: ['SELECT', 'ASK', 'DESCRIBE'],
        developer: ['SELECT', 'ASK', 'DESCRIBE', 'CONSTRUCT'],
        admin: ['SELECT', 'ASK', 'DESCRIBE', 'CONSTRUCT', 'UPDATE', 'DELETE']
      },

      // Query complexity limits
      limits: {
        maxResultSize: 10000,
        maxQueryTime: 30000,  // 30 seconds
        maxDepth: 10
      },

      // Federated query restrictions
      federation: {
        allowedEndpoints: [
          'https://marketplace.gitvan.dev/sparql',
          'https://internal.company.com/sparql'
        ],
        requireAuth: true
      }
    }
  }
}
```

**Query validation:**

```javascript
// Validate SPARQL before execution
function validateQuery(query, userRole) {
  // Block dangerous operations
  const dangerousPatterns = [
    /DELETE.*WHERE/i,
    /DROP\s+GRAPH/i,
    /CLEAR\s+GRAPH/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query) && userRole !== 'admin') {
      throw new Error('Unauthorized operation');
    }
  }

  // Check query complexity
  const tripleCount = (query.match(/\?/g) || []).length;
  if (tripleCount > 100) {
    throw new Error('Query too complex');
  }

  return true;
}
```

---

## Data Privacy

### Phase 3: RevOps Data Protection

**Customer data classification:**

```javascript
export default {
  revops: {
    privacy: {
      // PII fields
      piiFields: [
        'revops:email',
        'revops:phone',
        'revops:address',
        'revops:paymentMethod'
      ],

      // Anonymization for analytics
      anonymize: {
        enabled: true,
        method: 'sha256-hash',
        saltRotation: 86400000  // 24 hours
      },

      // Data retention
      retention: {
        customerData: 2555,  // 7 years (compliance)
        analyticsData: 365,  // 1 year
        logsData: 90         // 90 days
      },

      // Right to be forgotten
      gdpr: {
        enabled: true,
        deleteOnRequest: true
      }
    }
  }
}
```

**Anonymization example:**

```javascript
// Anonymize customer data for analytics
function anonymizeCustomer(customer) {
  const salt = process.env.ANONYMIZATION_SALT;

  return {
    id: sha256(`${customer.id}-${salt}`),
    plan: customer.plan,  // Keep for segmentation
    mrr: Math.round(customer.mrr / 100) * 100,  // Round to nearest $100
    signupDate: customer.signupDate,
    // Remove all PII
    email: undefined,
    phone: undefined,
    name: undefined
  };
}
```

### Encryption

**At Rest:**
```yaml
# Kubernetes encryption
apiVersion: v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
      - configmaps
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-secret>
```

**In Transit:**
```yaml
# Force TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.3"
```

---

## Pack Security

### Phase 4: Pack Verification

**Package signing:**

```javascript
export default {
  packs: {
    security: {
      // Require signed packages
      requireSignatures: true,

      // Trusted signers
      trustedSigners: [
        'sha256:abc123...',  // GitVan official
        'sha256:def456...'   // Company internal
      ],

      // Signature verification
      verification: {
        algorithm: 'sha256-rsa',
        strictMode: true
      },

      // Malware scanning
      scanning: {
        enabled: true,
        scanners: ['clamav', 'custom-scanner']
      }
    }
  }
}
```

**Verify pack before installation:**

```bash
# Check pack signature
gitvan pack verify --name example-pack --version 1.0.0

# Output:
# ✓ Signature valid
# ✓ Signer: GitVan Official (sha256:abc123...)
# ✓ No known vulnerabilities
# ✓ License: MIT (compatible)
```

### Dependency Security

**Vulnerability scanning:**

```javascript
export default {
  packs: {
    security: {
      vulnerabilities: {
        // Check against vulnerability databases
        databases: [
          'https://nvd.nist.gov/feeds',
          'https://github.com/advisories'
        ],

        // Severity threshold
        maxSeverity: 'medium',
        blockHigh: true,
        blockCritical: true
      },

      // Supply chain security
      supplyChain: {
        // Detect dependency confusion
        detectConfusion: true,

        // Allow only trusted registries
        allowedRegistries: [
          'https://marketplace.gitvan.dev',
          'https://npm.pkg.github.com'
        ]
      }
    }
  }
}
```

**Audit dependencies:**

```bash
# Scan all dependencies
gitvan pack audit --deep

# Output:
# example-pack@1.0.0
#   ├─ dependency-a@2.0.0 ✓ No vulnerabilities
#   ├─ dependency-b@1.5.0 ⚠️  1 medium severity issue
#   └─ dependency-c@3.0.0 ✗ 1 high severity issue (blocked)
```

---

## License Compliance

### Phase 4: License Checking

**Configuration:**

```javascript
export default {
  packs: {
    licenseCompliance: {
      // Project license
      projectLicense: 'MIT',

      // Strict enforcement
      strictMode: true,

      // Allowed licenses
      allowedLicenses: [
        'MIT',
        'Apache-2.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC'
      ],

      // Blocked licenses (copyleft)
      blockedLicenses: [
        'GPL-3.0',
        'AGPL-3.0',
        'LGPL-3.0'
      ],

      // Compatibility matrix
      compatibilityMatrix: {
        'MIT': ['Apache-2.0', 'BSD-3-Clause', 'ISC'],
        'Apache-2.0': ['MIT', 'BSD-3-Clause'],
        'GPL-3.0': ['GPL-3.0', 'AGPL-3.0']
      }
    }
  }
}
```

**License violation detection:**

```javascript
// Check license compatibility
async function checkLicenseCompliance(pack) {
  const projectLicense = config.packs.licenseCompliance.projectLicense;
  const packLicense = pack.license;

  // Check compatibility matrix
  const compatible = await sparqlQuery(`
    PREFIX license: <https://spdx.org/licenses#>

    ASK {
      license:${projectLicense} license:compatibleWith license:${packLicense} .
    }
  `);

  if (!compatible) {
    throw new Error(`License ${packLicense} incompatible with ${projectLicense}`);
  }

  return true;
}
```

**Generate compliance report:**

```bash
# Generate SPDX report
gitvan pack licenses --format spdx > licenses.spdx.json

# Generate human-readable report
gitvan pack licenses --format markdown > LICENSES.md
```

---

## Audit Trails

### Comprehensive Logging

**Git Notes for audit trails:**

```javascript
export default {
  receipts: {
    ref: 'refs/notes/gitvan/audit',
    signing: {
      enabled: true,
      key: process.env.GPG_SIGNING_KEY
    },
    fields: {
      timestamp: true,
      actor: true,
      operation: true,
      result: true,
      metadata: true
    }
  }
}
```

**Audit log format:**

```turtle
@prefix audit: <https://gitvan.dev/audit#> .
@prefix prov: <http://www.w3.org/ns/prov#> .

:audit-12345 a audit:AuditRecord ;
  prov:wasAttributedTo <user://admin@example.com> ;
  prov:generatedAtTime "2026-01-09T12:00:00Z"^^xsd:dateTime ;
  audit:operation "pack-install" ;
  audit:target "example-pack@1.0.0" ;
  audit:result "success" ;
  audit:ipAddress "192.168.1.100" ;
  audit:signature "sha256:..." .
```

**Query audit trail:**

```bash
# Recent admin actions
gitvan audit query --actor admin --last 24h

# Failed operations
gitvan audit query --result failure --last 7d

# Pack installations
gitvan audit query --operation pack-install --last 30d
```

### Security Events

**Track security-relevant events:**

```javascript
// Log security events
async function logSecurityEvent(event) {
  await writeAuditLog({
    type: 'security-event',
    severity: event.severity,
    category: event.category,
    description: event.description,
    metadata: {
      sourceIP: event.ip,
      userAgent: event.userAgent,
      timestamp: new Date().toISOString()
    }
  });

  // Alert on high-severity events
  if (event.severity === 'high' || event.severity === 'critical') {
    await sendAlert({
      channel: 'security-alerts',
      message: `Security event: ${event.description}`
    });
  }
}
```

---

## Secret Management

### Environment Variables

**Never commit secrets:**

```bash
# .gitignore
.env
*.key
*.pem
secrets/
```

**Use environment files:**

```bash
# .env.example (commit this)
ANTHROPIC_API_KEY=your_key_here
DATABASE_PASSWORD=secure_password
SIGNING_KEY_PATH=/path/to/key.pem

# .env (DO NOT commit)
ANTHROPIC_API_KEY=sk-ant-api03-...
DATABASE_PASSWORD=8jKn3mP9qL...
SIGNING_KEY_PATH=/etc/gitvan/signing-key.pem
```

### Kubernetes Secrets

**Create secrets:**

```bash
# From literals
kubectl create secret generic gitvan-secrets \
  --from-literal=anthropic-api-key=YOUR_KEY \
  -n gitvan

# From files
kubectl create secret generic gitvan-tls \
  --from-file=tls.crt=cert.pem \
  --from-file=tls.key=key.pem \
  -n gitvan
```

**Mount secrets:**

```yaml
env:
  - name: ANTHROPIC_API_KEY
    valueFrom:
      secretKeyRef:
        name: gitvan-secrets
        key: anthropic-api-key
```

### Secrets Rotation

**Automated rotation:**

```bash
# Rotate secrets monthly
0 0 1 * * /usr/local/bin/rotate-secrets.sh

# rotate-secrets.sh
#!/bin/bash
# Generate new API key
NEW_KEY=$(generate-api-key)

# Update Kubernetes secret
kubectl patch secret gitvan-secrets \
  -n gitvan \
  --type=json \
  -p="[{\"op\": \"replace\", \"path\": \"/data/anthropic-api-key\", \"value\": \"$(echo -n $NEW_KEY | base64)\"}]"

# Restart pods to pick up new secret
kubectl rollout restart deployment/gitvan -n gitvan
```

---

## Network Security

### Firewall Rules

**Ingress rules:**

```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 3000/tcp # GitVan
ufw allow 9090/tcp # Prometheus (internal only)
ufw allow 3001/tcp # Grafana (internal only)
ufw deny 9093      # AlertManager (internal only)
ufw enable
```

**Kubernetes Network Policies:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gitvan-network-policy
  namespace: gitvan
spec:
  podSelector:
    matchLabels:
      app: gitvan
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
```

### TLS Configuration

**Force HTTPS:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.3"
    nginx.ingress.kubernetes.io/ssl-ciphers: "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384"
spec:
  tls:
    - hosts:
        - gitvan.yourdomain.com
      secretName: gitvan-tls
```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets stored securely (not in code)
- [ ] RBAC configured with least privilege
- [ ] Network policies in place
- [ ] TLS certificates configured
- [ ] Audit logging enabled
- [ ] Vulnerability scanning configured
- [ ] License compliance checked

### Runtime

- [ ] Regular security updates applied
- [ ] Secrets rotated monthly
- [ ] Audit logs reviewed weekly
- [ ] Vulnerability scans run daily
- [ ] Access logs monitored
- [ ] Anomaly detection alerts configured

### Post-Incident

- [ ] Incident documented
- [ ] Root cause identified
- [ ] Patches applied
- [ ] Security controls updated
- [ ] Team trained on prevention

---

**Next Steps:**
- Review and customize security policies
- Set up automated security scanning
- Configure audit log retention
- Train team on security practices

---

**Security Contact:**
- Security Team: security@gitvan.dev
- Vulnerability Reports: https://gitvan.dev/security
- Bug Bounty: https://bugcrowd.com/gitvan
