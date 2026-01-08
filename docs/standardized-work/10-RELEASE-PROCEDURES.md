# Procedure 10: Release Procedures

## Purpose
Execute safe, coordinated releases with comprehensive testing, documentation, and communication to deliver value to users while maintaining system stability.

## Scope
Release planning, preparation, execution, verification, and post-release activities for all release types (major, minor, patch, hotfix).

## Frequency
- **Patch Releases**: As needed (bug fixes)
- **Minor Releases**: Monthly (new features)
- **Major Releases**: Quarterly (breaking changes)
- **Hotfix Releases**: As needed (critical issues)

## Responsible Party
**Primary**: Release manager, Team lead
**Secondary**: Development team, QA, DevOps, Product management

## Prerequisites
- All features complete and tested
- Code freeze in effect
- Release branch created
- Documentation updated
- Stakeholder approval
- Release checklist reviewed

## Release Types

| Type | Version Change | Example | Description |
|------|---------------|---------|-------------|
| **Major** | X.0.0 | 3.0.0 → 4.0.0 | Breaking changes, major features |
| **Minor** | x.Y.0 | 4.0.0 → 4.1.0 | New features, backward compatible |
| **Patch** | x.y.Z | 4.0.0 → 4.0.1 | Bug fixes, security patches |
| **Hotfix** | x.y.Z | 4.0.0 → 4.0.1 | Emergency fix for production |

## Step-by-Step Instructions

### Phase 1: Release Planning

**Step 1.1: Define Release Scope**
```markdown
# Release 4.1.0 Planning

## Target Date
2026-02-15

## Goals
- Add workflow scheduling feature
- Improve performance by 30%
- Fix 15 high-priority bugs

## Features Included
- [ ] Workflow scheduler (#123)
- [ ] Cron job support (#124)
- [ ] Performance optimizations (#125)

## Features Postponed
- [ ] AI code generation (moved to 4.2.0)
- [ ] GraphQL API (moved to 5.0.0)

## Success Criteria
- All tests pass
- Performance targets met
- No P0/P1 bugs
- Documentation complete
```
**Expected Outcome**: Release scope defined
**Verification**: Stakeholders approve scope

**Step 1.2: Create Release Timeline**
```markdown
# Release Timeline

## Week 1 (Jan 29 - Feb 4)
- Feature freeze (Feb 1)
- Final PR merges
- Integration testing

## Week 2 (Feb 5 - Feb 11)
- Code freeze (Feb 5)
- Release candidate builds
- QA testing
- Documentation finalization

## Week 3 (Feb 12 - Feb 15)
- Final testing
- Release preparation
- Staging deployment (Feb 13)
- Production release (Feb 15)
```
**Expected Outcome**: Timeline established
**Verification**: Team commits to dates

**Step 1.3: Assign Release Roles**
```markdown
# Release Team

- **Release Manager**: John Doe
- **QA Lead**: Jane Smith
- **Technical Lead**: Bob Johnson
- **Documentation Lead**: Alice Brown
- **Communications**: Charlie Wilson
- **DevOps**: Diana Martinez
```
**Expected Outcome**: Responsibilities clear
**Verification**: All roles filled

### Phase 2: Release Preparation

**Step 2.1: Create Release Branch**
```bash
# Create release branch from main
git checkout main
git pull origin main
git checkout -b release/4.1.0

# Push release branch
git push -u origin release/4.1.0

# Protect release branch
gh api repos/:owner/:repo/branches/release/4.1.0/protection \
  --method PUT \
  --field required_pull_request_reviews=true
```
**Expected Outcome**: Release branch created
**Verification**: Branch exists and protected

**Step 2.2: Code Freeze**
```bash
# Announce code freeze
# Slack: "@channel Code freeze in effect for release 4.1.0. Only bug fixes allowed."

# No new features after this point
# Only critical fixes with release manager approval

# Update GitHub protection rules to require release manager approval
```
**Expected Outcome**: No new features merged
**Verification**: Only bug fixes in release branch

**Step 2.3: Update Version Numbers**
```bash
# Update package.json
npm version minor --no-git-tag-version  # 4.0.0 -> 4.1.0

# Update VERSION file
echo "4.1.0" > VERSION

# Update documentation
sed -i 's/4.0.0/4.1.0/g' docs/**/*.md

# Commit version bump
git add .
git commit -m "chore: bump version to 4.1.0"
git push origin release/4.1.0
```
**Expected Outcome**: Version updated everywhere
**Verification**: All files show 4.1.0

