# Risk Assessment Matrix - Quick Reference

**Last Updated**: January 6, 2026
**Purpose**: At-a-glance bug prevention priorities

---

## Top 10 Priorities (Ranked by Bug Prevention ROI)

| # | Module | Risk | Hours | Bugs Prevented | ROI | Difficulty | When |
|---|--------|------|-------|----------------|-----|------------|------|
| 1 | **useLock + errors** | 10 | 6 | 48-72 | 8-12 | Hard | Week 2 |
| 2 | **dag-planner** | 10 | 6 | 42-60 | 7-10 | Hard | Week 2 |
| 3 | **hookable** | 10 | 4 | 28-36 | 7-9 | **Easy** | **Week 1** |
| 4 | **useJob + errors** | 10 | 8 | 56-80 | 7-10 | Hard | Week 2 |
| 5 | **useRegistry** | 7 | 3 | 18-24 | 6-8 | **Easy** | **Week 1** |
| 6 | **job-registry** | 7 | 3 | 15-21 | 5-7 | **Easy** | **Week 1** |
| 7 | **Git errors** | 10 | 8 | 48-72 | 6-9 | Hard | Week 3 |
| 8 | **usePack** | 9 | 8 | 48-72 | 6-9 | Hard | Week 3 |
| 9 | **workflow-engine** | 9 | 7 | 42-56 | 6-8 | Hard | Week 3 |
| 10 | **workflow cmd** | 9 | 4 | 24-32 | 6-8 | Medium | Week 4 |

**TOTAL**: 57 hours → **370-525 bugs prevented** (6.5-9.2 bugs/hour)

---

## Quick Win Modules (Week 1 - 19 hours)

**DO THESE FIRST!** - Maximum bugs prevented with minimal effort

| Module | Hours | Bugs | ROI | Why First? |
|--------|-------|------|-----|------------|
| hookable | 4 | 28-36 | 7-9 | **Easy** + System-wide impact |
| useRegistry | 3 | 18-24 | 6-8 | **Easy** + High severity bugs |
| job-registry | 3 | 15-21 | 5-7 | **Easy** + Core functionality |
| useReceipt | 3 | 12-18 | 4-6 | **Easy** + Audit compliance |
| hooks cmd | 2 | 8-12 | 4-6 | **Easy** + Quick test |
| cron cmd | 2 | 8-10 | 4-5 | **Easy** + Quick test |
| audit cmd | 2 | 6-8 | 3-4 | **Easy** + Quick test |

**Week 1 Total**: 19 hours → **95-129 bugs** → 5.0-6.8 bugs/hour → **10-15% coverage gain**

---

## Critical Modules (Weeks 2-3 - 44 hours)

**High Impact** - Worth the investment

| Module | Hours | Bugs | ROI | Risk |
|--------|-------|------|-----|------|
| useLock + errors | 6 | 48-72 | 8-12 | 🔴 Critical |
| dag-planner | 6 | 42-60 | 7-10 | 🔴 Critical |
| useJob + errors | 8 | 56-80 | 7-10 | 🔴 Critical |
| Git errors | 8 | 48-72 | 6-9 | 🔴 Critical |
| usePack | 8 | 48-72 | 6-9 | 🟠 High |
| workflow-engine | 7 | 42-56 | 6-8 | 🟠 High |
| graph-architecture | 5 | 25-35 | 5-7 | 🟠 High |
| useSchedule | 4 | 20-28 | 5-7 | 🟡 Medium |

**Weeks 2-3 Total**: 44 hours → **329-475 bugs** → 7.5-10.8 bugs/hour → **18-27% coverage gain**

---

## Risk Score Legend

| Score | Risk Level | Meaning | Action |
|-------|-----------|---------|--------|
| 10 | 🔴 Critical | System-breaking bugs likely | **Test immediately** |
| 8-9 | 🟠 High | Severe bugs probable | Test before production |
| 6-7 | 🟡 Medium | Moderate bugs possible | Test within sprint |
| 4-5 | 🟢 Low | Minor bugs may occur | Test when convenient |
| 1-3 | ⚪ Minimal | Unlikely to have bugs | Optional testing |

