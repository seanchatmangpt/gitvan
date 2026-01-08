# Comprehensive Checklists

All checklists from standardized work procedures in one convenient reference.

---

## Development Workflow Checklist

### Before Starting Work
- [ ] Git repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] All tests pass locally
- [ ] Development environment configured

### Starting New Feature
- [ ] Main branch updated (`git pull origin main`)
- [ ] Feature branch created (`git checkout -b feature/name`)
- [ ] Working directory clean (`git status`)
- [ ] Issue/ticket assigned to you

### Test-Driven Development (TDD)
- [ ] Test file created first
- [ ] Test written and fails (Red)
- [ ] Minimal code written to pass test (Green)
- [ ] Code refactored and cleaned (Refactor)
- [ ] Test coverage ≥ 80%

### Code Quality
- [ ] Linting passes (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] All tests pass (`npm test`)
- [ ] Coverage ≥ 80% (`npm run test:coverage`)
- [ ] No console.log() statements left
- [ ] No commented-out code

### Commit Checklist
- [ ] Only intended files changed
- [ ] Commit message follows format
- [ ] Commit message is descriptive
- [ ] Related issue referenced (#123)
- [ ] No secrets committed

### Pull Request Checklist
- [ ] PR title is clear and descriptive
- [ ] PR description explains changes
- [ ] All CI checks pass
- [ ] At least one reviewer assigned
- [ ] No merge conflicts
- [ ] Screenshots added (if UI changes)
- [ ] Documentation updated
- [ ] CHANGELOG updated

### Before Merging
- [ ] All review comments addressed
- [ ] All reviewers approved
- [ ] All CI checks green
- [ ] Rebased on latest main (if needed)
- [ ] Tested locally one more time

### After Merging
- [ ] Feature branch deleted
- [ ] Local main updated
- [ ] Verified deployment (if auto-deployed)
- [ ] Closed related issues

---

## Testing Procedure Checklist

### Test Planning
- [ ] All code paths identified
- [ ] Edge cases listed
- [ ] Error scenarios documented
- [ ] Test type determined (unit/integration/e2e)

### Unit Test Checklist
- [ ] Test file created in correct location
- [ ] Test structure follows pattern
- [ ] `beforeEach()` sets up context
- [ ] `afterEach()` cleans up
- [ ] Tests use `withGitVan()` wrapper
- [ ] Happy path tested
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] Async operations handled correctly

### Integration Test Checklist
- [ ] Multiple components tested together
- [ ] Real dependencies used (not mocks)
- [ ] End-to-end scenarios covered
- [ ] Performance acceptable

### Test Quality
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests clean up resources
- [ ] Test names are descriptive
- [ ] Tests are independent
- [ ] No hardcoded dates/times
- [ ] Environment variables set (TZ=UTC, LANG=C)

### Coverage Checklist
- [ ] Branches coverage ≥ 80%
- [ ] Functions coverage ≥ 80%
- [ ] Lines coverage ≥ 80%
- [ ] Statements coverage ≥ 80%
- [ ] Uncovered code justified or tested

### Before Committing Tests
- [ ] All tests pass
- [ ] No tests skipped (.skip removed)
- [ ] No tests pending (.todo removed)
- [ ] Test output clean (no warnings)
- [ ] Coverage thresholds met

---

## Build Procedure Checklist

### Pre-Build
- [ ] Working directory clean
- [ ] Previous build cleaned (`rm -rf dist/`)
- [ ] Dependencies up to date (`npm install`)
- [ ] All tests pass
- [ ] Linting passes

### Build Verification
- [ ] Build completes without errors
- [ ] `dist/` directory exists
- [ ] `dist/cli.mjs` exists and executable
- [ ] `dist/templates/` directory copied
- [ ] `dist/packs/` directory copied
- [ ] Build size reasonable (<50MB)

### Production Build
- [ ] NODE_ENV=production set
- [ ] Build optimized/minified
- [ ] No development dependencies included
- [ ] Source maps excluded (or separate)

### Post-Build Testing
- [ ] Entry points work (`node dist/cli.mjs --version`)
- [ ] All commands functional
- [ ] Templates accessible
- [ ] Packs loadable
- [ ] No errors in console

### Release Build
- [ ] Version number updated
- [ ] CHANGELOG updated
- [ ] Release notes written
- [ ] Package created (`npm pack`)
- [ ] Checksums generated
- [ ] Package tested in clean environment

---

## Deployment Checklist

### Pre-Deployment Verification
- [ ] All tests passing in CI/CD
- [ ] Code review approved
- [ ] Security scan clean (no high/critical vulnerabilities)
- [ ] Performance tests passed
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Deployment approval obtained
- [ ] Rollback plan prepared
- [ ] On-call engineer identified
- [ ] Stakeholders notified

### Staging Deployment
- [ ] Deploy to staging successful
- [ ] Smoke tests pass on staging
- [ ] Integration tests pass on staging
- [ ] Performance acceptable on staging
- [ ] QA team sign-off
- [ ] Product owner approval