**Step 2.4: Update CHANGELOG**
```bash
# Generate changelog from commits
./scripts/generate-changelog.sh v4.0.0..HEAD > CHANGELOG_DRAFT.md

# Edit and organize
# Move from ## [Unreleased] to ## [4.1.0] - 2026-02-15

# Example:
cat >> CHANGELOG.md <<'EOF'
## [4.1.0] - 2026-02-15

### Added
- Workflow scheduler with cron support (#123)
- Background job execution engine (#124)
- Performance monitoring dashboard (#125)

### Changed
- Improved job execution performance by 35% (#126)
- Updated default timeout from 30s to 60s (#127)

### Fixed
- Fixed memory leak in template rendering (#128)
- Fixed race condition in distributed locks (#129)

### Security
- Updated dependencies to patch CVE-2024-12345 (#130)
- Improved input validation in CLI commands (#131)

[View full changelog](CHANGELOG.md)
EOF

# Commit changelog
git add CHANGELOG.md
git commit -m "docs: update changelog for 4.1.0"
git push
```
**Expected Outcome**: Changelog complete
**Verification**: All changes documented

**Step 2.5: Build Release Candidate**
```bash
# Build RC1
export NODE_ENV=production
npm run build

# Tag as release candidate
git tag -a v4.1.0-rc.1 -m "Release candidate 1 for v4.1.0"
git push origin v4.1.0-rc.1

# Create GitHub pre-release
gh release create v4.1.0-rc.1 \
  --title "v4.1.0-rc.1" \
  --notes "Release candidate 1 for testing" \
  --prerelease \
  dist/*
```
**Expected Outcome**: RC1 available for testing
**Verification**: GitHub shows pre-release

### Phase 3: Release Testing

**Step 3.1: QA Testing**
```bash
# Deploy to staging
./scripts/deploy.sh staging v4.1.0-rc.1

# Run test plan
./scripts/run-test-plan.sh --release 4.1.0

# Test checklist:
# - All new features work
# - No regressions in existing features
# - Performance targets met
# - Security scan clean
# - Documentation accurate
# - Migration guide works (if breaking changes)
```
**Expected Outcome**: All tests pass
**Verification**: QA sign-off obtained

**Step 3.2: Performance Testing**
```bash
# Load testing
npm run test:load -- --users 1000 --duration 30m

# Performance benchmarks
npm run benchmark

# Compare to baseline
./scripts/compare-performance.sh --baseline v4.0.0 --candidate v4.1.0-rc.1

# Verify targets met:
# - Response time p95 < 200ms
# - Throughput > 1000 req/s
# - Error rate < 0.5%
```
**Expected Outcome**: Performance acceptable
**Verification**: Benchmarks meet or exceed targets

**Step 3.3: Security Testing**
```bash
# Security scan
npm audit
snyk test

# Penetration testing (for major releases)
./scripts/run-pentest.sh --target staging

# Verify no high/critical vulnerabilities
```
**Expected Outcome**: Security clean
**Verification**: Security team approval

**Step 3.4: User Acceptance Testing**
```bash
# Beta testing (optional for major releases)
# Invite select users to test RC

# Collect feedback
./scripts/collect-beta-feedback.sh

# Address critical issues
# Build RC2 if needed
```
**Expected Outcome**: Users satisfied
**Verification**: No critical feedback

### Phase 4: Release Execution

**Step 4.1: Pre-Release Verification**
```bash
# Release Readiness Checklist
./scripts/check-release-readiness.sh v4.1.0

# Verify:
# - All tests passing
# - Documentation complete
# - CHANGELOG updated
# - Security scan clean
# - Performance targets met
# - Stakeholder approvals
# - Communication plan ready
```
**Expected Outcome**: All checks pass
**Verification**: Go/no-go decision made

**Step 4.2: Create Release Tag**
```bash
# Final build
export NODE_ENV=production
npm run build
npm test

# Create release tag
git tag -a v4.1.0 -m "Release v4.1.0

New Features:
- Workflow scheduler with cron support
- Background job execution engine
- Performance monitoring dashboard

See CHANGELOG.md for details"

# Push tag
git push origin v4.1.0
```
**Expected Outcome**: Release tagged
**Verification**: Tag exists in repository