---

## Implementation Roadmap

```
Week 1 (19h): Quick Wins
├─ hookable (4h)           → 28-36 bugs
├─ useRegistry (3h)        → 18-24 bugs
├─ job-registry (3h)       → 15-21 bugs
├─ useReceipt (3h)         → 12-18 bugs
└─ CLI commands (6h)       → 22-30 bugs
   Expected: 95-129 bugs prevented, 70-75% coverage

Week 2-3 (44h): Critical Modules
├─ useLock + errors (6h)   → 48-72 bugs
├─ dag-planner (6h)        → 42-60 bugs
├─ useJob + errors (8h)    → 56-80 bugs
├─ Git errors (8h)         → 48-72 bugs
├─ usePack (8h)            → 48-72 bugs
├─ workflow-engine (7h)    → 42-56 bugs
├─ graph-architecture (5h) → 25-35 bugs
└─ useSchedule (4h)        → 20-28 bugs
   Expected: 329-475 bugs prevented, 78-82% coverage

Week 4 (13h): Medium Modules
├─ workflow cmd (4h)       → 24-32 bugs
├─ context-manager (4h)    → 20-28 bugs
└─ step-runner (5h)        → 20-30 bugs
   Expected: 64-90 bugs prevented, 80-85% coverage

Week 5 (8h): Polish
└─ cleanroom + docs (8h)   → 9-15 bugs
   Expected: 9-15 bugs prevented, 80%+ coverage verified
```

---

## ROI by Effort Level

### Easy Tests (10 hours total)

| Module | Hours | Bugs | ROI |
|--------|-------|------|-----|
| hookable | 4 | 28-36 | 7-9 |
| useRegistry | 3 | 18-24 | 6-8 |
| job-registry | 3 | 15-21 | 5-7 |

**Total**: 10 hours → **61-81 bugs** → **6.1-8.1 bugs/hour**

### Medium Tests (23 hours total)

| Module | Hours | Bugs | ROI |
|--------|-------|------|-----|
| useSchedule | 4 | 20-28 | 5-7 |
| workflow cmd | 4 | 24-32 | 6-8 |
| context-manager | 4 | 20-28 | 5-7 |
| step-runner | 5 | 20-30 | 4-6 |
| useReceipt | 3 | 12-18 | 4-6 |
| CLI commands | 3 | 12-18 | 4-6 |

**Total**: 23 hours → **108-154 bugs** → **4.7-6.7 bugs/hour**

### Hard Tests (44 hours total)

| Module | Hours | Bugs | ROI |
|--------|-------|------|-----|
| useLock | 6 | 48-72 | 8-12 |
| dag-planner | 6 | 42-60 | 7-10 |
| useJob | 8 | 56-80 | 7-10 |
| Git errors | 8 | 48-72 | 6-9 |
| usePack | 8 | 48-72 | 6-9 |
| workflow-engine | 7 | 42-56 | 6-8 |
| graph-architecture | 5 | 25-35 | 5-7 |

**Total**: 44 hours → **309-447 bugs** → **7.0-10.2 bugs/hour**

---

## Bug Severity Breakdown

### Critical (P0) - System Breaking

- useLock → Deadlocks, data corruption
- dag-planner → Infinite loops, wrong execution order
- useJob → Jobs not executed, silent failures
- hookable → System-wide cascading failures
- Git errors → Data loss, repository corruption

**Total**: 222-318 critical bugs prevented

### High (P1) - Major Functionality

- usePack → Security vulnerabilities, broken dependencies
- workflow-engine → Workflow failures, state bugs
- useSchedule → Missed schedules, timezone bugs
- useRegistry → Module not found errors

**Total**: 154-220 high-severity bugs prevented

### Medium (P2) - Moderate Impact

- useReceipt → Audit gaps, compliance issues
- CLI commands → UI bugs, validation failures
- context-manager → Context leakage
- step-runner → Step failures

**Total**: 121-171 medium-severity bugs prevented

---

## Decision Matrix

### Should I test this module first?