### Production Deployment
- [ ] Maintenance mode enabled (if needed)
- [ ] Backup of current version created
- [ ] Production deployment executed
- [ ] Health checks pass
- [ ] Smoke tests pass
- [ ] Critical paths verified
- [ ] Maintenance mode disabled

### Post-Deployment
- [ ] Application logs normal
- [ ] Error rate < 1%
- [ ] Performance metrics normal
- [ ] No user complaints
- [ ] Monitoring active for 1 hour minimum
- [ ] Documentation published
- [ ] Stakeholders notified of success
- [ ] Deployment logged

### Rollback Checklist (If Needed)
- [ ] Issue severity assessed
- [ ] Incident ticket created
- [ ] Maintenance mode enabled
- [ ] Previous version restored
- [ ] Health checks pass after rollback
- [ ] Error rate returns to normal
- [ ] Stakeholders notified
- [ ] Incident documented

---

## Security Checklist

### Code Review Security
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] SQL injection prevention (parameterized queries)
- [ ] Authentication checks on protected endpoints
- [ ] Authorization verification
- [ ] Secure session management
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Error messages don't leak information

### Dependency Security
- [ ] No known vulnerabilities (high/critical)
- [ ] Dependencies from trusted sources
- [ ] Lock file committed
- [ ] Minimal dependency footprint
- [ ] Regular dependency updates scheduled

### Data Security
- [ ] Sensitive data encrypted at rest
- [ ] Sensitive data encrypted in transit (TLS)
- [ ] PII handling compliant
- [ ] Data retention policy followed
- [ ] Secure deletion implemented

### Before Commit
- [ ] Secrets scan clean (`git-secrets --scan`)
- [ ] Dependency audit clean (`npm audit`)
- [ ] No environment variables in code
- [ ] .env files not committed

### Secret Management
- [ ] Secrets in environment variables
- [ ] Secrets in secrets manager (production)
- [ ] No secrets in Git history
- [ ] Secret rotation schedule set

### Security Incident Response
- [ ] Incident severity classified
- [ ] Affected systems isolated
- [ ] Compromised credentials revoked
- [ ] Evidence preserved
- [ ] Incident commander notified
- [ ] Users notified (if data exposed)
- [ ] Post-incident report written

### Quarterly Security Audit
- [ ] Access controls reviewed
- [ ] MFA enabled for all accounts
- [ ] Terminated users removed
- [ ] Encryption verified
- [ ] Security logs reviewed
- [ ] Vulnerability scan completed
- [ ] Penetration test completed (annually)
- [ ] Compliance requirements met

---

## Performance Monitoring Checklist

### Monitoring Setup
- [ ] Monitoring agent installed
- [ ] Metrics collection configured
- [ ] Code instrumented
- [ ] Dashboards created
- [ ] Alerts configured

### Daily Monitoring
- [ ] Dashboards reviewed
- [ ] Error rates checked
- [ ] Performance metrics reviewed
- [ ] Resource utilization checked
- [ ] Anomalies investigated

### Performance Metrics (CTQ)
- [ ] TTFJ (Time to First Job) ≤ 10 min
- [ ] p95 Runtime ≤ 300 ms (simple jobs)
- [ ] Receipt Coverage = 100%
- [ ] Lock Contention < 1%
- [ ] Error Rate < 1%
- [ ] API Response Time p95 < 200 ms

### Performance Analysis
- [ ] Bottlenecks identified
- [ ] Profiling completed
- [ ] Benchmarks established
- [ ] Load testing performed
- [ ] Memory profiling done

### Performance Optimization
- [ ] Queries optimized
- [ ] Caching implemented
- [ ] Async operations parallelized
- [ ] Bundle size reduced
- [ ] Performance improvement verified

### Alert Response
- [ ] Alert verified as real
- [ ] Recent deployments checked
- [ ] System resources reviewed
- [ ] Logs checked for errors
- [ ] Root cause identified
- [ ] Mitigation implemented
- [ ] Monitoring continued

---

## Incident Management Checklist

### Incident Detection
- [ ] Alert acknowledged
- [ ] Initial assessment completed
- [ ] Severity classified (P0/P1/P2/P3)
- [ ] Impact scope determined

### Incident Response
- [ ] Incident ticket created
- [ ] Team notified
- [ ] Response team assembled
- [ ] Roles assigned (commander, tech lead, comms, scribe)
- [ ] Investigation started

### Investigation
- [ ] Logs reviewed
- [ ] Recent changes checked
- [ ] System resources checked
- [ ] Dependencies verified
- [ ] Root cause identified

### Mitigation
- [ ] Mitigation strategy chosen
- [ ] Mitigation implemented
- [ ] Service restored
- [ ] Mitigation verified
- [ ] Monitoring active

### Communication
- [ ] Internal team updated
- [ ] Stakeholders notified
- [ ] Users informed (if customer-facing)
- [ ] Status page updated
- [ ] Regular updates provided (every 15-30 min)

