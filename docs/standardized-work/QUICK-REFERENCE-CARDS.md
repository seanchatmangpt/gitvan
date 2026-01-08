# Quick Reference Cards

These quick reference cards are designed to be printed, laminated, and kept at workstations for instant access to critical procedures.

## Card Format
- **Size**: 4" x 6" (standard index card)
- **Material**: Laminated cardstock
- **Print**: Double-sided
- **Distribution**: One set per developer workstation

---

## CARD 1: Development Workflow (Front)

```
┌────────────────────────────────────────────┐
│  GITVAN DEVELOPMENT WORKFLOW              │
│  Quick Reference v1.0                      │
├────────────────────────────────────────────┤
│                                            │
│  START NEW WORK:                           │
│  1. git checkout main && git pull          │
│  2. git checkout -b feature/name           │
│  3. Verify clean: git status               │
│                                            │
│  TDD CYCLE (Red-Green-Refactor):          │
│  1. Write test (it should fail)            │
│  2. Write minimal code to pass             │
│  3. Refactor and clean up                  │
│  4. npm test -- --watch                    │
│                                            │
│  QUALITY CHECKS:                           │
│  □ npm run lint                            │
│  □ npm run format                          │
│  □ npm test                                │
│  □ npm run test:coverage (≥80%)            │
│                                            │
│  COMMIT:                                   │
│  git add <files>                           │
│  git commit -m "type: description"         │
│  git push -u origin feature/name           │
│                                            │
│  CREATE PR:                                │
│  gh pr create --title "..." --body "..."   │
│                                            │
└────────────────────────────────────────────┘
```

## CARD 1: Development Workflow (Back)

```
┌────────────────────────────────────────────┐
│  COMMIT MESSAGE FORMAT:                    │
│                                            │
│  type: subject (max 50 chars)              │
│                                            │
│  - body (wrap at 72 chars)                 │
│  - explain what and why                    │
│                                            │
│  Closes #123                               │
│                                            │
│  TYPES:                                    │
│  feat     - New feature                    │
│  fix      - Bug fix                        │
│  docs     - Documentation                  │
│  style    - Formatting                     │
│  refactor - Code restructure               │
│  test     - Add/update tests               │
│  chore    - Build, dependencies            │
│                                            │
│  TROUBLESHOOTING:                          │
│  Context lost error?                       │
│    → Use withGitVan() wrapper              │
│                                            │
│  Tests timeout?                            │
│    → Check for missing await               │
│    → Verify cleanup in afterEach()         │
│                                            │
│  Low coverage?                             │
│    → Open coverage/index.html              │
│    → Add tests for red lines               │
│                                            │
└────────────────────────────────────────────┘
```

---

## CARD 2: Testing Procedure (Front)

```
┌────────────────────────────────────────────┐
│  GITVAN TESTING PROCEDURE                  │
│  Quick Reference v1.0                      │
├────────────────────────────────────────────┤
│                                            │
│  TEST TYPES & LOCATIONS:                   │
│  Unit Tests        → tests/unit/           │
│  Integration Tests → tests/integration/    │
│  BDD Tests         → tests/bdd/            │
│  E2E Tests         → tests/e2e/            │
│                                            │
│  RUN TESTS:                                │
│  npm test                  # All tests     │
│  npm test file.test.mjs    # One file      │
│  npm test -- --watch       # Watch mode    │
│  npm run test:ui           # UI mode       │
│  npm run test:coverage     # With coverage │
│                                            │
│  COVERAGE TARGETS (minimum):               │
│  Branches:    ≥ 80%                        │
│  Functions:   ≥ 80%                        │
│  Lines:       ≥ 80%                        │
│  Statements:  ≥ 80%                        │
│                                            │
│  CONTEXT PATTERN (CRITICAL):               │
│  await withGitVan(context, async () => {   │
│    const git = useGit();                   │
│    await git.commit("message");            │
│  });                                       │
│                                            │
└────────────────────────────────────────────┘
```