**Step 4.3: Build Release Artifacts**
```bash
# Build for distribution
npm run build

# Create distributable package
npm pack

# Create release archive
tar -czf gitvan-v4.1.0.tar.gz dist/

# Generate checksums
sha256sum gitvan-v4.1.0.tar.gz > gitvan-v4.1.0.tar.gz.sha256
sha256sum gitvan-4.1.0.tgz > gitvan-4.1.0.tgz.sha256
```
**Expected Outcome**: Release artifacts ready
**Verification**: Files created with checksums

**Step 4.4: Publish to npm**
```bash
# Login to npm (if needed)
npm login

# Publish release
npm publish --access public

# Verify publication
npm view gitvan@4.1.0

# Verify installation works
npm install -g gitvan@4.1.0
gitvan --version  # Should show 4.1.0
```
**Expected Outcome**: Package published
**Verification**: Available on npm registry

**Step 4.5: Create GitHub Release**
```bash
# Create GitHub release
gh release create v4.1.0 \
  --title "GitVan v4.1.0" \
  --notes-file RELEASE_NOTES.md \
  gitvan-v4.1.0.tar.gz \
  gitvan-4.1.0.tgz \
  gitvan-v4.1.0.tar.gz.sha256 \
  gitvan-4.1.0.tgz.sha256

# Mark as latest release
gh release edit v4.1.0 --latest
```
**Expected Outcome**: GitHub release published
**Verification**: Release visible on GitHub

### Phase 5: Deployment

**Step 5.1: Deploy to Staging**
```bash
# Deploy to staging first
./scripts/deploy.sh staging v4.1.0

# Smoke tests
npm run test:smoke -- --env=staging

# Full verification
./scripts/verify-deployment.sh staging v4.1.0
```
**Expected Outcome**: Staging deployment successful
**Verification**: All checks pass

**Step 5.2: Deploy to Production**
```bash
# Deploy to production (follow deployment procedure)
./scripts/deploy.sh production v4.1.0

# Monitor deployment
./scripts/monitor-deployment.sh --duration 60m

# Verify deployment
./scripts/verify-deployment.sh production v4.1.0
```
**Expected Outcome**: Production deployment successful
**Verification**: Service operational

**Step 5.3: Post-Deployment Monitoring**
```bash
# Monitor for 2 hours minimum
# Watch:
# - Error rates
# - Performance metrics
# - User feedback
# - System resources

# Alert on-call if issues detected
```
**Expected Outcome**: No issues detected
**Verification**: All metrics normal

### Phase 6: Release Communication

**Step 6.1: Announce Release**
```bash
# Email announcement
./scripts/send-release-announcement.sh --version 4.1.0

# Blog post
# Title: "GitVan 4.1.0 Released: Workflow Scheduling and Performance Improvements"

# Social media
# Twitter, LinkedIn, Reddit, HackerNews

# Update website
./scripts/update-website.sh --version 4.1.0
```
**Expected Outcome**: Users informed
**Verification**: Announcements sent

**Step 6.2: Update Documentation Site**
```bash
# Deploy latest docs
npm run docs:build
npm run docs:deploy

# Update version selector
./scripts/update-version-selector.sh --add 4.1.0

# Verify docs accessible
curl https://docs.gitvan.example.com/v4.1.0/
```
**Expected Outcome**: Docs published
**Verification**: Documentation accessible

### Phase 7: Post-Release Activities

**Step 7.1: Merge Release Branch**
```bash
# Merge release branch to main
git checkout main
git merge release/4.1.0
git push origin main

# Merge to develop (if using gitflow)
git checkout develop
git merge release/4.1.0
git push origin develop

# Delete release branch
git branch -d release/4.1.0
git push origin --delete release/4.1.0
```
**Expected Outcome**: Branches synchronized
**Verification**: Release changes in main and develop

**Step 7.2: Close Release Milestone**
```bash
# Close GitHub milestone
gh milestone close 4.1.0

# Move incomplete issues to next milestone
gh issue list --milestone 4.1.0 --state open
# Manually move to 4.2.0 milestone
```
**Expected Outcome**: Milestone closed
**Verification**: All issues resolved or moved

**Step 7.3: Post-Release Review**
```markdown
# Release 4.1.0 Retrospective

## What Went Well
- Testing caught issues early
- Deployment went smoothly
- Communication was clear
- No production incidents

## What Could Be Improved
- Testing took longer than planned
- Documentation updates were rushed
- RC2 was needed (could have caught issues earlier)

## Action Items
- [ ] Automate more testing - @jane
- [ ] Start documentation earlier - @alice
- [ ] Add pre-RC checklist - @john

## Metrics
- Planning: 2 weeks
- Testing: 1.5 weeks
- Release: 1 day
- Issues found: 3 (all fixed)
- Time to deployment: 3.5 weeks
```
**Expected Outcome**: Lessons learned documented
**Verification**: Action items assigned

