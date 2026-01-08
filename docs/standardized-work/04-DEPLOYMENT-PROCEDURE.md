# Procedure 04: Deployment Procedure

## Purpose
Ensure safe, reliable deployments of GitVan to production environments with rollback capabilities and comprehensive verification.

## Scope
Covers pre-deployment verification, deployment execution, post-deployment validation, and rollback procedures for all environments (staging, production).

## Frequency
- **Staging Deployments**: Multiple times per week
- **Production Deployments**: Weekly or as needed
- **Hotfix Deployments**: As needed for critical issues
- **Rollbacks**: As needed when issues detected

## Responsible Party
**Primary**: DevOps team, Release manager
**Secondary**: Team lead, On-call engineer

## Prerequisites
- Release build completed and tested
- All tests passing in CI/CD
- Code review approved
- Security scan completed
- Performance tests passed
- Deployment approval obtained
- Rollback plan prepared

## Step-by-Step Instructions

### Phase 1: Pre-Deployment Verification

**Step 1.1: Verify Build Status**
```bash
# Check CI/CD pipeline status
gh run list --branch main --limit 1

# Verify specific run
gh run view <run-id>
```
**Expected Outcome**: All CI checks green
**Verification**: See "completed" status with success

**Step 1.2: Verify Tests**
```bash
# Latest test results
npm test

# Coverage check
npm run test:coverage
```
**Expected Outcome**: All tests pass, coverage ≥80%
**Verification**: "Tests passed", coverage thresholds met

**Step 1.3: Verify Security Scan**
```bash
# Check for vulnerabilities
npm audit

# Run security scan
npm run security:scan  # If script exists
```
**Expected Outcome**: No high/critical vulnerabilities
**Verification**: Audit shows 0 vulnerabilities or only low severity

**Step 1.4: Check Deployment Checklist**

| Item | Status | Notes |
|------|--------|-------|
| All tests passing | [ ] | |
| Security scan clean | [ ] | |
| Performance tests passed | [ ] | |
| Code review approved | [ ] | |
| Documentation updated | [ ] | |
| CHANGELOG updated | [ ] | |
| Rollback plan ready | [ ] | |
| Stakeholders notified | [ ] | |
| Deployment window approved | [ ] | |
| On-call engineer identified | [ ] | |

**Expected Outcome**: All items checked
**Verification**: Checklist 100% complete

**Step 1.5: Backup Current Production**
```bash
# Tag current production version
git tag backup-prod-$(date +%Y%m%d-%H%M%S)
git push origin --tags

# Export production data (if applicable)
./scripts/backup-production.sh
```
**Expected Outcome**: Backup created
**Verification**: Tag exists, backup file created

### Phase 2: Staging Deployment

**Step 2.1: Deploy to Staging**
```bash
# Set staging environment
export DEPLOY_ENV=staging
export NODE_ENV=production

# Deploy
npm run deploy:staging
# Or manually:
# ssh staging-server "cd /opt/gitvan && git pull && npm install && npm run build"
```
**Expected Outcome**: Staging deployment successful
**Verification**: See "Deployment successful" message

**Step 2.2: Verify Staging Deployment**
```bash
# Check staging version
curl https://staging.gitvan.example.com/version

# Run smoke tests
npm run test:smoke -- --env=staging

# Test critical paths
./scripts/verify-staging.sh
```
**Expected Outcome**: Staging works correctly
**Verification**: Version correct, smoke tests pass

**Step 2.3: Run Integration Tests on Staging**
```bash
# Run full test suite against staging
npm run test:integration -- --env=staging

# Performance tests
npm run test:performance -- --env=staging
```
**Expected Outcome**: All tests pass on staging
**Verification**: Test results show success

**Step 2.4: Staging Sign-Off**
- QA team tests manually
- Product owner verifies features
- Security team reviews logs
- Performance team checks metrics

**Expected Outcome**: All teams approve
**Verification**: Sign-off documented

### Phase 3: Production Deployment

**Step 3.1: Notify Stakeholders**
```bash
# Send deployment notification
./scripts/notify-deployment.sh start production v4.0.0

# Notify in Slack/Teams
# "Production deployment starting at <time>"
```
**Expected Outcome**: Stakeholders notified
**Verification**: Confirmation messages received

**Step 3.2: Enable Maintenance Mode (If Applicable)**
```bash
# Put up maintenance page
./scripts/maintenance-mode.sh enable

# Or set feature flag
# curl -X POST https://api.example.com/flags/maintenance -d "enabled=true"
```
**Expected Outcome**: Maintenance mode active
**Verification**: Maintenance page visible to users