## CARD 2: Testing Procedure (Back)

```
┌────────────────────────────────────────────┐
│  TEST STRUCTURE:                           │
│                                            │
│  describe("Feature", () => {               │
│    let context;                            │
│                                            │
│    beforeEach(async () => {                │
│      context = await createTestContext(); │
│    });                                     │
│                                            │
│    afterEach(async () => {                 │
│      await context.cleanup();              │
│    });                                     │
│                                            │
│    it("should do something", async () => { │
│      await withGitVan(context, async () => {│
│        // Test code here                   │
│      });                                   │
│    });                                     │
│  });                                       │
│                                            │
│  COMMON ISSUES:                            │
│  ✗ Context not available                   │
│    → Wrap in withGitVan()                  │
│  ✗ Flaky tests                             │
│    → Remove randomness/timing              │
│  ✗ Memory leaks                            │
│    → Ensure cleanup in afterEach()         │
│                                            │
└────────────────────────────────────────────┘
```

---

## CARD 3: Build & Deploy (Front)

```
┌────────────────────────────────────────────┐
│  BUILD & DEPLOY                            │
│  Quick Reference v1.0                      │
├────────────────────────────────────────────┤
│                                            │
│  LOCAL BUILD:                              │
│  1. rm -rf dist/                           │
│  2. npm run lint                           │
│  3. npm test                               │
│  4. npm run build                          │
│  5. node dist/cli.mjs --version            │
│                                            │
│  PRODUCTION BUILD:                         │
│  export NODE_ENV=production                │
│  npm run build                             │
│                                            │
│  VERIFY BUILD:                             │
│  □ dist/ directory exists                  │
│  □ dist/cli.mjs executable                 │
│  □ dist/templates/ copied                  │
│  □ dist/packs/ copied                      │
│  □ No devDependencies                      │
│  □ Size reasonable (<50MB)                 │
│                                            │
│  DEPLOYMENT CHECKLIST:                     │
│  □ All tests pass                          │
│  □ Security scan clean                     │
│  □ Performance tests pass                  │
│  □ Documentation updated                   │
│  □ CHANGELOG updated                       │
│  □ Stakeholders notified                   │
│                                            │
└────────────────────────────────────────────┘
```

## CARD 3: Build & Deploy (Back)

```
┌────────────────────────────────────────────┐
│  DEPLOY TO STAGING:                        │
│  ./scripts/deploy.sh staging v4.1.0        │
│  npm run test:smoke -- --env=staging       │
│  ./scripts/verify-deployment.sh staging    │
│                                            │
│  DEPLOY TO PRODUCTION:                     │
│  1. Verify staging works                   │
│  2. Enable maintenance mode (if needed)    │
│  3. ./scripts/deploy.sh production v4.1.0  │
│  4. Monitor for 1 hour minimum             │
│  5. Disable maintenance mode               │
│                                            │
│  ROLLBACK:                                 │
│  ./scripts/rollback.sh                     │
│  Verify: curl /health && curl /version     │
│                                            │
│  POST-DEPLOYMENT:                          │
│  □ Health checks pass                      │
│  □ Error rate < 1%                         │
│  □ Performance normal                      │
│  □ Critical paths work                     │
│  □ Users notified                          │
│                                            │
│  EMERGENCY: Call incident commander        │
│  If error rate > 5%, rollback immediately  │
│                                            │
└────────────────────────────────────────────┘
```

---

## CARD 4: Incident Response (Front)

