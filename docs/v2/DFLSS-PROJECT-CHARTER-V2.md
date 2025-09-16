# DfLSS (DMADV) Project Charter — GitVan v2

**Project:** GitVan v2 — Git-Native Jobs, Events, Receipts + Chat Copilot
**Owner:** Sean (Solution Architect) **Sponsor:** VP Engineering
**Stakeholders:** DevEx, Release Eng, Docs, SRE, Security, Compliance

---

## 1) Problem / Opportunity (Define)

Teams burn time wiring ad-hoc scripts/CI for routine work. Drift, audit gaps, and tool sprawl persist. We can encode **automation, state, and audit inside Git**—with a composables API, Nunjucks templates, and signed receipts—now extended by a **chat copilot** that drafts/validates jobs via Zod.

---

## 2) Voice of Customer → CTQs

**VOC highlights**

* “Time-to-first-job must be minutes, not hours.”
* “No extra infra; run everywhere Git runs.”
* “Prove what ran, when, and why.”
* “Let me describe the job in English and get valid code.”

**Critical-to-Quality (CTQs)**

* **CTQ-1:** TTFJ ≤ **10 min** from `npm i` to first artifact.
* **CTQ-2:** p95 on-demand job runtime ≤ **300 ms** (simple jobs).
* **CTQ-3:** **100%** runs produce a verifiable **receipt** (git notes).
* **CTQ-4:** **0** unsafe writes outside sandboxed dirs.
* **CTQ-5:** Chat **prompt → Zod-valid spec** success ≥ **95%** first pass.
* **CTQ-6:** Worktree-safe, once-only execution (lock contention < **1%**).

---

## 3) Y = f(X) (Primary Metrics)

* **Y1 TTFJ (min)** = f(scaffolder UX, defaults, examples).
* **Y2 p95 runtime (ms)** = f(exec strategy, spawn cost, caching).
* **Y3 Receipt coverage (%)** = f(runner hooks, failure paths).
* **Y4 Unsafe writes (count)** = f(sandbox, path guards, dry-run UI).
* **Y5 Chat valid-spec rate (%)** = f(prompting, Zod schemas, repo context).
* **Y6 Lock contention (%)** = f(ref design, retry/backoff, worktree scope).

---

## 4) Goals & Non-Goals

**Goals**

* Git-only runtime (jobs/events/cron), composables (`useGit`, `useTemplate`, `useExec`), Nunjucks w/ inflection filters, receipts, worktree-aware locks.
* **Chat copilot** (draft/generate/preview/apply/explain/refactor) with **Zod** schemas and **Ollama** default provider; deterministic receipts.
* Cookbook of **dark-matter 80/20** recipes (docs, release, hygiene).

**Non-Goals (v2)**

* Hosted control plane, multi-tenant UI, enterprise RBAC, cloud artifact store, PR automation.

---

## 5) Scope

**In-scope**

* Single package; ESM; pure JS runtime.
* Filesystem job discovery; event predicates; cron scheduler.
* Git notes receipts; atomic ref locks; worktree awareness.
* Chat CLI with sandboxed writes and confirmation.
* Docs, playground, test suite, cookbook.

**Out-of-scope**

* DB migrations, external queues, GUI, non-Git SCMs.

---

## 6) Baseline (Current State)

Repo contains: CLI, jobs/cron/events runner, composables, Nunjucks engine (+inflection), config loader, daemon, tests (unit/integration/E2E), playground, C4 docs, specs.
Gaps: full event matrix hardening, lock telemetry, chat apply/policy hooks, diff preview polish, acceptance automation.

---

## 7) Deliverables

* **Core**: job system, cron, events, locks, receipts, composables, Nunjucks filters.
* **Chat Copilot**: `gitvan chat draft|generate|preview|apply|explain|refactor|design`.
* **Schemas**: Zod JobSpec/EventSpec/TemplateSpec; ChatReceipt.
* **Cookbook**: ≥ **30** recipes (dev-diary, changelog, release-notes, ADR, build explainer, SBOM stub, backport planner).
* **Docs**: Quickstart, API, Cookbook, Playground, Audit guide.
* **Quality**: perf baselines, determinism tests, path-safety tests.

---

## 8) Plan (DMADV)

**Define** (now)

* Charter, VOC→CTQs locked; success metrics instrumented.

**Measure**

* Benchmarks: spawn/exec/template p95; lock contention; chat valid-spec rate.
* Telemetry (local only): drafts, previews, applies, failures.

**Analyze**

* Event predicate coverage (tag/merge/push/path/message/signature).
* Lock semantics across worktrees; retry/backoff tuning.
* Chat failure modes → prompt & schema adjustments.

**Design**

* Chat flows + sandboxed apply + receipts; policy hooks (`chat:beforeApply`, `policy:allowWrite`).
* Diff/plan renderer; deterministic env (TZ/LANG/seed/model capture).
* Cookbook v1; test harnesses.

**Verify**

* Pilot in 3 repos; meet CTQs; finalize docs; tag **v2 GA**.

---

## 9) Milestones

* **M1 Core Hardening**: event matrix, locks, receipts QA.
* **M2 Chat MVP**: draft/generate/preview/apply, wizard fallback, receipts.
* **M3 Cookbook v1**: ≥ 30 recipes + playground E2E.
* **M4 Perf & Verify**: hit CTQs, pilot sign-off, GA docs.

---

## 10) Risks & Mitigations

* **Git edge cases (platform variance)** → CI matrix & fixture repos.
* **Spec drift (chat)** → strict Zod, retry/prompting, wizard fallback.
* **Non-deterministic steps** → record seeds/params; receipts w/ hashes.
* **Lock collisions** → per-worktree scoping + `update-ref --create-reflog`/retry jitter.
* **Unsafe writes** → sandboxed paths + confirm-by-default + policy hook.

---

## 11) RACI

* **Responsible:** Sean (arch/impl), DevEx (CLI/composables), Docs (cookbook), QA (tests).
* **Accountable:** Sponsor.
* **Consulted:** SRE, Security, Compliance.
* **Informed:** Eng org.

---

## 12) Communication

* Weekly 15-min status; milestone demos; receipts + metrics published to repo (`docs/status`).

---

## 13) Financial Impact (est.)

* Replace 2–3 SaaS tools/team; save **5–10 hrs/week/team**; audit prep ↓ **90%**; faster onboarding to automation.

---

## 14) Acceptance Criteria (GA)

* TTFJ ≤ 10 min; p95 runtime ≤ 300 ms simple jobs.
* **100%** receipt coverage; verifiable hashes & model params.
* **0** sandbox escapes across test matrix.
* Chat **≥95%** Zod-valid on first pass for standard prompts; wizard path covers remaining.
* Lock contention < 1% under concurrent daemons/worktrees.
* Cookbook installed and runnable in playground + pilots.

---
