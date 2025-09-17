Got it — here are lean, working **implementations for the new files** (pure ESM, minimal deps, aligned with your existing modules). Drop them under `src/` as shown.

---

### `src/utils/logger.mjs`

```js
const LVL = (process.env.GITVAN_LOG_LEVEL || "info").toLowerCase();
const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

export function createLogger(tag = "gitvan") {
  const cur = LEVELS[LVL] ?? 3;
  const fmt = (lvl, ...a) => console[lvl](`[${tag}]`, ...a);
  return {
    level: LVL,
    error: (...a) => cur >= 1 && fmt("error", ...a),
    warn: (...a) => cur >= 2 && fmt("warn", ...a),
    info: (...a) => cur >= 3 && fmt("log", ...a),
    debug: (...a) => cur >= 4 && fmt("log", ...a),
    child(sub) { return createLogger(`${tag}:${sub}`); }
  };
}
```

### `src/utils/time.mjs`

```js
export const nowISO = () => new Date().toISOString();
export const toUTC = (d) => new Date(typeof d === "string" ? d : d.getTime());
export function clampMs(ms, min = 0, max = 60_000) {
  return Math.max(min, Math.min(ms, max));
}
```

### `src/utils/fs.mjs`

```js
import { resolve, normalize, sep } from "pathe";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

export function resolveSafe(root, p) {
  const abs = normalize(resolve(root, p));
  const normRoot = normalize(resolve(root));
  if (!abs.startsWith(normRoot + sep) && abs !== normRoot) {
    throw new Error(`Path escapes root: ${p}`);
  }
  return abs;
}

export function writeFileSafe(root, out, contents) {
  const abs = resolveSafe(root, out);
  mkdirSync(abs.substring(0, abs.lastIndexOf(sep)), { recursive: true });
  writeFileSync(abs, contents);
  return abs;
}

export function readFileSafe(root, p, enc = "utf8") {
  return readFileSync(resolveSafe(root, p), enc);
}
```

### `src/utils/crypto.mjs`

```js
import { createHash } from "node:crypto";

export function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

export function fingerprint(obj) {
  const stable = JSON.stringify(obj, Object.keys(obj).sort());
  return "fp_" + sha256Hex(stable).slice(0, 16);
}
```

### `src/utils/worktree.mjs`

```js
import { useGit } from "../composables/git.mjs";

export async function getWorktreeInfo() {
  const git = useGit();
  const commonDir = await git.run("rev-parse --git-common-dir");
  const worktree = await git.run("rev-parse --show-toplevel");
  const head = await git.head();
  const branch = await git.getCurrentBranch();
  return { commonDir, worktree, branch, head };
}

export async function worktreeKey() {
  const { commonDir, worktree, branch } = await getWorktreeInfo();
  return `${commonDir}#${worktree}#${branch}`;
}
```

---

## Router

### `src/router/matchers/path.mjs`

```js
function anyMatch(globs = [], files = []) {
  if (!globs?.length) return false;
  // naive glob: "*" wildcard only (keep simple; your scan/events can precompute)
  const toRe = (g) => new RegExp("^" + g.split("*").map(escape).join(".*") + "$");
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ress = globs.map(toRe);
  return files.some((f) => ress.some((r) => r.test(f)));
}

export function pathChanged(pred, meta) {
  const files = meta.filesChanged || [];
  return anyMatch(pred.pathChanged, files);
}
export function pathAdded(pred, meta) {
  const files = meta.filesAdded || [];
  return anyMatch(pred.pathAdded, files);
}
export function pathModified(pred, meta) {
  const files = meta.filesModified || [];
  return anyMatch(pred.pathModified, files);
}
```

### `src/router/matchers/tag.mjs`

```js
export function tagCreate(pred, meta) {
  if (!meta.tagsCreated?.length) return false;
  if (typeof pred.tagCreate === "string") {
    const re = new RegExp(pred.tagCreate);
    return meta.tagsCreated.some((t) => re.test(t));
  }
  return true;
}