```
┌────────────────────────────────────────────┐
│  INCIDENT RESPONSE                         │
│  Quick Reference v1.0                      │
├────────────────────────────────────────────┤
│                                            │
│  SEVERITY LEVELS:                          │
│  P0: Total outage     → 5 min response     │
│  P1: Major broken     → 30 min response    │
│  P2: Minor degraded   → 2 hour response    │
│  P3: Cosmetic         → Next day           │
│                                            │
│  IMMEDIATE ACTIONS:                        │
│  1. Acknowledge alert (PagerDuty/Slack)    │
│  2. Assess severity and impact             │
│  3. Create incident ticket                 │
│  4. Notify team (@channel for P0/P1)       │
│  5. Form response team                     │
│                                            │
│  INVESTIGATION:                            │
│  □ Check logs: tail -f error.log           │
│  □ Check metrics: curl /metrics            │
│  □ Check recent changes: git log -5        │
│  □ Check resources: top, free -h           │
│  □ Check dependencies: curl /health        │
│                                            │
│  MITIGATION OPTIONS:                       │
│  1. Rollback deployment                    │
│  2. Scale up resources                     │
│  3. Enable feature flag fallback           │
│  4. Disable problematic feature            │
│                                            │
└────────────────────────────────────────────┘
```

## CARD 4: Incident Response (Back)

```
┌────────────────────────────────────────────┐
│  COMMUNICATION (Every 15-30 min):          │
│                                            │
│  Investigating: We are looking into it     │
│  Identified: We know the issue             │
│  Monitoring: Fix applied, watching         │
│  Resolved: Issue fixed                     │
│                                            │
│  ESCALATION PATH:                          │
│  0-15 min:  On-Call Engineer               │
│  15-30 min: Team Lead                      │
│  30+ min:   Director of Engineering        │
│  P0:        CTO/CEO (immediate)            │
│                                            │
│  POST-INCIDENT (Within 48 hours):          │
│  □ Write post-mortem                       │
│  □ Document timeline                       │
│  □ Identify root cause                     │
│  □ List what went well                     │
│  □ List what went wrong                    │
│  □ Create action items                     │
│  □ Update runbooks                         │
│  □ Share learnings                         │
│                                            │
│  REMEMBER:                                 │
│  - Blameless culture                       │
│  - Fix the system, not the person          │
│  - Document everything                     │
│  - Learn and improve                       │
│                                            │
└────────────────────────────────────────────┘
```

---

## CARD 5: Security Checklist (Front)

```
┌────────────────────────────────────────────┐
│  SECURITY CHECKLIST                        │
│  Quick Reference v1.0                      │
├────────────────────────────────────────────┤
│                                            │
│  CODE REVIEW SECURITY:                     │
│  □ No hardcoded secrets                    │
│  □ Input validation present                │
│  □ Output encoding for XSS                 │
│  □ Parameterized SQL queries               │
│  □ Authentication checks                   │
│  □ Authorization verified                  │
│  □ Rate limiting enabled                   │
│  □ Error messages don't leak info          │
│                                            │
│  BEFORE COMMIT:                            │
│  git-secrets --scan                        │
│  npm audit                                 │
│  snyk test (if available)                  │
│                                            │
│  DETECT SECRETS:                           │
│  git grep -i "api.key\|password\|secret"   │
│  gitleaks detect --source . --verbose      │
│                                            │
│  USE ENV VARS, NOT HARDCODED:              │
│  ✗ const key = 'sk-1234567890'             │
│  ✓ const key = process.env.API_KEY         │
│                                            │
│  IF SECRET FOUND IN HISTORY:               │
│  1. REVOKE secret immediately              │
│  2. Remove from Git history                │
│  3. Force push (coordinate!)               │
│  4. Notify team to re-clone                │
│                                            │
└────────────────────────────────────────────┘
```

## CARD 5: Security Checklist (Back)

