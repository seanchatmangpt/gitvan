# Git Workflow Patterns Quick Reference

## Workflow Comparison Matrix

| Workflow | Complexity | Team Size | Release Frequency | Best For |
|----------|------------|-----------|-------------------|----------|
| **Centralized** | Low | 1-3 | Any | Prototypes, simple projects |
| **GitHub Flow** | Low | 2-10 | Continuous | Web apps, SaaS |
| **GitLab Flow** | Medium | 5-20 | Regular | Enterprise, multi-env |
| **Trunk-Based** | High | 10+ | Continuous | Mature teams, CI/CD |
| **Forking** | High | Any | Any | Open source, large teams |
| **Release Branching** | Medium | 5-15 | Scheduled | Versioned software |
| **Hotfix** | Medium | Any | Emergency | Production-critical |
| **OneFlow** | Medium | 5-15 | Regular | GitFlow alternative |
| **Feature Toggle** | High | 5+ | Continuous | Modern deployment |

## Workflow Selection Guide

### Choose Centralized Workflow if:
- ✅ Small team (1-3 developers)
- ✅ Simple project or prototype
- ✅ No need for feature isolation
- ✅ Direct deployment acceptable

### Choose GitHub Flow if:
- ✅ Small to medium team (2-10 developers)
- ✅ Continuous deployment
- ✅ Single production version
- ✅ Web application or SaaS

### Choose GitLab Flow if:
- ✅ Medium team (5-20 developers)
- ✅ Multiple environments (dev/staging/prod)
- ✅ Regular releases
- ✅ Enterprise application

### Choose Trunk-Based Development if:
- ✅ Large, mature team (10+ developers)
- ✅ Extensive automated testing
- ✅ Continuous integration
- ✅ High-frequency releases

### Choose Forking Workflow if:
- ✅ Open source project
- ✅ Large team with external contributors
- ✅ Maintainer-controlled integration
- ✅ Community-driven development

### Choose Release Branching if:
- ✅ Versioned software releases
- ✅ Scheduled release cycles
- ✅ Need release stability
- ✅ Commercial software

### Choose Hotfix Workflow if:
- ✅ Production-critical applications
- ✅ Need immediate fixes
- ✅ High-availability requirements
- ✅ Customer-facing systems

### Choose OneFlow if:
- ✅ Medium team (5-15 developers)
- ✅ Need release management
- ✅ Want GitFlow alternative
- ✅ Balanced complexity

### Choose Feature Toggle Workflow if:
- ✅ Continuous deployment
- ✅ A/B testing requirements
- ✅ Gradual feature rollouts
- ✅ Microservices architecture

## Branch Patterns

### Centralized Workflow
```
main
```

### GitHub Flow
```
main
├── feature/user-auth
├── feature/payment-system
└── feature/notifications
```

### GitLab Flow
```
main
├── staging
├── production
├── feature/user-auth
└── feature/payment-system
```

### Trunk-Based Development
```
main (trunk)
├── feature/user-auth (short-lived)
└── feature/payment-system (short-lived)
```

### Forking Workflow
```
upstream/main
└── fork/user-auth-feature
    └── fork/payment-system-feature
```

### Release Branching
```
main
├── develop
├── release/v1.2.0
├── release/v1.3.0
├── feature/user-auth
└── feature/payment-system
```

### Hotfix Workflow
```
main
├── hotfix/critical-bug-fix
├── hotfix/security-patch
└── feature/user-auth
```

### OneFlow
```
main
├── develop
├── feature/user-auth
└── feature/payment-system
```

### Feature Toggle Workflow
```
main (with feature flags)
├── feature/user-auth (flagged)
└── feature/payment-system (flagged)
```

## Event Patterns

### Common Events
- `push-to/main` - Code pushed to main branch
- `pull-request/opened` - New pull request created
- `pull-request/merged` - Pull request merged
- `branch-created` - New branch created
- `branch-deleted` - Branch deleted

### Workflow-Specific Events
- `promote-to/staging` - Code promoted to staging
- `promote-to/production` - Code promoted to production
- `release-ready` - Release branch ready for deployment
- `hotfix-required` - Emergency fix needed
- `feature-flag-enabled` - Feature flag activated
- `fork-synced` - Fork synchronized with upstream

## Job Patterns

### Common Jobs
- `validate-commit` - Validate commit message and content
- `run-tests` - Execute test suite
- `build-artifacts` - Build application artifacts
- `deploy-staging` - Deploy to staging environment
- `deploy-production` - Deploy to production environment