export function semverTag(pred, meta) {
  const re = /^v?\d+\.\d+\.\d+(?:[-+].*)?$/;
  return (meta.tagsCreated || []).some((t) => re.test(t));
}
```

### `src/router/matchers/merge.mjs`

```js
export function mergeTo(pred, meta) {
  if (!meta.mergedTo) return false;
  const want = pred.mergeTo;
  return typeof want === "string" ? meta.mergedTo === want : false;
}

export function branchCreate(pred, meta) {
  if (!meta.branchCreated) return false;
  const want = pred.branchCreate;
  if (!want) return true;
  const re = new RegExp(want);
  return re.test(meta.branchCreated);
}
```

### `src/router/matchers/commit.mjs`

```js
export function message(pred, meta) {
  if (!pred.message) return false;
  const re = new RegExp(pred.message, "i");
  return re.test(meta.message || "");
}

export function authorEmail(pred, meta) {
  if (!pred.authorEmail) return false;
  const re = new RegExp(pred.authorEmail, "i");
  return re.test(meta.authorEmail || "");
}

export function signed(pred, meta) {
  return !!meta.signed;
}
```

### `src/router/events.mjs`

```js
import * as P from "./matchers/path.mjs";
import * as T from "./matchers/tag.mjs";
import * as M from "./matchers/merge.mjs";
import * as C from "./matchers/commit.mjs";

const handlers = {
  pathChanged: P.pathChanged,
  pathAdded: P.pathAdded,
  pathModified: P.pathModified,
  tagCreate: T.tagCreate,
  semverTag: T.semverTag,
  mergeTo: M.mergeTo,
  branchCreate: M.branchCreate,
  message: C.message,
  authorEmail: C.authorEmail,
  signed: C.signed,
};

export function matches(on, meta) {
  if (!on || typeof on !== "object") return false;
  if (on.any?.length) {
    if (on.any.some((p) => matches(p, meta))) return true;
  }
  if (on.all?.length) {
    if (!on.all.every((p) => matches(p, meta))) return false;
  }
  for (const [k, v] of Object.entries(on)) {
    if (k === "any" || k === "all") continue;
    const fn = handlers[k];
    if (fn && fn({ [k]: v }, meta)) return true;
  }
  // if only all[] present and passed, it's a match
  return !!on.all?.length;
}
```

---

## Schemas (Zod)

### `src/schemas/event.zod.mjs`

```js
import { z } from "zod";

export const EventPredicate = z.object({
  any: z.lazy(() => z.array(EventPredicate)).optional(),
  all: z.lazy(() => z.array(EventPredicate)).optional(),

  tagCreate: z.string().optional(),
  semverTag: z.boolean().optional(),
  mergeTo: z.string().optional(),
  branchCreate: z.string().optional(),

  pathChanged: z.array(z.string()).optional(),
  pathAdded: z.array(z.string()).optional(),
  pathModified: z.array(z.string()).optional(),

  message: z.string().optional(),
  authorEmail: z.string().optional(),
  signed: z.boolean().optional(),
});
```

### `src/schemas/job.zod.mjs`

```js
import { z } from "zod";
import { EventPredicate } from "./event.zod.mjs";