### Resolution
- [ ] Service fully restored
- [ ] Root cause addressed
- [ ] Permanent fix deployed
- [ ] Incident closed
- [ ] Documentation updated

### Post-Incident Review
- [ ] Post-mortem scheduled (within 48 hours)
- [ ] Timeline documented
- [ ] Root cause analysis completed
- [ ] What went well identified
- [ ] What went wrong identified
- [ ] Action items created
- [ ] Runbooks updated
- [ ] Learnings shared with team

---

## Documentation Checklist

### Planning
- [ ] Documentation needs identified
- [ ] Documentation type chosen
- [ ] Scope defined
- [ ] Ticket created

### Writing
- [ ] Structure follows template
- [ ] Content is accurate
- [ ] Examples included
- [ ] Examples tested and work
- [ ] Links added
- [ ] Screenshots added (if needed)

### Quality
- [ ] Spelling checked
- [ ] Grammar correct
- [ ] Jargon explained
- [ ] Technical accuracy verified
- [ ] Appropriate level of detail
- [ ] Logical flow

### Review
- [ ] Self-review completed
- [ ] Peer review requested
- [ ] Review feedback addressed
- [ ] Examples work
- [ ] Links all valid
- [ ] Markdown properly formatted

### Publishing
- [ ] Documentation built
- [ ] Documentation deployed
- [ ] URLs working
- [ ] Search working
- [ ] Navigation logical
- [ ] Index updated

### Maintenance
- [ ] CHANGELOG updated
- [ ] Version numbers current
- [ ] Deprecated features marked
- [ ] Migration guides added (if breaking changes)

### Monthly
- [ ] Links validated
- [ ] Broken links fixed
- [ ] Screenshots updated (if needed)
- [ ] Outdated content revised

### Quarterly
- [ ] Full documentation audit
- [ ] Coverage gaps identified
- [ ] Quality issues addressed
- [ ] Organization improved

---

## Release Checklist

### Release Planning
- [ ] Scope defined
- [ ] Timeline established
- [ ] Roles assigned
- [ ] Stakeholders informed
- [ ] Release branch created

### Preparation
- [ ] Code freeze announced
- [ ] Version numbers updated
- [ ] CHANGELOG updated
- [ ] Release candidate built
- [ ] Release notes written

### Testing
- [ ] All tests pass
- [ ] QA testing complete
- [ ] Performance tests pass
- [ ] Security scan clean
- [ ] UAT complete (if applicable)
- [ ] Staging sign-off obtained

### Release Day
- [ ] Pre-release verification complete
- [ ] Release tag created
- [ ] Release artifacts built
- [ ] Checksums generated
- [ ] npm publication successful
- [ ] GitHub release created
- [ ] Staging deployment successful
- [ ] Production deployment successful

### Post-Release
- [ ] Deployment verified
- [ ] Monitoring active
- [ ] Users notified
- [ ] Documentation published
- [ ] Social media announcements
- [ ] Blog post published

### Follow-up
- [ ] Release branch merged
- [ ] Milestone closed
- [ ] Post-release review completed
- [ ] Action items tracked
- [ ] Metrics collected

### Hotfix Checklist
- [ ] Urgency assessed (P0/P1?)
- [ ] Hotfix branch created
- [ ] Minimal fix implemented
- [ ] Tests pass
- [ ] Version bumped (patch)
- [ ] CHANGELOG updated
- [ ] Hotfix deployed
- [ ] Merged back to main
- [ ] Users notified

---

## Code Review Checklist

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Requirements met
- [ ] Edge cases handled
- [ ] Error scenarios covered
- [ ] Business logic correct

### Code Quality
- [ ] Code is readable
- [ ] Naming is clear
- [ ] No duplication (DRY)
- [ ] Functions are focused (single responsibility)
- [ ] Appropriate abstractions
- [ ] No magic numbers (use constants)

### Testing
- [ ] Tests included
- [ ] Tests follow TDD
- [ ] Coverage ≥ 80%
- [ ] Tests are meaningful
- [ ] Tests are not brittle

### Security
- [ ] No hardcoded secrets
- [ ] Input validated
- [ ] Output encoded
- [ ] Authentication checked
- [ ] Authorization verified
- [ ] No SQL injection vulnerabilities

### Performance
- [ ] No obvious performance issues
- [ ] Queries optimized
- [ ] Async operations used appropriately
- [ ] No memory leaks
- [ ] Caching considered

### Documentation
- [ ] README updated (if needed)
- [ ] API docs updated
- [ ] Comments added (where needed)
- [ ] CHANGELOG updated
- [ ] Examples work

### Git
- [ ] Commit messages clear
- [ ] Commits atomic
- [ ] No unnecessary files
- [ ] Branch name appropriate
- [ ] PR description complete

---

**Remember**: Checklists are tools for success, not bureaucracy. Use them to ensure quality and consistency.

**Last Updated**: 2026-01-08
**Version**: 1.0