**Step 3.3: Deploy to Production**
```bash
# Set production environment
export DEPLOY_ENV=production
export NODE_ENV=production

# Deploy with rollback capability
npm run deploy:production

# Or blue-green deployment:
# 1. Deploy to blue environment
# 2. Verify blue environment
# 3. Switch traffic to blue
# 4. Keep green as rollback
```
**Expected Outcome**: Production deployment successful
**Verification**: Deployment script completes without errors

**Step 3.4: Verify Deployment**
```bash
# Check version
curl https://api.gitvan.example.com/version

# Health check
curl https://api.gitvan.example.com/health

# Smoke tests
npm run test:smoke -- --env=production
```
**Expected Outcome**: Production responding correctly
**Verification**: Version matches, health check passes

**Step 3.5: Disable Maintenance Mode**
```bash
# Remove maintenance page
./scripts/maintenance-mode.sh disable

# Verify site accessible
curl https://gitvan.example.com
```
**Expected Outcome**: Site accessible to users
**Verification**: Homepage loads, no maintenance page

### Phase 4: Post-Deployment Validation

**Step 4.1: Monitor Application Logs**
```bash
# Tail production logs
ssh production-server "tail -f /var/log/gitvan/app.log"

# Or use log aggregation
# Check DataDog/Splunk/CloudWatch
```
**Expected Outcome**: No errors in logs
**Verification**: Logs show normal operation

**Step 4.2: Monitor Error Rates**
```bash
# Check error monitoring (Sentry, Rollbar, etc.)
# Look for spike in errors

# Query metrics
curl -X POST https://metrics.example.com/query \
  -d "query=rate(http_errors_total[5m])"
```
**Expected Outcome**: Error rate normal (< 1%)
**Verification**: Error rate within baseline

**Step 4.3: Monitor Performance Metrics**
Check dashboards for:
- Response time (p50, p95, p99)
- Throughput (requests/second)
- CPU usage
- Memory usage
- Database connections

**Expected Outcome**: All metrics within normal ranges
**Verification**: No alerts triggered

**Step 4.4: Verify Critical Paths**
```bash
# Test critical user journeys
./scripts/test-critical-paths.sh production

# Manual verification
# 1. User can sign up
# 2. User can create job
# 3. User can run workflow
# 4. User can view results
```
**Expected Outcome**: All critical paths work
**Verification**: Each journey completes successfully

**Step 4.5: Check Database Migrations (If Applicable)**
```bash
# Verify migrations ran
ssh production-db "psql -c 'SELECT * FROM schema_migrations;'"

# Verify data integrity
./scripts/verify-data-integrity.sh
```
**Expected Outcome**: Migrations complete, data intact
**Verification**: Latest migration present, integrity checks pass

### Phase 5: Monitoring Period

**Step 5.1: Monitor for 1 Hour**
- Watch error rates
- Monitor performance metrics
- Review user feedback
- Check social media mentions

**Expected Outcome**: No issues detected
**Verification**: All metrics stable

**Step 5.2: Gradual Traffic Increase (If Canary Deployment)**
```bash
# Increase traffic to new version
# 10% -> 25% -> 50% -> 100%

# Update load balancer weights
./scripts/update-traffic.sh 10
# Wait and monitor
./scripts/update-traffic.sh 25
# Wait and monitor
./scripts/update-traffic.sh 50
# Wait and monitor
./scripts/update-traffic.sh 100
```
**Expected Outcome**: Smooth traffic migration
**Verification**: No errors, performance stable

**Step 5.3: User Acceptance Monitoring**
- Check support tickets
- Monitor user feedback channels
- Review analytics
- Check for reports of issues

**Expected Outcome**: No user complaints
**Verification**: Normal support volume

### Phase 6: Post-Deployment Tasks

**Step 6.1: Update Documentation**
```bash
# Update deployment log
echo "$(date): Deployed v4.0.0 to production" >> DEPLOYMENT_LOG.md

# Update status page
curl -X POST https://status.example.com/api/deployments \
  -d "version=4.0.0&status=success"
```
**Expected Outcome**: Documentation updated
**Verification**: Entries recorded

**Step 6.2: Notify Stakeholders of Success**
```bash
./scripts/notify-deployment.sh complete production v4.0.0 success

# Send success notification
# "Production deployment v4.0.0 completed successfully"
```
**Expected Outcome**: Stakeholders notified
**Verification**: Confirmation messages sent

**Step 6.3: Clean Up Old Versions**
```bash
# Remove old build artifacts (keep last 3)
./scripts/cleanup-old-builds.sh --keep 3

# Archive old logs
./scripts/archive-logs.sh --older-than 30d
```
**Expected Outcome**: Old files cleaned up
**Verification**: Disk space freed