```
Is Risk Score ≥ 9?
├─ YES → Is it Easy/Medium difficulty?
│  ├─ YES → DO IT NOW (Week 1)
│  └─ NO → Schedule for Week 2-3
└─ NO → Is Risk Score ≥ 7?
   ├─ YES → Is it Easy difficulty?
   │  ├─ YES → DO IT NOW (Week 1)
   │  └─ NO → Schedule for Week 3-4
   └─ NO → Schedule for Week 4-5
```

### Is this a quick win?

**Quick Win Criteria**:
- Risk Score ≥ 7 AND
- Difficulty = Easy AND
- Hours ≤ 4 AND
- ROI ≥ 5 bugs/hour

**Quick Wins**: hookable, useRegistry, job-registry

---

## Success Metrics

### Coverage Targets

| Milestone | Coverage | Bugs Prevented | Hours |
|-----------|----------|----------------|-------|
| **Baseline** | 60-70% | 0 | 0 |
| **Week 1** | 70-75% | 95-129 | 19 |
| **Week 3** | 78-82% | 424-604 | 63 |
| **Week 5** | 80-85% | 497-709 | 84 |

### Break-Even Analysis

**Cost**: 84 hours × $100/hour = $8,400

**Benefit**: 497-709 bugs × $500/bug = $248,500 - $354,500

**NET VALUE**: $240,100 - $346,100

**ROI**: 2,858% - 4,120%

**Break-Even**: After **17 hours** (Week 1 Quick Wins)

---

## Next Steps

### This Week

1. **Generate coverage baseline**
   ```bash
   npm test -- --coverage
   ```

2. **Start with hookable.mjs** (4 hours, 28-36 bugs)
   - Highest ROI easy module
   - System-wide impact

3. **Then useRegistry** (3 hours, 18-24 bugs)
   - Easy to test
   - Critical functionality

4. **Then job-registry** (3 hours, 15-21 bugs)
   - Easy to test
   - Core functionality

### Expected Week 1 Results

- **10 hours invested** → **61-81 bugs prevented**
- **ROI**: 6.1-8.1 bugs/hour
- **Coverage**: +8-12% improvement
- **Break-even achieved!**

---

## Reference Links

**Full Analysis**: RISK_ASSESSMENT_MATRIX.md (1,266 lines)
**Test Plan**: TEST_IMPROVEMENT_ACTION_PLAN.md
**Coverage Analysis**: TEST_COVERAGE_ANALYSIS.md
**Summary**: TEST_COVERAGE_SUMMARY.md

---

**Status**: ✅ Ready for Implementation
**Last Updated**: January 6, 2026
**Next Review**: After Week 1

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│  🏆 TOP 3 PRIORITIES (DO FIRST!)               │
├─────────────────────────────────────────────────┤
│  1. hookable (4h) → 28-36 bugs | EASY          │
│  2. useRegistry (3h) → 18-24 bugs | EASY       │
│  3. job-registry (3h) → 15-21 bugs | EASY      │
├─────────────────────────────────────────────────┤
│  Total: 10h → 61-81 bugs → 6.1-8.1 bugs/hour   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  🎯 CRITICAL MODULES (WEEK 2-3)                │
├─────────────────────────────────────────────────┤
│  • useLock + errors (6h) → 48-72 bugs          │
│  • dag-planner (6h) → 42-60 bugs                │
│  • useJob + errors (8h) → 56-80 bugs            │
│  • Git errors (8h) → 48-72 bugs                 │
├─────────────────────────────────────────────────┤
│  Total: 28h → 194-284 bugs → 6.9-10.1 bugs/h   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  📊 TOTAL PROJECT                               │
├─────────────────────────────────────────────────┤
│  Time: 84 hours (5 weeks @ 20h/week)           │
│  Bugs: 497-709 bugs prevented                   │
│  ROI: 5.9-8.4 bugs/hour                         │
│  Value: $240,100 - $346,100                     │
│  Coverage: 60-70% → 80-85%                      │
└─────────────────────────────────────────────────┘
```

**START TODAY: Test hookable.mjs (4 hours, 28-36 bugs prevented)** 🚀
