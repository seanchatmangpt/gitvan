# Responsibility Matrix (RACI)

This matrix defines roles and responsibilities for all GitVan procedures using the RACI model:

- **R**esponsible: Does the work
- **A**ccountable: Makes final decisions and approves
- **C**onsulted: Provides input and expertise
- **I**nformed: Kept up-to-date on progress

---

## Development Workflow

| Activity | Developer | Team Lead | Code Reviewer | QA | DevOps |
|----------|-----------|-----------|---------------|----|----|
| Clone repository | R | I | | | |
| Create feature branch | R | I | | | |
| Write tests (TDD) | R, A | C | | | |
| Write code | R, A | C | | | |
| Run linting/formatting | R, A | | | | |
| Create commit | R, A | | | | |
| Push to remote | R, A | | | | |
| Create pull request | R, A | I | | | |
| Code review | | | R, A | | |
| Address review feedback | R, A | | C | | |
| Merge to main | R | A | I | | |
| Delete feature branch | R, A | | | | |

---

## Testing Procedure

| Activity | Developer | QA Lead | Team Lead | DevOps |
|----------|-----------|---------|-----------|--------|
| Plan tests | R, A | C | | |
| Write unit tests | R, A | C | | |
| Write integration tests | R, A | C | | |
| Run tests locally | R, A | | | |
| Check coverage | R, A | C | | |
| Fix failing tests | R, A | C | | |
| Review test quality | C | R, A | C | |
| Run CI tests | | | | R |
| Investigate test failures | R, A | C | I | C |
| Update test infrastructure | C | | C | R, A |

---

## Build Procedure

| Activity | Developer | DevOps | Release Manager | Team Lead |
|----------|-----------|--------|-----------------|-----------|
| Local build | R, A | | | |
| Verify build artifacts | R, A | | | |
| Production build | R | A | C | I |
| Create release package | R | A | C | I |
| Test release package | R, A | C | | |
| Verify CI build | R | R, A | | I |
| Optimize build | R, A | C | | C |
| Build troubleshooting | R, A | C | | I |

---

## Deployment Procedure

| Activity | DevOps | Release Manager | Team Lead | Developer | QA | Product Manager |
|----------|--------|-----------------|-----------|-----------|----|----|
| Pre-deployment verification | R, A | R, A | C | I | C | I |
| Staging deployment | R, A | C | I | I | I | I |
| Verify staging | R | R, A | I | C | R, A | I |
| Production deployment | R, A | R, A | I | I | I | I |
| Monitor deployment | R, A | R, A | I | C | C | I |
| Verify production | R, A | R, A | I | C | R | I |
| Rollback (if needed) | R, A | R, A | I | C | I | I |
| Post-deployment tasks | R, A | R, A | I | I | I | I |
| Deployment communication | C | R, A | I | I | I | C |

---

## Configuration Management

| Activity | DevOps | Security Team | Team Lead | Developer |
|----------|--------|---------------|-----------|-----------|
| Configuration change request | R | C | A | C |
| Update development config | R, A | | I | C |
| Update configuration file | R, A | C | C | I |
| Update secrets | R, A | R, A | I | |
| Deploy to staging | R, A | | I | I |
| Verify staging | R, A | C | I | C |
| Deploy to production | R, A | | I | I |
| Verify production | R, A | | I | C |
| Secret rotation | R, A | R, A | I | I |
| Configuration rollback | R, A | | I | I |

---

## Performance Monitoring

| Activity | Developer | DevOps | Performance Team | Team Lead |
|----------|-----------|--------|------------------|-----------|
| Set up monitoring | C | R, A | R, A | I |
| Configure metrics | C | R, A | R, A | I |
| Review daily metrics | R | R | R, A | I |
| Identify bottlenecks | R, A | C | R, A | C |
| Profile application | R, A | C | C | I |
| Optimize performance | R, A | C | C | C |
| Performance testing | R, A | C | R, A | C |
| Monitor alerts | R | R, A | R, A | I |
| Respond to incidents | R, A | R, A | C | I |
| Weekly performance review | C | C | R, A | A |

---

## Incident Management

| Activity | On-Call Engineer | Incident Commander | Tech Lead | DevOps | Communications | Management |
|----------|------------------|--------------------|-----------|----|--------|------------|
| Detect incident | R, A | | | | | |
| Acknowledge alert | R, A | | | | | |
| Assess severity | R, A | C | C | | | |
| Create incident ticket | R, A | | | | | |
| Notify team | R | A | I | I | I | I |
| Form response team | | R, A | | | | |
| Investigate root cause | R, A | | R, A | C | | |
| Implement mitigation | R, A | C | R, A | R, A | | |
| Internal communication | C | | | | R, A | I |
| External communication | | | | | R, A | A |
| Verify resolution | R, A | R, A | C | C | | |
| Close incident | | R, A | | | | |
| Write post-mortem | R, A | C | C | C | | I |
| Post-mortem review | C | A | C | C | C | R, A |
| Implement prevention | R, A | | R, A | R, A | | I |

