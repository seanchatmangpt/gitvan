# GitVan Latent JTBDs
## Novel Jobs Made Possible by Git-Native RDF Architecture

**Hypothesis**: Because GitVan combines Git-native execution, RDF semantic graphs, AI, and distributed DAG workflows, new categories of work become possible that couldn't exist before.

**Date**: 2026-01-10
**Version**: 4.0.2 (post-RDF consolidation)

---

## CONCEPTUAL FOUNDATION

### Why These JTBDs Are Latent (Hidden)

Existing solutions require:
- External databases (can't be version-controlled)
- Separate systems (git + CI/CD + analytics + automation = 4+ tools)
- Centralized state (can't work offline or across teams)
- Post-hoc analysis (can't intervene at decision points)

**GitVan enables:**
- Git is the database (all state versioned, auditable, signed)
- Single system (everything is git + RDF + composables)
- Distributed state (works offline, merges via git)
- Real-time intervention (hooks react at commit/push time)

### What Makes These Possible

1. **Git as runtime** → Every change is timestamped, signed, immutable
2. **RDF graphs** → Can ask "what changed?" in semantic terms
3. **10 git hooks** → Can intervene at any lifecycle point
4. **DAG workflows** → Complex multi-step automation
5. **AI integration** → LLMs can analyze and suggest
6. **git-native I/O** → No external services needed

---

## CATEGORY 1: SEMANTIC CODE UNDERSTANDING

### JTBD #1: "I want to understand code relationships semantically"

**Before**: Manual architecture diagrams, outdated documentation
**Now**: Automatic RDF graph of code structure

**What becomes possible:**
- Parse code to RDF (imports, exports, dependencies)
- Query: "Show all controllers that use this service"
- Query: "Find all code paths to database"
- Query: "What changed in the domain model?"
- Visualize as RDF graph (not just code files)

**Implementation sketch:**
```
Git Event: commit pushed
   ↓
Hook trigger: post-push
   ↓
Babel parser extracts AST
   ↓
Convert to RDF: imports, exports, types, dependencies
   ↓
Store in git notes as Turtle
   ↓
Later: SPARQL query "What uses this function?"
```

**Business value:**
- Developers understand codebase faster (semantic search)
- Architects verify design patterns (RDF queries)
- Refactoring impact analysis (trace dependencies)
- Compliance: "Is this PII ever cached?"

---

### JTBD #2: "I want automatic API documentation from code"

**Before**: Manual Swagger/OpenAPI docs (always out of sync)
**Now**: Auto-generated from code at commit time

**What becomes possible:**
- Extract API endpoints via Babel
- Store as RDF (methods, parameters, responses)
- Auto-generate OpenAPI on each commit
- Track breaking changes in git history
- CI automatically detects "version must bump"

**Implementation sketch:**
```
Git Event: commit with code change
   ↓
Extract function signatures (Babel)
   ↓
Classify as API endpoint (pattern matching)
   ↓
Store RDF: parameters, return types, deprecation status
   ↓
SPARQL query: "Did any return types change?"
   ↓
If breaking change: fail pre-commit, message to dev
```

**Business value:**
- API docs always match code (no manual sync)
- Breaking changes caught before release
- Client libraries can auto-update
- Non-breaking changes auto-documented

---

### JTBD #3: "I want to find code by semantic meaning, not keywords"

**Before**: `grep` for function names (misses intent)
**Now**: RDF graph shows what code actually does

**What becomes possible:**
- Query: "Find all error handlers" (semantic type)
- Query: "Find all database queries that aren't logged"
- Query: "Find all places using deprecated API"
- Query: "What code changed behavior without changing tests?"

**Implementation sketch:**
```
Post-commit hook:
  Babel parse code
  → Extract patterns (try/catch, DB calls, etc.)
  → Store as RDF with semantic types
  → git notes stores turtle

Later:
  SPARQL: "?x a code:ErrorHandler" → all error handlers
  SPARQL: "?query dc:references ?db. NOT (?query :hasLogging true)"
```

**Business value:**
- "Where are all the vulnerabilities?" becomes queryable
- Security scanning (check code properties, not just rules)
- Technical debt tracking (automatically discovered patterns)

---

## CATEGORY 2: INTELLIGENT CODE GENERATION

### JTBD #4: "I want boilerplate generated automatically"

**Before**: Copy-paste templates, manual code updates
**Now**: AI generates at commit time, stored in git

**What becomes possible:**
- Detect "new API endpoint needs test"
- AI generates test code
- Store generated code in git
- Developer reviews in PR
- Feedback improves future generation

**Implementation sketch:**
```
Git Event: push with new function
   ↓
Babel detects function signature
   ↓
SPARQL query: "Does this function have tests?"
   ↓
If no: trigger AI job
   ↓
AI generates test code (with context)
   ↓
Store generated code as new file
   ↓
Workflow creates commit with "Generated: tests for function X"
   ↓
Developer reviews: "Looks good" or "Fix this"
   ↓
AI learns from feedback
```

**Business value:**
- 30-50% less boilerplate code written by hand
- Tests improve (AI learns patterns)
- Consistency enforced (AI always generates same way)
- Code review faster (focus on logic, not structure)

---

### JTBD #5: "I want migrations generated from schema changes"

**Before**: Manual migration writing (error-prone, slow)
**Now**: Auto-generated from schema diff

**What becomes possible:**
- Detect schema change (ORM, SQL, GraphQL)
- Generate migration code
- Validate migration safety
- Store in git with history
- Rollback capability (all migrations in git)

**Implementation sketch:**
```
Git Event: commit with schema change
   ↓
Extract schema to RDF (fields, types, constraints)
   ↓
Compare with previous version (git diff of RDF)
   ↓
Generate migration code (AI or template)
   ↓
Validate: safe to run? (check data impact)
   ↓
Store migration in migrations/ directory
   ↓
Workflow: run migration on staging, verify
```

**Business value:**
- Faster releases (no migration bottleneck)
- Safer deployments (validated migrations)
- Audit trail (all changes tracked)
- Rollback capability (all in git)

---

## CATEGORY 3: DISTRIBUTED GOVERNANCE

### JTBD #6: "I want org policies enforced at commit time"

**Before**: Code review checklists, post-commit enforcement
**Now**: Policies enforced at pre-commit

**What becomes possible:**
- "No hardcoded passwords"
- "All commits need JIRA ticket"
- "Security team must approve crypto changes"
- "Database changes need DBA review"
- "Breaking API changes need 2 approvals"

**Implementation sketch:**
```
Pre-commit hook:
  Babel parse + pattern match
  SPARQL query: "Does ?file match :hasSensitiveData?"
  If yes: fail commit with message "Commit credentials detected"

Workflow: on failed policy
  → Create issue: "Policy violation: hardcoded password"
  → Tag: @security-team
  → Suggest fix: "Use environment variables"
```

**Business value:**
- Policies enforced 100% (not 80% via review)
- Faster commits (no review needed for approved changes)
- Clear audit trail (who violated, when, why)
- Org can adjust policies in git (no code deploy)

---

### JTBD #7: "I want role-based code review automation"

**Before**: Manual assignment of reviewers
**Now**: Semantic code ownership via git history

**What becomes possible:**
- RDF graph: who edited what, how often
- Query: "Who's the expert on payment code?"
- Auto-assign review to expert
- Learning: improve assignments over time
- Cross-team visibility (who knows database internals?)

**Implementation sketch:**
```
Post-push hook:
  Analyze diff: what code changed?
  SPARQL query changed files against code_ownership RDF
  → "payment.ts" is owned 60% by alice, 30% by bob

Workflow: create PR review assignment
  → Assign alice as primary reviewer
  → Bob as secondary (knowledge)
  → Send to slack: PR ready for review

Feedback: if review is good, increase owner score
```

**Business value:**
- Faster reviews (expert assigned immediately)
- Better reviews (expert in that code)
- Team growth (identify who's learning)
- Knowledge discovery (who should mentor?)

---

## CATEGORY 4: REAL-TIME SYSTEM UNDERSTANDING

### JTBD #8: "I want to know system behavior by analyzing commits"

**Before**: Run app, check logs, debug
**Now**: Commit patterns predict behavior

**What becomes possible:**
- "What changed in the last 10 commits?"
- "Did this feature slow the system down?"
- "What did this developer optimize?"
- "Is this code trying to work around a bug?"

**Implementation sketch:**
```
Post-commit hook:
  Extract commit message + code + metrics
  Store RDF: change type (feature/fix/perf), files, complexity

SPARQL query: "?change a :PerformanceChange"
  → Find all performance optimization commits

SPARQL query: "?commit :changes ?file. ?file a :DatabaseLayer"
  → Find all database-related changes
  → Alert: "DB changed, run performance tests"
```

**Business value:**
- "Why is the system slow?" becomes answerable
- Patterns visible (we keep fixing the same bug)
- Anticipate issues (detect brittleness in code)
- Learn from history (replay changes to understand)

---

### JTBD #9: "I want to detect anomalies in code patterns"

**Before**: Alerts on crashes (too late)
**Now**: Detect behavioral anomalies at commit time

**What becomes possible:**
- "This code looks unusual" (statistical anomaly)
- "This is a code smell" (pattern match)
- "This violates our architecture" (graph query)
- "This matches a known vulnerability" (pattern DB)

**Implementation sketch:**
```
Post-commit hook:
  Metrics: code complexity, test coverage, dependencies
  Store in RDF with historical context

SPARQL: "?commit has :complexity > average"
  → Flag: "Code getting complex, add tests?"

SPARQL: "?function uses :CryptoLib. NOT :hasReview"
  → Security review needed

SPARQL: "?change increases :cyclomatic_complexity by >50%"
  → Refactoring suggested
```

**Business value:**
- Proactive alerts (catch problems before production)
- Learning system (AI improves anomaly detection)
- Team health (code quality trending up/down)
- Risk management (security patterns automatically checked)

---

## CATEGORY 5: CONTINUOUS OPTIMIZATION

### JTBD #10: "I want automatic performance regression detection"

**Before**: Run benchmarks post-deployment, then debug
**Now**: Detect at commit time before merge

**What becomes possible:**
- Link commits to performance metrics
- Query: "Did this change slow us down?"
- Auto-bisect (find commit that regressed)
- Fail PR if performance regresses >5%

**Implementation sketch:**
```
Post-commit hook (on perf branch):
  Run benchmark suite
  Store results: commit SHA, latency, memory, throughput

Post-push hook (after merge):
  Compare branch metrics to main
  SPARQL: "Did latency increase > 5%?"
  If yes:
    → Revert commit
    → Create issue: "Performance regression: X%"
    → Link to specific benchmark
```

**Business value:**
- Catch performance bugs before users see them
- Automatic rollback of bad commits
- Performance treated like any other test
- Historical performance data (trends)

---

### JTBD #11: "I want automatic dependency optimization"

**Before**: Manual package.json review, security audits
**Now**: Continuous dependency analysis

**What becomes possible:**
- Detect: "This package has security vulnerability"
- Suggest: "Update to version X"
- Auto-test: "Does update break anything?"
- Batch updates: "Update 5 packages together"
- Track: "Which team uses this package?"

**Implementation sketch:**
```
Post-push hook:
  Extract package.json to RDF
  Query external vulnerability DB
  SPARQL: "?pkg has :vulnerability"

If vulnerable:
  → Create workflow job:
    1. Update package
    2. Run tests
    3. Run security scan
    4. Create PR if all pass
    5. Auto-merge if tests green for 1 week

Results stored in git for compliance
```

**Business value:**
- Security vulnerabilities fixed automatically
- Dependency updates don't break things
- Audit trail of all updates (git history)
- Team capacity freed (no manual updates)

---

## CATEGORY 6: ARCHITECTURAL COMPLIANCE

### JTBD #12: "I want to enforce architecture patterns automatically"

**Before**: Code review comments ("wrong layer")
**Now**: Pattern enforcement at pre-commit

**What becomes possible:**
- "Only services can call databases"
- "Controllers can't directly access DB"
- "All external API calls must have retry logic"
- "Security-sensitive code needs 2-person review"

**Implementation sketch:**
```
Pre-commit hook:
  Babel parse to RDF: who calls what

SPARQL: "?controller calls ?database. ?controller a :Controller"
  → If true: fail commit "Controllers can't directly call DB"

SPARQL: "?code calls :ExternalAPI. NOT (?code has :Retry)"
  → If true: fail commit "External calls need retry logic"
```

**Business value:**
- Architecture enforced (not just documented)
- Violations caught before merge
- New team members learn patterns automatically
- Refactoring safe (patterns maintained)

---

### JTBD #13: "I want to track technical debt automatically"

**Before**: Manual checklist, "we'll fix it later"
**Now**: Automatic discovery and tracking

**What becomes possible:**
- Detect: code that works but is fragile
- Track: TODOs, FIXMEs, hacks with context
- Prioritize: which debt is blocking new features
- Predict: "This will bite us in 3 months"

**Implementation sketch:**
```
Post-commit hook:
  Extract code metrics: complexity, coverage, duplication
  Store as RDF with change context

SPARQL: "?file has :complexity > 15 AND :coverage < 70%"
  → Technical debt in hard-to-understand code

SPARQL: "?comment contains 'FIXME'. ?file modified < 30 days ago"
  → Fresh technical debt (should fix soon)
```

**Business value:**
- Technical debt visible (can explain to exec)
- Prioritization data (fix highest-impact debt first)
- Prevention (detect debt creation, fix early)
- Team health (debt trending up/down)

---

## CATEGORY 7: INTELLIGENT TESTING

### JTBD #14: "I want test coverage optimized automatically"

**Before**: Manual test writing, coverage reports
**Now**: AI generates tests for gaps

**What becomes possible:**
- AI analyzes: "What paths not tested?"
- Generates: test cases for gaps
- Stores: in git with dev review
- Learns: improves over time
- Targets: high-risk code first

**Implementation sketch:**
```
Post-commit hook:
  Extract coverage data from tests
  Babel parse code to find untested paths

For each untested path:
  → AI generates test case
  → Store in __generated__.test.ts
  → Workflow:
    1. Run new test to verify it catches issues
    2. Auto-commit with "[AI] Test gap coverage"
    3. Dev reviews: approve or request changes
```

**Business value:**
- Coverage increases automatically (target 90%+)
- AI learns testing style (matches team conventions)
- Faster releases (less manual testing needed)
- Bug prevention (gaps identified and covered)

---

### JTBD #15: "I want mutation testing to be automatic"

**Before**: Manual process, expensive
**Now**: Continuous mutation analysis

**What becomes possible:**
- Auto-mutate code in CI
- Run tests against mutations
- Identify: tests that don't catch bugs
- Improve tests: AI suggests better assertions

**Implementation sketch:**
```
Post-push hook (on main):
  For each code change:
    1. Apply mutations (flip conditions, change values)
    2. Run tests against mutations
    3. If test didn't catch mutation: quality gap
    4. AI suggests: "Add assertion for X"
    5. Store results: which changes are well-tested
```

**Business value:**
- Test quality measured (not just quantity)
- Weak tests identified (kill-resistant mutations)
- Team learns (feedback on test effectiveness)
- Bug prevention (mutations catch logic errors)

---

## CATEGORY 8: COMPLIANCE & AUDIT

### JTBD #16: "I want compliance to be automatic and auditable"

**Before**: Manual compliance checklist, no trail
**Now**: Automated checks with immutable history

**What becomes possible:**
- "All PII must be encrypted" - checked per commit
- "Secrets must never be hardcoded" - fail pre-commit
- "All changes must have ticket" - enforce pre-commit
- Audit trail: prove compliance retroactively

**Implementation sketch:**
```
Pre-commit hook:
  Check all compliance rules (RDF-based)
  SPARQL query: "Does ?change violate ?compliance-rule?"

Store result in git: passed/failed + evidence

Post-audit (annual):
  Query all compliance checks for past year
  Generate report: "100% of commits compliant"
  Prove: every commit checked, no bypasses
```

**Business value:**
- Compliance automated (100% checked, not sampled)
- Audit trail immutable (stored in git, signed)
- Regulations: SOC2, HIPAA, GDPR evidence automatic
- Faster audits (all data in git)

---

### JTBD #17: "I want to track change authorization"

**Before**: Manual approval log, offline tracking
**Now**: Automatic approval at commit time

**What becomes possible:**
- Dangerous changes require approval
- Approve/deny via git workflow
- Track: who approved what, when
- Immutable: approvals signed in git

**Implementation sketch:**
```
Commit with label: [NEEDS-SECURITY-APPROVAL]
  → Workflow: send to security team

Security team: runs command
  $ gitvan approve <commit> --approver alice

Workflow:
  1. Verify alice is authorized to approve
  2. Add git note: approved by alice at timestamp
  3. Sign with alice's key
  4. Trigger deploy workflow

Audit: proves alice approved this change
```

**Business value:**
- Approval is traceable (signed by approver)
- Faster approval process (async, in git)
- Compliance evidence (who authorized what)
- Delegation clear (who can approve what)

---

## CATEGORY 9: TEAM DYNAMICS & LEARNING

### JTBD #18: "I want to understand team expertise automatically"

**Before**: Manual knowledge maps, forgotten
**Now**: Learned from code history

**What becomes possible:**
- "Who's the expert on authentication?"
- "Who's learning this codebase fastest?"
- "Who's blocked (needs help)?"
- "Skills needed: we don't have this expertise"

**Implementation sketch:**
```
Analyze git history (entire project):
  For each developer:
    - Files they changed (expertise area)
    - Code review feedback (teaching others)
    - PR size/complexity (experience level)
    - Collaboration patterns (team dynamics)

Store as RDF: expertise graph

Query: "Who's expert in payment code?"
  → alice (60% of changes), bob (20%), charlie (10%)

Workflow: assign payment PR to alice first
```

**Business value:**
- Onboarding faster (know who can mentor)
- Cross-training visible (team's growth)
- Bottleneck detection (knowledge concentrated)
- Mentorship pairing (learn from expert)

---

### JTBD #19: "I want to detect team health automatically"

**Before**: Annual surveys, hindsight
**Now**: Real-time from commit patterns

**What becomes possible:**
- Code review time trending up → team overloaded
- PRs sitting unreviewed → blocked developers
- Commit frequency dropping → possible burnout
- Silos forming → knowledge concentration

**Implementation sketch:**
```
Weekly analysis:
  SPARQL: "Average :code-review-time this week vs last month"
  If > 2x: alert "Team might be overloaded"

  SPARQL: "Developer :commits-waiting-review > 5"
  Alert: "Developer blocked on reviews"

  SPARQL: "?file :only-changed-by alice"
  Alert: "Knowledge silo: file only edited by one person"
```

**Business value:**
- Manager alerts: issues before they become critical
- Team capacity planning (data-driven)
- Burnout prevention (overwork visible early)
- Knowledge sharing encouraged (silos identified)

---

## CATEGORY 10: EXPERIMENTATION & LEARNING

### JTBD #20: "I want A/B testing of code patterns"

**Before**: One way to do things, hard to change
**Now**: Compare code approaches via branches

**What becomes possible:**
- Branch A: current approach
- Branch B: new approach
- Metrics: performance, quality, complexity
- Winner: merged, loser archived
- Learn: what patterns are better

**Implementation sketch:**
```
Two git branches:
  - main: current approach
  - experiment/new-pattern: new approach

Metrics collected automatically:
  - Test coverage
  - Complexity
  - Performance
  - Security findings

SPARQL: "Compare metrics main vs experiment"
Results:
  - Speed: 5% faster (win)
  - Coverage: 2% lower (lose)
  - Complexity: 15% higher (lose)

Decision: new pattern faster but harder to maintain
  → Keep main, learn for next time
```

**Business value:**
- Data-driven decisions on patterns
- Team learning (try new approaches safely)
- Continuous improvement (what works?)
- Risk reduction (validate before adopting)

---

### JTBD #21: "I want to measure developer productivity"

**Before**: Manual metrics, gaming possible
**Now**: Semantic metrics from code patterns

**What becomes possible:**
- "How productive is each developer?"
- "What makes developers productive?"
- "Are processes helping or hindering?"
- "Which teams are bottlenecks?"

**Implementation sketch:**
```
Metrics collected:
  - PR size, review time, merge time
  - Test coverage, quality findings
  - Code review feedback (teaching)
  - Collaboration (PR interactions)

SPARQL queries:
  "Who delivers working code fastest?"
  → large PR, few review iterations, passes tests first time

  "Who's helping team grow?"
  → reviews many PRs, detailed feedback, low follow-up issues

  "Who's struggling?"
  → long feedback cycles, tests fail multiple times, blocked often
```

**Business value:**
- Recognition (high performers visible)
- Support (struggling developers get help)
- Process improvement (bottlenecks identified)
- Career growth (feedback on progress)

---

## CATEGORY 11: NOVEL OPPORTUNITIES (Not Yet Conceived)

These are made possible by the unique combo of RDF + git + hooks + AI:

### JTBD #22: "I want my code to heal itself"

**Mechanism**: Commit introduces bug → hook detects pattern → AI fixes it → auto-commit

```
Post-commit hook detects:
  - Code pattern matches known bug (RDF pattern DB)
  - Test fails on new code
  - Security scan finds vulnerability

Workflow:
  1. AI analyzes the problematic code
  2. Generates fix (with explanation)
  3. Tests fix locally
  4. Auto-commits with "Fix: [reason]"
  5. Notes original issue for learning
```

**Business value**: Velocity increases (bugs fixed before human sees them)

---

### JTBD #23: "I want my team to work async yet synchronized"

**Mechanism**: RDF graph shows what others changed, AI suggests rebasing order

```
3 developers in different timezones push to feature branches

Workflow (runs on each push):
  1. Analyze: what did each change?
  2. Detect conflicts early (RDF diff)
  3. Suggest merge order (minimize conflicts)
  4. Auto-rebase when safe
  5. Notify: "Your branch ready, no conflicts"

Result: less manual conflict resolution
```

**Business value**: Async teams move faster (less coordination)

---

### JTBD #24: "I want breaking changes to be impossible to ship"

**Mechanism**: RDF graph tracks API contract, enforces compatibility

```
API change detected:
  - Parameter renamed
  - Return type changed
  - Endpoint removed

Pre-push hook:
  SPARQL: "Does ?change break ?contract?"
  If yes:
    - Fail push
    - Show who's using old API
    - Suggest: deprecation period or migration
    - Require: 2-week notice + new test cases
```

**Business value**: Production never broken (breaking changes impossible)

---

### JTBD #25: "I want continuous architecture evolution"

**Mechanism**: RDF model of system, detect and suggest evolution

```
Architecture model in RDF:
  - Services: payment, inventory, user
  - Relationships: what calls what
  - Constraints: who can call whom

Monitor: as code changes, update model

AI suggests: "You're doing X but designed for Y"
  → "If you keep doing X, refactor to Z"
  → "This pattern you're using elsewhere"

Visualization: show how architecture changes each week
```

**Business value**: Architecture stays intentional (not accidental)

---

## ENABLING FACTORS FOR THESE NOVEL JTBDs

All these become possible because:

1. **Git as runtime**: Every state change is timestamped, signed, immutable
2. **RDF semantic layer**: Can ask questions computers couldn't ask before
3. **10 git hooks**: Can intervene at precise moments (pre-commit, post-push, etc.)
4. **Composables API**: Extensible without modifying core
5. **DAG workflows**: Complex multi-step automation possible
6. **AI integration**: LLMs can analyze, suggest, generate
7. **No external services**: Works offline, across teams, completely auditable
8. **Deterministic**: Can replay history, make reproducible decisions
9. **git-native I/O**: Concurrent operations via git refs (no database needed)
10. **Distributed**: Works across teams automatically (everyone has full history)

---

## CATEGORIZED JTBD INVENTORY (25 JTBDs)

### Code Understanding (3)
- #1: Semantic code relationships
- #2: Automatic API documentation
- #3: Semantic code search

### Code Generation (3)
- #4: Automatic boilerplate
- #5: Migration generation

### Governance (2)
- #6: Org policy enforcement
- #7: Role-based review automation

### System Understanding (3)
- #8: Analyze commits to understand behavior
- #9: Anomaly detection
- #10: Performance regression detection

### Optimization (2)
- #10: Performance regression detection (overlap)
- #11: Automatic dependency optimization

### Architecture (2)
- #12: Pattern enforcement
- #13: Technical debt tracking

### Testing (2)
- #14: Coverage optimization
- #15: Mutation testing

### Compliance (2)
- #16: Automatic compliance
- #17: Change authorization tracking

### Team (2)
- #18: Expertise discovery
- #19: Team health signals

### Learning (1)
- #20: Code pattern A/B testing
- #21: Developer productivity metrics

### Novel (5)
- #22: Self-healing code
- #23: Async-yet-synchronized teams
- #24: Breaking change prevention
- #25: Continuous architecture evolution

---

## SUMMARY: WHAT'S NOW POSSIBLE

Because of GitVan's unique architecture:

**We can now ask questions that required external systems before:**
- "Is our code healthy?" (observable in real-time)
- "What changed and why?" (auditable in git)
- "Will this break something?" (computable from RDF)
- "Can I trust this deploy?" (proven via compliance checks)
- "Is my team productive?" (measured from patterns)
- "What should we refactor?" (detected via analysis)
- "Who owns this?" (learned from history)
- "Is this a vulnerability?" (pattern-matched against DB)

**And because everything is in git:**
- Every decision is reversible
- Every action is auditable
- Every pattern is learnable
- Every hypothesis is testable

This is why GitVan enables jobs that have never been possible before.

---

**Assessment Date**: 2026-01-10
**Framework**: Git-Native RDF + DAG Workflows + AI
**JTBDs Identified**: 25+ latent opportunities
**Technology Prerequisites**: Complete (v4.0.2)
