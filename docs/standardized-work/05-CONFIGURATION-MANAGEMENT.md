# Procedure 05: Configuration Management

## Purpose
Maintain secure, version-controlled configuration across all environments with proper change control and rollback capabilities.

## Scope
Environment variables, configuration files, secrets management, and configuration deployment across dev, staging, and production.

## Frequency
- **Config Reviews**: Monthly
- **Config Changes**: As needed
- **Secret Rotation**: Quarterly
- **Audit**: Quarterly

## Responsible Party
**Primary**: DevOps, Team Lead
**Secondary**: Security Team

## Prerequisites
- Access to configuration management system
- Understanding of environment structure
- Security clearance for secrets
- Change approval process understanding

## Configuration Structure

```
gitvan.config.js          # Application config
.env.example              # Environment variables template
.env.development          # Dev environment (not committed)
.env.staging              # Staging (in secrets manager)
.env.production           # Production (in secrets manager)
```

## Step-by-Step Instructions

### Phase 1: Configuration Change Request

**Step 1.1: Document Change**
```markdown
# Configuration Change Request

**Date**: 2026-01-08
**Requester**: John Doe
**Environment**: Production
**Type**: New configuration / Update / Removal

**Configuration Item**:
- Name: GITVAN_API_TIMEOUT
- Current Value: 30000
- New Value: 60000
- Reason: Longer timeout needed for large repos

**Impact Assessment**:
- Services affected: API, CLI
- Backward compatibility: Yes
- Rollback plan: Revert to 30000

**Testing Plan**:
- Test in dev: [x]
- Test in staging: [ ]
- Performance impact: Minimal
```
**Expected Outcome**: Change documented
**Verification**: CR ticket created

**Step 1.2: Get Approval**
- Team lead review
- Security review (if secrets involved)
- Change advisory board approval

**Expected Outcome**: Approvals obtained
**Verification**: Approval signatures/comments

### Phase 2: Update Configuration

**Step 2.1: Update Development**
```bash
# Update .env.development
echo "GITVAN_API_TIMEOUT=60000" >> .env.development

# Test locally
npm test
npm run dev
```
**Expected Outcome**: Works in dev
**Verification**: Application starts, tests pass

**Step 2.2: Update Configuration File**
```javascript
// gitvan.config.js
export default {
  api: {
    timeout: process.env.GITVAN_API_TIMEOUT || 30000,
  },
  // ... other config
}
```
**Expected Outcome**: Config file updated
**Verification**: Code review approved

**Step 2.3: Document Change**
```bash
# Update CHANGELOG.md
echo "- Changed API timeout default from 30s to 60s" >> CHANGELOG.md

# Update .env.example
grep -v "GITVAN_API_TIMEOUT" .env.example > tmp
echo "GITVAN_API_TIMEOUT=60000" >> tmp
mv tmp .env.example
```
**Expected Outcome**: Documentation updated
**Verification**: Files updated in Git

### Phase 3: Deploy Configuration

**Step 3.1: Update Staging**
```bash
# Using secrets manager (e.g., AWS Secrets Manager)
aws secretsmanager update-secret \
  --secret-id gitvan/staging/env \
  --secret-string '{"GITVAN_API_TIMEOUT":"60000"}'

# Or update environment variable
ssh staging "echo 'export GITVAN_API_TIMEOUT=60000' >> /etc/gitvan/env"
ssh staging "systemctl restart gitvan"
```
**Expected Outcome**: Staging updated
**Verification**: `curl https://staging/config` shows new value

**Step 3.2: Verify Staging**
```bash
# Smoke tests
npm run test:smoke -- --env=staging

# Check configuration endpoint
curl https://staging.gitvan.example.com/api/config | jq .api.timeout
```
**Expected Outcome**: New config works
**Verification**: Timeout is 60000, tests pass

**Step 3.3: Deploy to Production**
```bash
# Update production secrets
aws secretsmanager update-secret \
  --secret-id gitvan/production/env \
  --secret-string '{"GITVAN_API_TIMEOUT":"60000"}'

# Rolling restart
./scripts/rolling-restart.sh production
```
**Expected Outcome**: Production updated
**Verification**: Zero downtime, config applied

**Step 3.4: Verify Production**
```bash
# Verify change applied
curl https://api.gitvan.example.com/api/config | jq .api.timeout

# Monitor for issues
./scripts/monitor-deployment.sh --duration 30m
```
**Expected Outcome**: Working correctly
**Verification**: Value correct, no errors