---

## Security Procedures

| Activity | Developer | Security Team | DevOps | Team Lead |
|----------|-----------|---------------|--------|-----------|
| Code security review | R, A | C | | C |
| Dependency scanning | R, A | R, A | | I |
| Secret scanning | R, A | R, A | | I |
| Vulnerability remediation | R, A | C | C | C |
| Secret management | C | R, A | R, A | I |
| Secret rotation | C | R, A | R, A | I |
| Security testing | R, A | R, A | C | I |
| Security incident response | R | R, A | R | I |
| Security audit | C | R, A | C | I |
| Compliance verification | | R, A | C | I |
| Penetration testing | | R, A | C | I |
| Security training | R | A | R | C |

---

## Documentation Procedures

| Activity | Developer | Technical Writer | Team Lead | Product Manager |
|----------|-----------|------------------|-----------|-----------------|
| Identify documentation needs | R | R, A | C | C |
| Write user documentation | C | R, A | C | C |
| Write API documentation | R, A | R | C | |
| Write code examples | R, A | C | C | |
| Update CHANGELOG | R, A | C | C | I |
| Review documentation | C | R, A | A | C |
| Test examples | R, A | C | | |
| Publish documentation | C | R, A | I | I |
| Monthly link validation | C | R, A | | |
| Quarterly documentation audit | C | R, A | A | C |

---

## Release Procedures

| Activity | Release Manager | DevOps | Team Lead | Developer | QA | Product Manager |
|----------|-----------------|--------|-----------|-----------|----|----|
| Release planning | R, A | C | R, A | C | C | R, A |
| Define scope | C | | C | I | | R, A |
| Create timeline | R, A | C | C | I | I | C |
| Assign roles | R, A | | R, A | | | |
| Create release branch | R, A | C | | I | | |
| Code freeze | R, A | | R, A | I | | |
| Update version numbers | R, A | | | C | | |
| Update CHANGELOG | R, A | | C | C | | |
| Build release candidate | R, A | R, A | | I | | |
| QA testing | | | | | R, A | I |
| Performance testing | | R, A | | R, A | C | I |
| Security testing | | C | | | | I |
| Create release tag | R, A | | | I | | |
| Publish to npm | R, A | C | | I | | |
| GitHub release | R, A | | | I | | |
| Staging deployment | | R, A | | I | C | I |
| Production deployment | R, A | R, A | I | I | I | I |
| Release communication | R, A | | I | I | | R, A |
| Post-release review | R, A | C | R, A | C | C | C |
| Hotfix (if needed) | R, A | R, A | R, A | R, A | C | I |

---

## Cross-Functional Activities

### Code Review

| Role | Responsibility |
|------|---------------|
| **Author** (Developer) | **R, A**: Write code, respond to feedback, make changes |
| **Reviewer** (Senior Developer) | **R, A**: Review code quality, security, performance |
| **Team Lead** | **C**: Provide architectural guidance |
| **Security Team** | **C**: Review security-sensitive changes |

### Onboarding New Team Member

| Role | Responsibility |
|------|---------------|
| **Team Lead** | **R, A**: Overall onboarding process |
| **Buddy** (Senior Developer) | **R**: Day-to-day guidance, pair programming |
| **DevOps** | **R**: Set up access, tools, environments |
| **HR** | **C**: Administrative tasks |
| **All Team Members** | **I**: Welcome new member |

### Sprint Planning

| Role | Responsibility |
|------|---------------|
| **Product Manager** | **R, A**: Define priorities, user stories |
| **Team Lead** | **R**: Estimate effort, assign work |
| **Developers** | **C**: Provide technical input |
| **QA** | **C**: Define acceptance criteria |
| **DevOps** | **C**: Infrastructure considerations |

### Architecture Decision

| Role | Responsibility |
|------|---------------|
| **Tech Lead** | **R, A**: Make architecture decisions |
| **Team Lead** | **C**: Team impact, resource allocation |
| **Senior Developers** | **C**: Technical expertise |
| **DevOps** | **C**: Infrastructure implications |
| **Security** | **C**: Security implications |
| **All Developers** | **I**: Understand and implement |

---

## Decision Authority Levels

### Level 1: Individual Decision
- Developer can decide and execute alone
- Examples: Variable naming, test structure, commit message

### Level 2: Peer Review
- Developer decides after peer input
- Examples: Code changes, refactoring, documentation

### Level 3: Team Lead Approval
- Team lead must approve
- Examples: Architecture changes, breaking changes, major refactoring

### Level 4: Management Approval
- Director/VP must approve
- Examples: Major version changes, platform changes, budget items

---

## Escalation Paths

### Technical Issues
```
Developer → Senior Developer → Team Lead → Tech Lead → Director of Engineering
```