**Step 7.4: Monitor Post-Release**
```bash
# Monitor for one week after release
# Track:
# - Bug reports
# - User feedback
# - Performance trends
# - Adoption rate

# Address issues promptly
# Plan hotfix if critical issues found
```
**Expected Outcome**: Release stable
**Verification**: No critical issues

## Hotfix Procedure

**Hotfix Step 1: Assess Urgency**
```bash
# Is this a P0/P1 issue?
# Does it require immediate fix?
# Can it wait for next release?

# If hotfix needed, proceed immediately
```

**Hotfix Step 2: Create Hotfix Branch**
```bash
# Branch from latest release tag
git checkout -b hotfix/4.1.1 v4.1.0

# Make minimal fix
# ... fix code ...

# Test thoroughly
npm test
npm run test:integration
```

**Hotfix Step 3: Release Hotfix**
```bash
# Bump patch version
npm version patch  # 4.1.0 -> 4.1.1

# Update CHANGELOG
echo "## [4.1.1] - $(date +%Y-%m-%d)
### Fixed
- Critical bug in authentication (#999)" >> CHANGELOG.md

# Tag and release
git tag -a v4.1.1 -m "Hotfix: Critical auth bug"
git push origin v4.1.1

# Publish
npm publish

# Deploy
./scripts/deploy.sh production v4.1.1

# Merge back
git checkout main
git merge hotfix/4.1.1
git push origin main
```

## Success Criteria

- [ ] All planned features included
- [ ] All tests pass
- [ ] Documentation complete and published
- [ ] CHANGELOG updated
- [ ] Security scan clean
- [ ] Performance targets met
- [ ] QA sign-off obtained
- [ ] Stakeholder approval received
- [ ] Release published to npm
- [ ] GitHub release created
- [ ] Production deployment successful
- [ ] No critical post-release issues
- [ ] Users notified
- [ ] Post-release review completed

## Release Checklist

Use this checklist for every release:

```markdown
## Release Checklist: v4.1.0

### Planning (2 weeks before)
- [ ] Scope defined
- [ ] Timeline established
- [ ] Roles assigned
- [ ] Stakeholders informed

### Preparation (1 week before)
- [ ] Release branch created
- [ ] Code freeze announced
- [ ] Version numbers updated
- [ ] CHANGELOG updated
- [ ] Release candidate built

### Testing (1 week before)
- [ ] All tests pass
- [ ] QA testing complete
- [ ] Performance tests pass
- [ ] Security scan clean
- [ ] UAT complete (if applicable)

### Release Day
- [ ] Pre-release verification complete
- [ ] Release tag created
- [ ] Release artifacts built
- [ ] npm publication successful
- [ ] GitHub release created
- [ ] Staging deployment successful
- [ ] Production deployment successful

### Post-Release (same day)
- [ ] Deployment verified
- [ ] Monitoring active
- [ ] Users notified
- [ ] Documentation published
- [ ] Social media announcements

### Follow-up (1 week after)
- [ ] Release branch merged
- [ ] Milestone closed
- [ ] Post-release review completed
- [ ] Action items tracked
```

## Troubleshooting

### Issue: Tests Fail Before Release
```bash
# Stop release process
# Investigate and fix failing tests
# Create new RC after fixes
# Restart testing phase
```

### Issue: Deployment Fails
```bash
# Stop deployment
# Rollback if already deployed
# Investigate issue
# Fix and create new RC
# Restart from testing phase
```

### Issue: Critical Bug Found After Release
```bash
# Assess severity
# If critical: prepare hotfix immediately
# If not critical: schedule for next patch
# Follow hotfix procedure above
```

## References
- [Deployment Procedure](04-DEPLOYMENT-PROCEDURE.md)
- [Testing Procedure](02-TESTING-PROCEDURE.md)
- [Documentation Procedures](09-DOCUMENTATION-PROCEDURES.md)
- [Semantic Versioning](https://semver.org/)

## Training Requirements
**Duration**: 4 hours
**Competency**: Can plan releases, manage release process, communicate effectively

## Revision History
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

---

**Remember**: A good release is boring. Follow the checklist, communicate clearly, and monitor carefully.