### Phase 4: Secrets Management

**Step 4.1: Create New Secret**
```bash
# Generate secure secret
SECRET=$(openssl rand -base64 32)

# Store in secrets manager
aws secretsmanager create-secret \
  --name gitvan/production/api-key \
  --secret-string "$SECRET"

# Never commit secrets to Git!
```
**Expected Outcome**: Secret stored securely
**Verification**: Secret retrievable, not in Git

**Step 4.2: Rotate Secret**
```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update secrets manager
aws secretsmanager update-secret \
  --secret-id gitvan/production/api-key \
  --secret-string "$NEW_SECRET"

# Restart services to pick up new secret
./scripts/rolling-restart.sh production
```
**Expected Outcome**: Secret rotated
**Verification**: Services using new secret

**Step 4.3: Revoke Old Secret**
```bash
# Mark old secret as revoked
aws secretsmanager put-secret-value \
  --secret-id gitvan/production/api-key-old \
  --secret-string "REVOKED"

# Monitor for usage of old secret
./scripts/check-old-secret-usage.sh
```
**Expected Outcome**: Old secret not in use
**Verification**: No errors, old secret unused

### Phase 5: Configuration Rollback

**Step 5.1: Identify Issue**
```bash
# Check logs for config-related errors
grep "CONFIG" /var/log/gitvan/error.log

# Verify which config changed
git log --oneline --since="2 hours ago" -- gitvan.config.js
```
**Expected Outcome**: Problematic config identified
**Verification**: Root cause known

**Step 5.2: Revert Configuration**
```bash
# Revert to previous value
aws secretsmanager update-secret \
  --secret-id gitvan/production/env \
  --secret-string '{"GITVAN_API_TIMEOUT":"30000"}'

# Or revert Git commit
git revert <commit-hash>
git push origin main
```
**Expected Outcome**: Config reverted
**Verification**: Previous value restored

**Step 5.3: Verify Rollback**
```bash
# Restart services
./scripts/rolling-restart.sh production

# Verify config
curl https://api.gitvan.example.com/api/config | jq .api.timeout

# Check error rate
./scripts/check-error-rate.sh
```
**Expected Outcome**: Service working
**Verification**: Errors resolved

## Configuration Categories

### Application Configuration
```javascript
// gitvan.config.js
export default {
  jobs: { dir: "jobs" },
  templates: { dirs: ["templates"] },
  receipts: { ref: "refs/notes/gitvan/audit" },
  ai: { provider: "ollama", model: "qwen3-coder:30b" }
}
```

### Environment Variables
```bash
# Development
NODE_ENV=development
GITVAN_LOG_LEVEL=debug
TZ=UTC
LANG=C

# Production
NODE_ENV=production
GITVAN_LOG_LEVEL=info
GITVAN_API_TIMEOUT=60000
```

### Secrets
```bash
# Never commit these!
ANTHROPIC_API_KEY=sk-ant-xxxxx
DATABASE_PASSWORD=xxxxx
JWT_SECRET=xxxxx
ENCRYPTION_KEY=xxxxx
```

## Success Criteria

- [ ] Change documented and approved
- [ ] Tested in development
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Verified working
- [ ] No errors introduced
- [ ] Rollback plan tested
- [ ] Documentation updated
- [ ] Secrets not in Git

## Troubleshooting

### Issue: Configuration Not Applied
```bash
# Check if environment variable loaded
echo $GITVAN_API_TIMEOUT

# Restart service
systemctl restart gitvan

# Check config loading
node -e "console.log(require('./gitvan.config.js'))"
```

### Issue: Secret Not Found
```bash
# Verify secret exists
aws secretsmanager describe-secret --secret-id gitvan/production/api-key

# Check IAM permissions
aws sts get-caller-identity
```

### Issue: Configuration Mismatch Between Environments
```bash
# Compare configs
diff <(ssh staging "env | sort") <(ssh production "env | sort")

# Standardize
./scripts/sync-env-vars.sh staging production
```

## References
- [Deployment Procedure](04-DEPLOYMENT-PROCEDURE.md)
- [Security Procedures](08-SECURITY-PROCEDURES.md)
- [gitvan.config.js](/home/user/gitvan/gitvan.config.js)

## Training Requirements
**Duration**: 2 hours
**Competency**: Can update config, manage secrets, rollback changes

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

---

**Remember**: Never commit secrets to Git. Use secrets manager.