### Production Incidents
```
On-Call Engineer → Incident Commander → Team Lead → Director → CTO
(P0 incidents: Immediate escalation to Director/CTO)
```

### Security Issues
```
Developer → Security Team → Security Lead → CISO
(Critical: Immediate escalation to CISO)
```

### Product Decisions
```
Developer → Team Lead → Product Manager → Director of Product → VP/CEO
```

---

## Communication Protocols

### Daily Standup
- **Lead**: Team Lead
- **Attendees**: All developers, QA
- **Optional**: Product Manager, DevOps
- **Format**: 15 minutes max, what did you do / what will you do / any blockers

### Sprint Planning
- **Lead**: Product Manager, Team Lead
- **Attendees**: All developers, QA, DevOps
- **Format**: 1-2 hours, review backlog, estimate stories, commit to sprint

### Sprint Review/Demo
- **Lead**: Product Manager
- **Attendees**: Team, stakeholders
- **Format**: 1 hour, demo completed work, gather feedback

### Sprint Retrospective
- **Lead**: Team Lead
- **Attendees**: Team only (safe space)
- **Format**: 1 hour, what went well / what could improve / action items

### Post-Mortem (After Incidents)
- **Lead**: Incident Commander
- **Attendees**: Incident team, stakeholders
- **Format**: 1 hour, blameless review, prevention measures

### Architecture Review
- **Lead**: Tech Lead
- **Attendees**: Team leads, senior developers
- **Format**: As needed, review proposals, make decisions

---

## Role Definitions

### Developer
- Write code and tests
- Review peer code
- Fix bugs
- Respond to incidents
- Participate in on-call rotation
- Follow all procedures

### Senior Developer
- All developer responsibilities plus:
- Mentor junior developers
- Lead technical design
- Review architecture
- Drive technical improvements

### Team Lead
- Overall team responsibility
- Assign work
- Conduct code reviews
- Approve releases
- Handle escalations
- Team member development

### Tech Lead / Architect
- Technical direction
- Architecture decisions
- Technology choices
- Cross-team technical coordination
- Technical standards

### QA Lead
- Test strategy
- Quality standards
- Test automation
- Release sign-off
- Quality metrics

### DevOps
- Infrastructure management
- Deployment automation
- Monitoring and alerting
- Performance optimization
- Incident response

### Release Manager
- Release planning and coordination
- Release process execution
- Release communication
- Post-release review

### Product Manager
- Product vision and strategy
- Feature prioritization
- Requirements definition
- Stakeholder communication
- Release decisions

### Security Team
- Security reviews
- Vulnerability management
- Security testing
- Security incident response
- Compliance

---

## Meeting Cadence

| Meeting | Frequency | Duration | Lead | Required Attendees |
|---------|-----------|----------|------|-------------------|
| Daily Standup | Daily | 15 min | Team Lead | All developers |
| Sprint Planning | Every 2 weeks | 2 hours | Product Manager | Team |
| Sprint Review | Every 2 weeks | 1 hour | Product Manager | Team + Stakeholders |
| Sprint Retro | Every 2 weeks | 1 hour | Team Lead | Team only |
| Performance Review | Weekly | 1 hour | Performance Team | Team Lead, DevOps |
| Security Review | Weekly | 30 min | Security Lead | Team Lead, DevOps |
| Architecture Review | As needed | 1 hour | Tech Lead | Tech leads |
| Post-Mortem | After incidents | 1 hour | Incident Commander | Incident team |
| All Hands | Monthly | 1 hour | Management | Everyone |

---

## Training Responsibility

| Training Topic | Responsible for Delivering | Responsible for Attending |
|----------------|---------------------------|--------------------------|
| GitVan Development Workflow | Team Lead, Senior Developer | All developers (required) |
| Testing Procedures | QA Lead, Team Lead | All developers (required) |
| Build and Deployment | DevOps, Release Manager | All developers (required) |
| Security Best Practices | Security Team | All team members (required) |
| Incident Response | Incident Commander | On-call rotation (required) |
| Performance Monitoring | Performance Team | All developers (recommended) |
| New Tool Training | Tool expert | Relevant users (required) |

---

## Continuous Improvement

| Activity | Responsible | Frequency |
|----------|-------------|-----------|
| Update procedures | Procedure owner | As needed |
| Review procedures | Team Lead | Quarterly |
| Approve procedure changes | Team Lead, Management | As needed |
| Share procedure improvements | All team members | Ongoing |
| Procedure training | Team Lead, SMEs | For new members, updates |
| Measure procedure compliance | Team Lead | Monthly |
| Procedure effectiveness review | Team Lead, Management | Quarterly |

---

**Remember**: These responsibilities are guidelines. In urgent situations (P0 incidents), anyone can and should take action to resolve the issue.

**Last Updated**: 2026-01-08
**Version**: 1.0
