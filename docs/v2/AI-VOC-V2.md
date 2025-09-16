# Synthesized VOC — AI in GitVan v2

## Personas

* **Indie Dev / Maintainer** – local-first, hates setup, wants “one command” helpers.
* **Team DevEx** – standardize common tasks (changelog, release notes) with audit.
* **Compliance/Audit** – needs receipts: who/what/when/model/params/output-hash.
* **SRE/Sec** – deterministic, offline-capable, no secret leaks, predictable cost.

## Top Problems

1. Drafting routine docs (changelog, release notes, PR summaries) is tedious.
2. LLM usage feels opaque—no record of prompts/params/outputs.
3. CI adds latency & cost; local/offline use desired.
4. Copy/paste prompts is brittle; templating & reuse needed.
5. Security: prompts may include secrets; must redact by default.
6. Reproducibility: want seeds, params, and model fingerprints recorded.
7. Control: cap runtime/size, avoid surprise bills, zero extra infra.

## Jobs-To-Be-Done (JTBD)

* “When I tag a release, generate release notes I can trust and audit.”
* “When I push multiple commits, produce a daily dev diary in `dist/`.”
* “When a PR opens, summarize diffs for reviewers.”
* “When build fails, draft a human-readable explainer from logs.”
* “When I run a job, store a verifiable receipt in Git notes.”

## Must-Haves (Ranked)

1. **Local-first**: works with local Ollama by default; zero config.
2. **Receipts**: model id, params (incl. seed), prompt/output hashes, status, duration.
3. **Determinism controls**: seed, temp; record everything for audit/replay.
4. **Redaction**: prompt/output redaction on by default with patterns.
5. **Templates**: Nunjucks-based prompts with repo context (diff, log, files).
6. **Limits**: timeout + max output bytes; graceful truncation with receipt status.
7. **Worktree safety**: isolated runs/notes; no cross-branch bleed.
8. **CLI ergonomics**: `gitvan llm call|embed|verify`; useful defaults.
9. **Embeddings**: practical for doc search; record dims & hashes.
10. **No external DB**: all evidence in Git notes/artifacts.

## Nice-to-Haves

* Streaming to TTY with final receipt.
* Tool-call logging (metadata-only).
* Model probe (`models list`) and simple health check.
* Cost field (user-supplied) for budgeting.

## Sample “User Quotes”

* “Don’t make me set up cloud creds—just use my local model.”
* “If legal asks, I need to show exactly what prompt & params produced this.”
* “Redact secrets automatically—I don’t trust templates to be perfect.”
* “I want a buttoned-up changelog without opening ChatGPT in a browser.”

## Acceptance Criteria

* Works on a new repo with **no config** if Ollama is running.
* `gitvan llm call "…" --model llama3.2` writes a **receipt note** every time.
* Defaults set seed & temp; receipts include hashes and duration.
* Redaction enabled by default; can opt out per job.
* Timeouts and truncation reflected in `status: TIMEOUT|TRUNCATED`.
* Nunjucks prompt templates can reference git context (logs, diffs).
* `gitvan llm verify <receipt-id>` re-hashes content and passes.

## Non-Functional (NFRs)

* p50 call overhead (excluding model) < 100 ms; receipt write < 10 ms.
* No plaintext secrets in notes; redaction runs before write.
* Offline-capable; no network required beyond local model.
* Clear error surfaces; never silent-fail receipts.

## Risks & Mitigations

* **Model nondeterminism** → require/record seed + params; store raw output hash.
* **Secret leakage** → default redaction + allow/block lists + tests.
* **User confusion** → CLI help with sensible defaults; cookbook recipes.
* **Performance spikes** → output cap + timeout + truncation receipts.

## First Recipes (Dark-Matter 80/20)

* **Dev Diary** (daily summary from commits).
* **Changelog / Release Notes** (on tag).
* **PR Diff Summary** (on PR open/update).
* **Build Explainer** (on failure logs).
* **ADR Drafter** (from commit trailers).

## Success Metrics

* TTFW for first AI job ≤ **5 min**.
* ≥ **80%** of AI calls have valid receipts and pass `verify`.
* **0** unredacted secrets in sampled receipts.
* Replace ≥ **3** manual doc tasks per team.

## Hard Lines / Policy

* No persistent cloud storage of prompts/outputs by default.
* No sending content to remote providers without explicit opt-in config.
* Receipts are append-only; edits require new note with linkage.

---

**Summary:** Users want **local-first, audited, deterministic** AI helpers for boring developer docs—wired into Git, with templates, receipts, and redaction by default.
