# GitVan v2 — Chat Copilot PRD

## 1) Summary

Conversational copilot to **draft, generate, preview, explain, and refine** GitVan jobs/events/templates. Offline-first (Ollama), **Zod-validated specs**, **sandboxed writes**, **deterministic receipts** in Git notes.

## 2) Goals / Non-Goals

**Goals**

* NL → **JobSpec/EventSpec/TemplateSpec** (valid JSON).
* **Preview diffs** before any write; opt-in apply.
* **Repo-aware** suggestions (branches, tags, job IDs, templates).
* **Determinism**: model + params + seeds + hashes in receipts.
* Works **local-only** by default; cloud optional.
* **Explain/Refactor** existing jobs & events.

**Non-Goals (v2)**

* GUI, multi-user chat, auto-PRs, cloud storage, RAG index.

## 3) Personas & JTBD

* **Indie Dev**: “Describe job; scaffold in minutes.”
* **DevEx**: “Standardized specs & scaffolds; low support.”
* **Release/Docs**: “Changelog/release notes templates from prompts.”
* **Compliance**: “Receipts tie prompt → files → run.”
* **SRE**: “No drift; safe defaults.”

## 4) Success Metrics

* **TTCJ** (prompt→valid spec) ≤ **2 min** p95.
* First-pass **Zod validation** ≥ **95%**.
* **0** unsafe writes outside sandbox.
* **100%** chat actions produce **receipts**.
* **p50 draft** roundtrip (local) < **2s**.

## 5) User Stories

1. As a dev, I **draft** a cron job via prompt, get a **valid spec** and **preview** diffs; I **apply** to write `jobs/**` + `templates/**`.
2. As a release lead, I **generate** a changelog job + Nunjucks template and **run once**; a **receipt** links prompt, spec, files, result.
3. As DevEx, I **explain** an existing event job in plain English and **refactor** triggers via chat, with a preview plan.

## 6) Functional Requirements

* **Chat modes**: `draft`, `generate`, `preview`, `apply`, `design` (guided), `explain`, `refactor`.
* **Validation**: all model outputs must **conform to Zod** JobSpec/EventSpec/TemplateSpec (no partials).
* **Sandbox**: writes limited to configured `jobs/` and `templates/` dirs; deny traversal; confirm-before-write default.
* **Receipts**: store under `refs/notes/gitvan/results`:

  * prompt hash, prompt text (redacted), spec hash, file hashes, model id, params, seed, timestamps, outcome.
* **Repo context**: enumerate existing jobs, templates, branches, tags, last tag, HEAD diff summary.
* **Determinism**: default temperature/seed; include in receipt.
* **Fallback (no LLM)**: guided wizard to produce the same Zod spec.
* **Policies**: consult `hooks` (e.g., SoD/allowlist) before apply.

## 7) UX & CLI (mock help)

```
gitvan chat [command]

Commands:
  draft        Draft a Job/Event/Template spec from a prompt (no writes)
  generate     Produce spec + proposed file scaffold (no writes)
  preview      Show diff/plan for the last generated spec
  apply        Write files for the last generated spec (with confirm)
  design       Interactive guided flow (no LLM required)
  explain      Explain an existing job/event in plain English
  refactor     Revise an existing job/event via prompt

Options:
  -m, --model <id>          LLM model (default: ollama:llama3.2)
  --seed <n>                Deterministic seed (default: 42)
  --temp <n>                Sampling temperature (default: 0.2)
  --no-confirm              Apply without confirmation
  --json                    Machine-readable output (spec/plan)
  --dir <path>              Root (defaults to repo root)
  -h, --help
```

**Flows**

* **draft**: prompt → Zod-valid JSON spec (no files).
* **generate**: spec + proposed file map (paths, contents, vars).
* **preview**: render diffs (create/overwrite), policy checks.
* **apply**: write files; stage optional; emit receipt.
* **explain/refactor**: load existing job → summary; new spec → preview → apply.

## 8) Data Contracts (names only; no code)

* **JobSpec**: `{ id, mode(on-demand|cron|event), kind(atomic|batch|daemon), cron?, on?, meta{desc,tags}, run() signature, files? }`
* **EventSpec**: `{ on: { any/all: [...], predicates (mergeTo, pushTo, tagCreate, semverTag, message, authorEmail, pathChanged/Added/Modified, signed) } }`
* **TemplateSpec**: `{ engine:"nunjucks", path, vars[], filters[], sampleData? }`
* **ChatReceipt**: `{ kind:"chat-receipt", promptHash, prompt, specHash, files:{path,hash}, model, params, seed, ts, status }`

## 9) Integrations

* **LLM**: default **Ollama** (local); pluggable provider via config.
* **Composables**: generated code uses `useGit`, `useTemplate`.
* **Jobs scanner**: new files discovered by `scanJobs`.
* **Runner/Daemon**: unchanged; receipts appended on apply/run.
* **Hooks**: `chat:beforeApply`, `chat:afterApply`, `policy:allowWrite`.

## 10) Security & Privacy

* Path normalization + sandbox.
* Redact secrets (env tokens, emails) from receipts unless opt-in.
* Optional “no prompt body” mode (hash only).
* Model/params/seeds always logged.

## 11) Performance Targets

* Load repo context < **100ms** (cached).
* LLM roundtrip p50 < **2s** on local 7B.
* Preview render < **100ms** for ≤ 20 files.

## 12) Telemetry (local)

* Counts: drafts, previews, applies, explains; validation pass/fail.
* Aggregate only; no network.

## 13) Rollout Plan

* **v2.0 (MVP)**: draft/generate/preview/apply, explain, wizard fallback, receipts, sandbox, policies.
* **v2.1**: refactor with code-aware edits, template linter, blueprints.
* **v2.2**: multi-file update mode, suggestion loops.

## 14) Acceptance Criteria

* Draft returns Zod-valid spec for 9/10 seed prompts.
* Apply never writes outside sandbox; confirmation default.
* Receipts present for every chat action; hashes verifiable.
* Explain outputs accurate summary for ≥ 90% standard jobs.
* All actions usable with LLM disabled (wizard path).

## 15) Open Questions

* Default redaction level in receipts?
* Auto-stage vs. leave untracked by default?
* Per-repo model presets & prompt templates in config?

---