**Step 6.4: Schedule Post-Deployment Review**
```bash
# Create calendar event for post-mortem
# Date: 1-2 days after deployment
# Attendees: Dev team, DevOps, Product

# Topics:
# - What went well?
# - What could be improved?
# - Action items for next deployment
```
**Expected Outcome**: Review scheduled
**Verification**: Calendar invite sent

## Rollback Procedure

### When to Rollback

Rollback immediately if:
- Error rate > 5%
- Critical functionality broken
- Data corruption detected
- Security vulnerability introduced
- Performance degradation > 50%
- Customer-facing issue reported

### Rollback Steps

**Rollback Step 1: Stop Deployment**
```bash
# Stop any in-progress deployment
./scripts/deployment.sh stop

# Enable maintenance mode
./scripts/maintenance-mode.sh enable
```

**Rollback Step 2: Revert to Previous Version**
```bash
# Switch to backup environment (blue-green)
./scripts/switch-environment.sh green

# Or revert code
git checkout backup-prod-<timestamp>
npm install
npm run build
npm run deploy:production
```

**Rollback Step 3: Verify Rollback**
```bash
# Check version
curl https://api.gitvan.example.com/version

# Run smoke tests
npm run test:smoke -- --env=production

# Monitor error rates
```

**Rollback Step 4: Notify Stakeholders**
```bash
./scripts/notify-deployment.sh rollback production v4.0.0 "Reason: <issue>"

# Document incident
# Create incident report
```

**Rollback Step 5: Investigate Issue**
- Collect logs from failed deployment
- Identify root cause
- Create fix
- Test fix in staging
- Attempt re-deployment

## Success Criteria

- [ ] Staging deployment successful
- [ ] All smoke tests pass
- [ ] Production deployment successful
- [ ] Health checks pass
- [ ] Error rate < 1%
- [ ] Performance metrics within baseline
- [ ] Critical paths verified
- [ ] No user complaints for 1 hour
- [ ] Documentation updated
- [ ] Stakeholders notified

## Troubleshooting

### Issue: Deployment Fails in Staging
**Cause**: Build or configuration issue
**Solution**:
```bash
# Check logs
ssh staging "journalctl -u gitvan -n 100"

# Verify configuration
diff staging.config.js production.config.js

# Re-run with verbose logging
npm run deploy:staging -- --verbose
```

### Issue: Health Check Fails After Deployment
**Cause**: Service not started or dependency unavailable
**Solution**:
```bash
# Check service status
systemctl status gitvan

# Restart service
systemctl restart gitvan

# Check dependencies
curl http://database:5432/health
```

### Issue: High Error Rate After Deployment
**Cause**: Code bug or incompatibility
**Solution**:
```bash
# Rollback immediately
./scripts/rollback.sh

# Collect logs for analysis
./scripts/collect-logs.sh --since deployment

# File incident report
```

### Issue: Performance Degradation
**Cause**: Inefficient code or resource leak
**Solution**:
```bash
# Monitor resources
top
htop
free -h

# Check for memory leaks
./scripts/check-memory-leaks.sh

# Consider rollback if severe
```

## References
- [Configuration Management](05-CONFIGURATION-MANAGEMENT.md)
- [Incident Management](07-INCIDENT-MANAGEMENT.md)
- [Performance Monitoring](06-PERFORMANCE-MONITORING.md)
- [DEPLOYMENT.md](/home/user/gitvan/DEPLOYMENT.md)

## Training Requirements

**Who Needs This Training**: DevOps team, Release manager, Team leads

**Training Duration**: 4 hours

**Training Method**:
1. Read this procedure (60 min)
2. Shadow deployment (90 min)
3. Perform staging deployment (60 min)
4. Rollback drill (30 min)

**Competency Check**:
- [ ] Can verify pre-deployment checklist
- [ ] Can deploy to staging
- [ ] Can verify staging deployment
- [ ] Can deploy to production
- [ ] Can verify production deployment
- [ ] Can execute rollback
- [ ] Can monitor post-deployment
- [ ] Can document deployment

## Related Procedures
- [03-BUILD-PROCEDURE.md](03-BUILD-PROCEDURE.md)
- [05-CONFIGURATION-MANAGEMENT.md](05-CONFIGURATION-MANAGEMENT.md)
- [06-PERFORMANCE-MONITORING.md](06-PERFORMANCE-MONITORING.md)
- [07-INCIDENT-MANAGEMENT.md](07-INCIDENT-MANAGEMENT.md)
- [10-RELEASE-PROCEDURES.md](10-RELEASE-PROCEDURES.md)

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

## Approval

**Approved By**: DevOps Lead, Release Manager
**Date**: 2026-01-08
**Next Review**: 2026-04-08 (Quarterly)

---

**Remember**: The best deployment is the one you can confidently rollback. Always have a rollback plan.