export const JobMeta = z.object({
  id: z.string().optional(),
  desc: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const JobDef = z.object({
  id: z.string().optional(),
  kind: z.enum(["atomic", "batch", "daemon"]).default("atomic"),
  cron: z.string().optional(),
  meta: JobMeta.optional(),
  on: EventPredicate.optional(),
  run: z.function().args(z.object({ ctx: z.any(), payload: z.any().optional() })).returns(z.any()),
  mode: z.enum(["on-demand", "cron", "event"]).optional(),
  filename: z.string().optional(),
  filePath: z.string().optional(),
  version: z.string().optional(),
});
```

### `src/schemas/receipt.zod.mjs`

```js
import { z } from "zod";

export const Receipt = z.object({
  kind: z.literal("workflow-receipt"),
  id: z.string(),
  status: z.enum(["OK", "ERROR", "SKIP"]),
  ts: z.string(),
  commit: z.string().optional(),
  action: z.string(),
  env: z.record(z.string(), z.any()).optional(),
  outputHash: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
  artifacts: z.array(z.string()).default([]),
  fingerprint: z.string().optional(),
});
```

### `src/schemas/config.zod.mjs`

```js
import { z } from "zod";

export const ConfigSchema = z.object({
  rootDir: z.string().default(process.cwd()),
  jobs: z.object({ dir: z.string().default("jobs") }).default({}),
  templates: z.object({
    engine: z.literal("nunjucks").default("nunjucks"),
    dirs: z.array(z.string()).default(["templates"]),
    autoescape: z.boolean().default(false)
  }).default({}),
  receipts: z.object({
    ref: z.string().default("refs/notes/gitvan/results")
  }).default({}),
  hooks: z.record(z.string(), z.any()).default({}),
});
```

### `src/schemas/chat.zod.mjs`

```js
import { z } from "zod";

export const ChatInput = z.object({
  prompt: z.string(),
  kind: z.enum(["job", "event"]).default("job"),
  id: z.string().optional(),
  path: z.string().optional(),
});

export const ChatOutput = z.object({
  ok: z.boolean().default(true),
  id: z.string(),
  mode: z.enum(["on-demand", "cron", "event"]).default("on-demand"),
  filePath: z.string(),
  source: z.string(), // emitted module text
  summary: z.string().optional(),
});
```

---

## AI

### `src/ai/ollama.mjs`

```js
const BASE = process.env.OLLAMA_BASE || "http://localhost:11434";

export async function generate({ model, prompt, options = {}, stream = false }) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, options, stream })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const j = await res.json();
  return j.response || "";
}

