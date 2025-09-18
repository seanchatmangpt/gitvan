# Voice of the Customer (VOC) — GitVan v2 (Synthetic)

## 1) Personas & JTBD

* **Product Dev (IC)**

  * *JTBD:* “When I commit, I want routine docs/tests/release notes to happen automatically, so I don’t burn time on glue.”
* **Release Engineer**

  * *JTBD:* “When a tag is cut, I need deterministic changelogs/release notes and zero rework.”
* **Compliance/Audit**

  * *JTBD:* “When asked to prove what happened, I need signed receipts and a printable bundle in minutes.”
* **SRE**

  * *JTBD:* “When jobs run, I need once-only execution and worktree isolation without standing up infra.”
* **Security**

  * *JTBD:* “When automation mutates repos, I need signatures, provenance, and simple allow/deny policy.”
* **Eng Manager**

  * *JTBD:* “When onboarding teams, I need a 10-minute path to value and visible usage metrics.”

## 2) Representative Quotes (synthetic)

* “I shouldn’t open a CI editor to add a doc task. Put it in Git with the code.”
* “If it ran, show me where, when, and why—**inside the repo**.”
* “Cron and event jobs should be race-free across worktrees.”
* “Give me a template engine that devs already grok.”
* “Receipts or it didn’t happen.”

## 3) Top Pains

1. Glue scripts drift; CI YAML sprawl.
2. No audit trail for routine jobs.
3. Undetected duplicate executions.
4. Slow ‘time-to-first-job’.
5. Non-deterministic outputs (especially LLM).
6. Worktree/branch interference.

## 4) Must-Haves (CTQs)

* **TTFJ < 10 min** with a minimal scaffold.
* **p95 ≤ 300 ms** for simple jobs; **p99 ≤ 800 ms**.
* **100% receipts** (git notes) for every run.
* **Once-only** via atomic locks; **worktree-aware** keys.
* **Nunjucks + inflection** out of the box.
* **Filesystem discovery**: `jobs/`, `events/`.
* **Determinism knobs**: `GITVAN_NOW`, seeded LLM, fixed env.

## 5) Should-Haves

* Dry-run/plan mode, artifact hashing, simple policy hooks, cron shorthand, friendly errors, playground repo.

## 6) Won’t-Haves (v2)

* External DB/queue, GUI designer, hosted control plane, marketplace UI.

## 7) Dark-Matter 80/20 Tasks (prioritized)

1. **Changelog** since last tag → `CHANGELOG.md`
2. **Release notes** on semver tag
3. **Dev diary** daily summary
4. **Build/test explainer** (LLM-optional)
5. **ADR drafter** from commit trailers
6. **Backport planner** / cherry-pick list
7. **Dependency change digest**
8. **Incident write-up starter**
9. **Reviewer routing** heuristics
10. **SBOM + diff** on tag

## 8) Acceptance Scenarios

* **On-demand:** `gitvan job run docs:changelog` → file written, receipt added, <300 ms.
* **Cron:** `events/cron/0_9_*_*_*.mjs` fires once at 09:00, no duplicates across worktrees.
* **Event:** `message.contains("release:")` triggers release note job; signed receipt recorded.
* **Failure:** non-zero child exit → `status: ERROR` receipt with stderr; no partial artifacts.

## 9) Objections & Responses

* *“Notes don’t replicate everywhere.”* → supported on major hosts; provide export fallback.
* *“Windows shell variance.”* → cross-platform exec helpers + cookbook examples.
* *“LLM nondeterminism.”* → seed & record params; receipts store raw output + hash.

## 10) Measurables (How we’ll know)

* **TTFJ** stopwatch from clean repo → first successful job.
* **Perf**: p50/p95/p99 job runtime on sample tasks.
* **Receipts coverage**: runs with notes / total runs = 100%.
* **Duplicates**: executions with same (job, sha, worktree) >1 **< 10 ppm**.
* **Adoption**: # repos using ≥3 recipes within 30 days.

## 11) Prioritized Requirements (MoSCoW)

**Must:** jobs/events FS scan, daemon, atomic locks, receipts, nunjucks+inflection, composables (`useGit`, `useTemplate`), config defaults, CLI `job|daemon|verify|diagnose`.
**Should:** dry-run/plan, artifact hash in receipts, helpful errors, scaffold command, playground.
**Could:** simple policy hook, audit pack (print bundle), LLM helpers.
**Won’t:** UI, external queue/DB, marketplace UI.

## 12) Success Definition (Customer-visible)

* “I dropped a file in `jobs/`, ran one command, and a deterministic artifact plus a signed receipt appeared—under a second—and I didn’t touch CI.”