### Workflow-Specific Jobs
- `validate-pr` - Validate pull request
- `run-integration-tests` - Execute integration tests
- `create-release` - Create release artifacts
- `merge-hotfix` - Merge hotfix to all branches
- `cleanup-branches` - Clean up merged branches
- `monitor-feature-usage` - Monitor feature flag usage

## Automation Patterns

### Branch Protection
```javascript
const branchProtection = {
  main: {
    requireReviews: true,
    requireStatusChecks: true,
    requireUpToDate: true,
    allowForcePush: false
  }
};
```

### Auto-Merge Rules
```javascript
const autoMergeRules = {
  feature: {
    requireGreenBuild: true,
    requireReviews: 1,
    autoDelete: true
  },
  hotfix: {
    requireGreenBuild: true,
    requireReviews: 2,
    fastTrack: true
  }
};
```

### Deployment Gates
```javascript
const deploymentGates = {
  staging: {
    requireTests: true,
    requireLint: true,
    requireSecurityScan: true
  },
  production: {
    requireApproval: true,
    requireHealthCheck: true,
    requireRollbackPlan: true
  }
};
```

## Migration Paths

### Common Migration Patterns
1. **Centralized → GitHub Flow**
   - Add feature branch support
   - Implement pull request workflow
   - Add branch protection

2. **GitHub Flow → GitLab Flow**
   - Add environment branches
   - Implement promotion workflow
   - Add environment-specific jobs

3. **GitLab Flow → Trunk-Based**
   - Reduce branch lifetime
   - Increase integration frequency
   - Strengthen automated testing

4. **Any → Feature Toggle**
   - Implement feature flag system
   - Reduce branching complexity
   - Add runtime feature control

## Best Practices

### General Principles
1. **Start Simple** - Begin with the simplest workflow that meets your needs
2. **Evolve Gradually** - Migrate to more complex workflows as your team matures
3. **Automate Everything** - Use GitVan to automate repetitive tasks
4. **Monitor Health** - Track workflow metrics and adjust as needed
5. **Document Changes** - Keep workflow documentation up to date

### Workflow-Specific Best Practices

#### Centralized Workflow
- Use atomic commits
- Communicate before pushing
- Keep commits small and focused

#### GitHub Flow
- Keep feature branches short-lived
- Use descriptive branch names
- Require code reviews

#### GitLab Flow
- Maintain environment parity
- Use promotion gates
- Monitor environment health

#### Trunk-Based Development
- Commit frequently
- Keep changes small
- Maintain high test coverage

#### Forking Workflow
- Keep forks synchronized
- Use descriptive pull requests
- Maintain clear contribution guidelines

#### Release Branching
- Freeze release branches
- Merge fixes back to main
- Use semantic versioning

#### Hotfix Workflow
- Minimize hotfix frequency
- Test thoroughly before deployment
- Document hotfix process

#### OneFlow
- Keep feature branches focused
- Use release branches for stability
- Merge back to main regularly

#### Feature Toggle Workflow
- Use feature flags for incomplete features
- Monitor feature usage
- Clean up unused flags

## Troubleshooting

### Common Issues

#### Merge Conflicts
- **Cause**: Multiple developers working on same code
- **Solution**: Increase integration frequency, use smaller commits

#### Long-Running Branches
- **Cause**: Large features, poor planning
- **Solution**: Break features into smaller pieces, use feature flags

#### Deployment Failures
- **Cause**: Environment differences, insufficient testing
- **Solution**: Improve environment parity, strengthen testing

#### Workflow Confusion
- **Cause**: Unclear guidelines, inconsistent practices
- **Solution**: Document workflow, provide training, use automation

### Workflow Health Indicators

#### Healthy Workflow Signs
- ✅ Frequent, small commits
- ✅ Quick merge times
- ✅ Low conflict rates
- ✅ High deployment success
- ✅ Happy team members

#### Unhealthy Workflow Signs
- ❌ Long-running branches
- ❌ Frequent merge conflicts
- ❌ Deployment failures
- ❌ Team confusion
- ❌ Slow feature delivery

## Resources

### Documentation
- [Git Workflow Patterns Research](./git-workflow-patterns.md)
- [Implementation Plan](./git-workflow-implementation-plan.md)
- [GitVan Workflow Guide](../guides/workflows.md)

### External Resources
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials/comparing-workflows)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [GitLab Flow](https://docs.gitlab.com/ee/topics/gitlab_flow.html)
- [Trunk-Based Development](https://trunkbaseddevelopment.com/)

### Tools
- GitVan Workflow Engine
- Workflow Detection Tools
- Migration Utilities
- Health Monitoring Dashboard