```
┌────────────────────────────────────────────┐
│  VULNERABILITY SCANNING:                   │
│  Daily: npm audit (automated)              │
│  Weekly: Full security review              │
│  Quarterly: Security audit                 │
│  Annually: Penetration testing             │
│                                            │
│  REMEDIATE VULNERABILITIES:                │
│  1. npm audit fix (auto)                   │
│  2. npm update <package> (manual)          │
│  3. Document exceptions if no fix          │
│  4. Implement mitigations                  │
│  5. Monitor for patches                    │
│                                            │
│  SECURITY INCIDENT:                        │
│  P0: Active breach                         │
│    1. Isolate affected systems             │
│    2. Revoke credentials                   │
│    3. Enable verbose logging               │
│    4. Preserve evidence                    │
│    5. Notify incident commander            │
│                                            │
│  SECRET ROTATION (Quarterly):              │
│  1. Generate new secret                    │
│  2. Update secrets manager                 │
│  3. Deploy configuration                   │
│  4. Verify services working                │
│  5. Revoke old secret                      │
│                                            │
│  REPORT SECURITY ISSUES:                   │
│  security@gitvan.example.com               │
│  Never discuss publicly!                   │
│                                            │
└────────────────────────────────────────────┘
```

---

## CARD 6: Performance Monitoring (Front)

```
┌────────────────────────────────────────────┐
│  PERFORMANCE MONITORING                    │
│  Quick Reference v1.0                      │
├────────────────────────────────────────────┤
│                                            │
│  CTQ METRICS (Critical to Quality):        │
│  TTFJ:          ≤ 10 min                   │
│  p95 Runtime:   ≤ 300 ms                   │
│  Error Rate:    < 1%                       │
│  API p95:       < 200 ms                   │
│  Lock Contention: < 1%                     │
│                                            │
│  DAILY CHECKS:                             │
│  □ Check dashboards                        │
│  □ Review overnight jobs                   │
│  □ Check error rates                       │
│  □ Review resource usage                   │
│  □ Note any anomalies                      │
│                                            │
│  COMMANDS:                                 │
│  gitvan metrics show                       │
│  curl /metrics                             │
│  open https://grafana/d/gitvan-overview    │
│                                            │
│  PROFILE SLOW OPERATIONS:                  │
│  node --prof src/cli.mjs run job           │
│  node --prof-process isolate-*.log         │
│                                            │
│  PERFORMANCE TESTS:                        │
│  npm run test:load                         │
│  npm run test:stress                       │
│  npm run benchmark                         │
│                                            │
└────────────────────────────────────────────┘
```

## CARD 6: Performance Monitoring (Back)

```
┌────────────────────────────────────────────┐
│  ALERT THRESHOLDS:                         │
│  Warning:  Metric 10% above target         │
│  Critical: Metric 50% above target         │
│                                            │
│  WHEN ALERT FIRES:                         │
│  1. Verify alert is real                   │
│  2. Check recent deployments               │
│  3. Review system resources                │
│  4. Check for errors in logs               │
│  5. Identify root cause                    │
│  6. Implement mitigation                   │
│                                            │
│  COMMON OPTIMIZATIONS:                     │
│  □ Cache frequently accessed data          │
│  □ Use Promise.all() for parallel ops      │
│  □ Optimize database queries               │
│  □ Add indexes to database                 │
│  □ Reduce bundle size                      │
│  □ Enable compression                      │
│                                            │
│  PERFORMANCE BUDGET:                       │
│  Cold start:    3 seconds                  │
│  Simple job:    300 ms (p95)               │
│  Complex job:   5 seconds (p95)            │
│  API call:      200 ms (p95)               │
│  Page load:     2 seconds                  │
│                                            │
│  MEASURE FIRST, OPTIMIZE SECOND            │
│  Premature optimization is evil!           │
│                                            │
└────────────────────────────────────────────┘
```

---

## Printing Instructions

### For Professional Printing:
1. Export each card as separate PDF
2. Print on 110lb cardstock
3. Laminate with 5mil laminating pouches
4. Trim to 4" x 6" size
5. Distribute to team members

### For In-House Printing:
1. Print on heavyweight cardstock (≥80lb)
2. Use self-laminating sheets
3. Cut carefully with paper trimmer
4. Keep extras for new team members

### Usage:
- Keep at workstation for quick reference
- Use during onboarding
- Reference during code reviews
- Update when procedures change
- Replace annually or when worn

---

**Last Updated**: 2026-01-08
**Version**: 1.0