export async function embed({ model, text }) {
  const res = await fetch(`${BASE}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt: text })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const j = await res.json();
  return j.embedding || [];
}
```

### `src/ai/provider.mjs`

```js
import { generate as ollamaGenerate } from "./ollama.mjs";

/**
 * Minimal provider facade; extend to Vercel AI SDK if installed.
 */
export async function generateText({ model = process.env.GITVAN_MODEL || "llama3.2", prompt, options }) {
  return await ollamaGenerate({ model, prompt, options });
}
```

### `src/ai/prompts/job-writer.njk`

```njk
Emit ONLY valid ESM for a GitVan job module:

import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { desc: "{{ desc | default('Generated job') }}", tags: {{ tags | default("[]") }} },
  {% if cron %}cron: "{{ cron }}",{% endif %}
  {% if on %}on: {{ on | safe }},{% endif %}
  async run({ ctx, payload }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    {{ body | default("// TODO: implement") }}
    return { ok: true, artifacts: [] }
  }
})
```

*(same pattern for `event-writer.njk`, `refiner.njk`, tailored as needed)*

---

## CLI

### `src/cli/cron.mjs`

```js
import { startCronScheduler, CronCLI } from "../jobs/cron.mjs";

export async function cronCommand(sub = "list", args = {}) {
  const cli = new CronCLI();
  if (sub === "list") return cli.list();
  if (sub === "start") return cli.start();
  if (sub === "dry-run") return cli.dryRun(args.at);
  throw new Error(`Unknown cron subcommand: ${sub}`);
}

export async function cronStart() { return startCronScheduler(); }
```

### `src/cli/daemon.mjs`

```js
import { startDaemon, daemonStatus, stopDaemon } from "../runtime/daemon.mjs";

export async function daemonCommand(sub = "start", args = {}) {
  if (sub === "start") return startDaemon(args);
  if (sub === "status") return daemonStatus();
  if (sub === "stop") return stopDaemon();
  throw new Error(`Unknown daemon subcommand: ${sub}`);
}
```

### `src/cli/event.mjs`

```js
import { scanJobs } from "../jobs/scan.mjs";
import { matches } from "../router/events.mjs";
import { loadOptions } from "../config/loader.mjs";

export async function eventSimulate(meta = {}) {
  const cfg = await loadOptions();
  const jobs = await scanJobs({ cwd: cfg.rootDir });
  const evtJobs = jobs.filter((j) => j.on);
  const hits = evtJobs.filter((j) => matches(j.on, meta)).map((j) => j.id);
  console.log(`Matched ${hits.length} jobs:`);
  hits.forEach((id) => console.log("  -", id));
  return hits;
}
```

### `src/cli/audit.mjs`

```js
import { useGit } from "../composables/git.mjs";
import { writeFileSafe } from "../utils/fs.mjs";
import { loadOptions } from "../config/loader.mjs";

export async function auditBuild({ out = "dist/audit.json" } = {}) {
  const cfg = await loadOptions();
  const git = useGit();
  const list = await git.run(`notes --ref=${cfg.receipts.ref} list`).catch(() => "");
  const lines = list.split("\n").filter(Boolean);
  const receipts = [];
  for (const l of lines) {
    const sha = l.split(" ")[0];
    const raw = await git.run(`notes --ref=${cfg.receipts.ref} show ${sha}`).catch(() => null);
    if (!raw) continue;
    try { receipts.push(JSON.parse(raw)); } catch {}
  }
  const abs = writeFileSafe(cfg.rootDir, out, JSON.stringify({ count: receipts.length, receipts }, null, 2));
  console.log(`Audit pack written: ${abs} (${receipts.length} receipts)`);
  return { path: abs, count: receipts.length };
}
```

### `src/cli/chat.mjs`

```js
import { loadOptions } from "../config/loader.mjs";
import { ensureNunjucksEnv } from "../utils/nunjucks-config.mjs";
import { writeFileSafe } from "../utils/fs.mjs";
import { ChatInput, ChatOutput } from "../schemas/chat.zod.mjs";
import { JobDef } from "../schemas/job.zod.mjs";
import { generateText } from "../ai/provider.mjs";
import { fingerprint } from "../utils/crypto.mjs";
import { join, dirname } from "pathe";

export async function chatGenerate(input) {
  const cfg = await loadOptions();
  const args = ChatInput.parse(input);

  // Build prompt via Nunjucks template (job-writer)
  const env = ensureNunjucksEnv(cfg.rootDir, { paths: [join(process.cwd(), "src/ai/prompts")] });
  const tmpl = env.getTemplate("job-writer.njk");
  const prompt = tmpl.render({
    desc: `Generate a ${args.kind} for GitVan`,
    tags: ["generated","chat"],
    cron: args.kind === "event" ? null : undefined,
    on: args.kind === "event" ? "{ \"message\": \".*\" }" : undefined,
    body: "// minimal generated body"
  });

  const source = await generateText({ prompt });
  // Quick structural sanity (loads module shape via regex fallback)
  if (!/defineJob\s*\(/.test(source)) {
    throw new Error("Generated output is not a GitVan job module");
  }

  // Decide file path
  const id = args.id || `chat-${fingerprint({ t: Date.now(), prompt: args.prompt })}`;
  const subdir = args.kind === "event" ? "events/chat" : "jobs/chat";
  const fname = `${id}${args.kind === "event" ? ".evt.mjs" : ".mjs"}`;
  const rel = args.path || join(subdir, fname);

  const outPath = writeFileSafe(cfg.rootDir, rel, source);

  // Optionally import & validate runtime (best-effort, isolated by dynamic import)
  try {
    const m = await import("file://" + outPath);
    if (m?.default) JobDef.parse(m.default); // lightweight runtime check
  } catch { /* ignore soft failures */ }

  return ChatOutput.parse({
    ok: true,
    id,
    mode: args.kind === "event" ? "event" : "on-demand",
    filePath: outPath,
    source,
    summary: "Generated via chat interface"
  });
}
```

---

## Notes

* These modules are intentionally **thin adapters** over your existing engine (`jobs/*`, `runtime/*`, `composables/*`), keeping surface area small.
* The router uses **minimal glob/regex** to stay dependency-light; you can later swap to your richer path diff.
* `chat.mjs` templates look up `src/ai/prompts/*`; you already ship Nunjucks — this reuses your stack.
* Zod schemas are **non-breaking** and align with your current `defineJob` contract.
* The CLI wrappers (`cron/daemon/event/audit/chat`) avoid touching your current `src/cli/job.mjs` and `src/cli.mjs`.

If you want, I can also add **mock CLI help** entries for these new commands next.

Here’s the **target `src/` layout for GitVan v2 (complete)** — no code, just structure:

```
src/
├─ index.mjs
├─ index.ts
│
├─ cli/
│  ├─ cli.mjs                 # entry / dispatcher for subcommands
│  ├─ job.mjs                 # job list/run/plan/show/locks
│  ├─ cron.mjs                # cron list/dry-run/start
│  ├─ daemon.mjs              # daemon start/status/stop
│  ├─ event.mjs               # event simulate/test predicates
│  ├─ audit.mjs               # build/verify audit pack (receipts)
│  └─ chat.mjs                # conversational job/event generator
│
├─ composables/
│  ├─ ctx.mjs                 # unctx context
│  ├─ git.mjs                 # git ops (notes/locks/worktree-safe)
│  ├─ template.mjs            # nunjucks+inflection, render/renderToFile
│  ├─ exec.mjs                # deterministic exec/spawn wrapper
│  └─ index.mjs               # re-exports
│
├─ config/
│  ├─ defaults.mjs            # opinionated defaults (nunjucks only)
│  ├─ loader.mjs              # load+merge project config
│  └─ runtime-config.mjs      # normalization + serializability checks
│
├─ jobs/
│  ├─ define.mjs              # defineJob() validation + freeze
│  ├─ scan.mjs                # FS discovery (.mjs, *.cron.mjs, *.evt.mjs)
│  ├─ runner.mjs              # execution engine + receipts
│  ├─ hooks.mjs               # lifecycle hooks (before/after)
│  ├─ cron.mjs                # scheduler core (parse/match/next)
│  ├─ events.mjs              # event bus (predicates → trigger)
│  └─ daemon.mjs              # tick loop (locks + dispatch)
│
├─ runtime/
│  ├─ boot.mjs                # process bootstrap (env, UTC, seeds)
│  ├─ config.mjs              # resolved runtime options snapshot
│  ├─ define-job.mjs          # job module adapter (default export)
│  ├─ events.mjs              # runtime predicate evaluation
│  ├─ locks.mjs               # refs/gitvan/locks/** atomic ops
│  ├─ receipt.mjs             # refs/notes/gitvan/results JSON writer
│  └─ utils.mjs               # shared helpers (hashing, ids, etc.)
│
├─ router/
│  ├─ events.mjs              # high-level matcher orchestrator
│  └─ matchers/
│     ├─ path.mjs             # pathChanged/Added/Modified
│     ├─ tag.mjs              # tagCreate/semverTag
│     ├─ merge.mjs            # mergeTo / branchCreate
│     └─ commit.mjs           # message/author/signed
│
├─ schemas/
│  ├─ job.zod.mjs             # job/meta/on/cron/run schema
│  ├─ event.zod.mjs           # event predicates schema
│  ├─ receipt.zod.mjs         # receipt/audit schema
│  ├─ config.zod.mjs          # gitvan.config schema
│  └─ chat.zod.mjs            # conversational generation I/O
│
├─ ai/
│  ├─ provider.mjs            # Vercel AI SDK bridge (Ollama default)
│  ├─ ollama.mjs              # direct Ollama HTTP client (fallback)
│  └─ prompts/
│     ├─ job-writer.njk       # “emit valid job module” prompt
│     ├─ event-writer.njk     # “emit valid event job” prompt
│     └─ refiner.njk          # schema-guided refinement
│
└─ utils/
   ├─ nunjucks-config.mjs     # env, loaders, filters (inflection/json)
   ├─ fs.mjs                  # safe FS helpers (rooted paths)
   ├─ time.mjs                # nowISO/cron windows/UTC
   ├─ crypto.mjs              # content hashes/fingerprints
   ├─ logger.mjs              # tagged console/logger
   └─ worktree.mjs            # worktree detection/scope helpers
```
