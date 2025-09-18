# GitVan v2 — AI PRD

## 1) Summary

Ship a **local-first, auditable AI layer** for GitVan that drafts routine developer artifacts (changelog, release notes, dev diary, PR summaries) using **templates + LLMs**, with **deterministic controls** and **Git-native receipts**. Default: **Ollama local**. Cloud models are **opt-in**.

---

## 2) Objectives & Success Metrics

* **TTFAI (time-to-first-AI job)** ≤ 5 min (install → `gitvan llm call` works).
* **Receipt coverage** 100% of AI calls include model, params, hashes, status.
* **Repro control** Seed recorded on 100% calls; `verify` passes on ≥ 95% (hash & metadata).
* **Security** 0 secrets leaked in receipts (sampled).
* **Adoption** ≥ 3 dark-matter AI recipes used by pilot teams within 30 days.

---

## 3) Scope (v2)

**In**

* Providers: **Ollama (default)**; **Generic HTTP**; **Vercel AI SDK** (opt-in).
* Ops: text **generate**, **embed** (single/batch), optional **stream to TTY**.
* Templates: **Nunjucks** prompts with repo context; string & file outputs.
* Receipts: **Git notes** (`refs/notes/gitvan/results`) with redaction.
* Events: cron + git-event triggering of AI jobs.
* Worktree-aware isolation & locking.

**Out**

* Fine-tuning, RAG store, hosted DB, proprietary telemetry, GUI.

---

## 4) Personas & JTBD (short)

* **Indie Dev**: “Draft my changelog on tag, locally, no setup.”
* **DevEx**: “Standardize AI helpers with audit.”
* **Compliance**: “Show me the **prompt, model, params, output hash** for any doc.”
* **SRE/Sec**: “No secret leakage, deterministic controls, offline default.”

---

## 5) User Stories

1. As a dev, I run `gitvan llm call "Summarize today"` and get output + a signed receipt.
2. On tag `vX.Y.Z`, a job renders **release notes** from a Nunjucks prompt using commit data.
3. A PR open event generates a **diff summary** with redaction and size/time limits.
4. I can re-verify a receipt later: recompute hashes and confirm integrity.
5. I can switch provider to cloud (Vercel AI) **only if I opt-in in config**.

---

## 6) Functional Requirements

### 6.1 Providers

* **Default**: Ollama at `http://localhost:11434`.
* **Optional**: `provider: 'vercel-ai' | 'http'` with baseURL/headers.
* Health check: `gitvan llm models list` returns models or clear error.

### 6.2 Operations

* **Generate**: text out; deterministic controls (seed, temp, top\_p, max\_tokens).
* **Embed**: returns vector & metadata (dims, model).
* **Stream**: print chunks; still write a final receipt.

### 6.3 Templates

* Prompts written in **Nunjucks**; filters include `inflection` set.
* Access to **git context** via composables (logs, diffs, files).
* Deterministic helpers: `nowISO`, `slug`, `json`.

### 6.4 Receipts (Git Notes)

* Stored under `refs/notes/gitvan/results`.
* Fields: `id`, `ts`, `commit`, `worktree`, `provider`, `model`, `params` (seed!), `promptHash`, `outputHash`, `status (OK|ERROR|TIMEOUT|TRUNCATED)`, `durationMs`, `redactions`, `limits`, `artifactPaths?`.
* **Redaction on by default**; configurable allow/deny patterns.
* **No raw secrets** in notes; large outputs stored as artifact files, note stores hash + path.

### 6.5 Limits & Policy

* Timeout (default 30s), max tokens/bytes, max prompt size, truncation policy.
* Optional **requireSigned** for event-driven AI jobs.

### 6.6 Worktree & Locks

* Per-worktree context; once-only execution via atomic `update-ref` lock: `refs/gitvan/locks/ai/<id>`.

### 6.7 CLI UX (mock help)

```
gitvan llm help
  call "<prompt>" [--model llama3.2] [--seed 123] [--temp 0.2] [--out file]
  embed "<text>" [--model nomic-embed-text] [--json]
  models list
  receipts list [--limit 50]
  receipts show <id>
  receipts verify <id>
  redact test "<text>"
  config show
```

### 6.8 Jobs & Events

* `jobs/**.mjs` may use AI via composables.
* Suffixes: `.cron.mjs` and `.evt.mjs` support AI actions in `run()`.

---

## 7) Configuration (gitvan.config.js)

* `ai.provider`: `"ollama" | "vercel-ai" | "http"` (default: `ollama`).
* `ai.ollama.baseURL`: default `http://localhost:11434`.
* `ai.http.baseURL`, `ai.http.headers`: optional.
* `ai.defaults`: `{ model, seed, temp, top_p, max_tokens, timeoutMs, maxOutputBytes }`.
* `ai.redact`: `{ enabled: true, patterns: [...], allowlist: [...], blocklist: [...] }`.
* `ai.receipts`: `{ ref: "refs/notes/gitvan/results", storeOutput: "hash|inline|file" }`.

---

## 8) Non-Functional

* **Perf**: non-model overhead p50 < 100ms; receipt write < 10ms.
* **Reliability**: retries with backoff (configurable); idempotent receipts.
* **Security/Privacy**: redaction default on; opt-in cloud; no secret persistence.
* **Portability**: works offline with Ollama; consistent across OSes.

---

## 9) Data Contracts (high-level)

* **AIRequest**: `{ provider, model, params, prompt|template, context }`.
* **AIResult**: `{ output, tokens?, usage?, durationMs }`.
* **AIReceipt**: as in §6.4 (append-only JSON in Git notes).

---

## 10) Rollout Plan

* **M1 (Core)**: Ollama generate/embed; receipts; redaction; CLI (`call|embed|models|receipts`).
* **M2 (Templates)**: Nunjucks prompt files; cookbook recipes (dev-diary, changelog, release notes).
* **M3 (Events)**: cron & event-triggered AI jobs; `verify` command.
* **M4 (Providers+)**: Vercel AI / HTTP provider opt-in; streaming; limits polish.

---

## 11) Acceptance Criteria

* Fresh repo + running Ollama → `gitvan llm call "hi"` works; note written.
* `gitvan llm receipts verify <id>` passes (hash + metadata).
* Redaction default removes tokens matching patterns; can be disabled per call/job.
* Tag event job generates release notes via template; receipt recorded.

---

## 12) Risks & Mitigations

* **Nondeterminism** → require/record seed; store output hash; receipts immutable.
* **Secret leakage** → default redaction + tests + allow/block lists.
* **Provider drift** → abstract provider; normalize receipts.
* **Large outputs** → enforce size limits; store as file artifact, hash in note.

---

## 13) Open Questions

* Include **cost** field (user-provided) in receipts?
* Standardize **model fingerprint** (hash) for verification?
* Add **policy hooks** (deny external providers on protected branches) in v2 or v2.x?

---

## 14) Outbound Docs to Ship

* **Quickstart (AI)**, **Security & Redaction**, **Receipts & Verify**, **Cookbook: dev-diary/changelog/release notes**, **Provider setup (Vercel AI / HTTP)**, **Troubleshooting (Ollama)**.

---

**Decision:** AI in GitVan v2 is **local-first, template-driven, receipt-centric**. Cloud is optional, not assumed. Determinism and audit are non-negotiable defaults.
