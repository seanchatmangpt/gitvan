Press Release — Expert GitVan Cookbook

SEBASTOPOL, CA — September 15, 2025 — O’Reilly Media today announced Expert GitVan Cookbook, a practical guide to building Git-only workflows that implement the 43 classic workflow patterns (van der Aalst) with a tiny JavaScript DSL, a noun–verb CLI, and an optional daemon. The book focuses on the 80/20 “dark-matter” developer tasks—diaries, changelogs, reviews, release notes, SBOMs—and shows how to automate them with deterministic, signed, auditable receipts inside Git.

“Git is already the runtime. This book shows how to encode automation as commits, notes, tags, and refs—then let a lightweight daemon do the rest,” said the authors.

Key outcomes

Ship repeatable workflows with no servers, no runners, no DB.

Map patterns to Git primitives: commits, branches, merges, tags, notes.

Use a noun–verb CLI (gitvan recipe run changelog).

Run an always-on daemon for commit/tag/cron triggers.

Add LLM steps for summaries, reviews, and explanations with signed receipts.

Availability
Expert GitVan Cookbook is available today in eBook and Early Release formats on O’Reilly Learning, with print following. Companion code and recipes ship as a pnpm monorepo (JS, no TypeScript).

What’s inside

Part I — Foundations

Git as runtime: determinism, idempotence, receipts

The 43 patterns → Git (sequence, parallelSplit, synchronize, discriminator, etc.)

Project structure: pnpm monorepo, ESM, happy-path JS

Part II — Core Components

@gitvan/core: Git wrapper + pattern helpers

@gitvan/cli: noun–verb commands (repo init, recipe add/run, daemon start)

@gitvan/daemon: event predicates (commit, tag, path, cron), once-only locks, receipts

@gitvan/llm: Ollama provider with prompt/params/output recorded in notes

@gitvan/schemas: Zod schemas for recipes, notes, receipts (validated JSON)

Part III — Dark-Matter 80/20 Cookbook

Dev diary, changelog, release notes, code-review assist

Build-log explainer, dependency bump explainer, ADR drafter

Standup collector, backport planner, hotfix lane, incident write-up

SBOM + diff, security digest, reviewer routing, test prioritization

Part IV — Enterprise Patterns

Separation of duties, signed policy refs, protected branches

Printable audit bundles from notes; disaster controls and checkpoints

Multi-repo orchestration with submodules and worktrees

Appendices

Schemas, receipts, example notes

CLI reference (noun–verb)

Reproducible runs checklist

Who it’s for

Senior engineers and staff+ who want deterministic, auditable automation without CI sprawl.

Dev leads who need pragmatic, copy-paste recipes for the work everyone wants but nobody has time to wire.

Platform and compliance teams standardizing signed workflows.

Why it matters

Compression: one substrate (Git) replaces scattered scripts, runners, and dashboards.

Determinism: every action leaves a signed receipt under refs/notes/gitvan/results.

Adoption speed: install a cookbook recipe, run it, get proofs—in minutes.

Pricing and formats

eBook (EPUB/PDF), Early Release chapters, and print.

Companion monorepo under Apache-2.0; book content © O’Reilly.

About O’Reilly

O’Reilly provides technology and business training, knowledge, and insight to help companies succeed.

Media inquiries: press@oreilly.com

FAQ (Working-Backwards)

Q: What is GitVan?
A small JS layer that treats Git as the workflow engine. Patterns are commits/branches/merges/tags; case data lives in notes; an optional daemon executes steps; every run is recorded as a signed receipt.

Q: How is this different from CI/CD?
No hosted runners or YAML queues. Git is the queue and ledger. Policy lives in protected branches and signatures. Outputs are deterministic and auditable by default.

Q: Do I need TypeScript or a database?
No. The reference project is pure JS (ESM), no TypeScript, no DB.

Q: What are requirements?
Git ≥ 2.30, Node ≥ 18, optional Ollama for LLM steps, pnpm for the monorepo.

Q: How do LLMs fit without losing determinism?
Prompts, parameters, model IDs, and outputs are stored as receipts. Use seeds for stability when the model supports it.

Q: How do I start?
gitvan repo init → gitvan cookbook install dev-diary → gitvan recipe run dev-diary → gitvan daemon start.

Q: Is this production-safe?
Yes, with guarded policies: require signed merges/tags, SoD hooks, receipts enforced. The book includes audit bundles and disaster controls.

Q: What about enterprises and multi-repo flows?
Use submodules/worktrees for fan-out/fan-in; enforce policy via signed refs; generate organization-level audit packs.

Q: What’s in the companion code?
@gitvan/core, @gitvan/cli, @gitvan/daemon, @gitvan/llm, @gitvan/schemas, and 20+ ready recipes for the dark-matter 80/20 set.

Q: License?
Code Apache-2.0. Book under O’Reilly terms.

End of press release & FAQ.

You said:
We do need a gitvan.config.js app
ChatGPT said:
Thought for 19s

Here’s the minimal, happy-path gitvan.config.js + loader + CLI hook. Pure JS, ESM, no TS.

1) gitvan.config.js (at repo root)
// gitvan.config.js
export default {
  repo: {
    dir: process.cwd(),
    defaultBranch: "main",
    notesRef: "refs/notes/gitvan",
    resultsRef: "refs/notes/gitvan/results",
    signing: { require: true }
  },

  llm: {
    baseURL: process.env.OLLAMA_BASE || "http://localhost:11434",
    model: "llama3.2",
    temperature: 0.2
  },

  cookbook: {
    install: [
      "dev-diary",
      "changelog"
    ]
  },

  // Declarative triggers → actions. These get materialized as git notes.
  events: [
    {
      id: "daily-dev-diary",
      wf: "cron",
      cron: "0 18 * * *",                 // 18:00 UTC daily
      run: { type: "llm-call",
             model: "llama3.2",
             prompt: "Summarize today’s commits into a diary entry." }
    },
    {
      id: "tag-changelog",
      wf: "event",
      on: { semverTag: true },
      run: { type: "cli-call",
             cmd: "bash",
             args: ["-lc","git log $(git describe --tags --abbrev=0 --always --tags --match 'v*')..HEAD --pretty=format:'* %s' > CHANGELOG.md && git add CHANGELOG.md && git commit -m 'chore: update changelog'"] }
    }
  ]
};

2) Loader: /packages/core/config.js
// @gitvan/core/config.js
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const defaults = (cwd) => ({
  repo: { dir: cwd, defaultBranch: "main", notesRef: "refs/notes/gitvan", resultsRef: "refs/notes/gitvan/results", signing: { require: false } },
  llm:  { baseURL: process.env.OLLAMA_BASE || "http://localhost:11434", model: "llama3.2", temperature: 0.2 },
  cookbook: { install: [] },
  events: []
});

export async function loadConfig(cwd = process.cwd()) {
  const base = defaults(cwd);
  const f = path.join(cwd, "gitvan.config.js");
  const l = path.join(cwd, ".gitvan.local.js");
  let cfg = base;
  if (fs.existsSync(f)) cfg = { ...cfg, ...(await import(pathToFileURL(f).href)).default };
  if (fs.existsSync(l)) cfg = { ...cfg, ...(await import(pathToFileURL(l).href)).default };
  return cfg;
}

3) CLI: add config noun with show and apply

Edit /packages/cli/bin/gitvan.js and add:

import { loadConfig } from "@gitvan/core/config.js";
import { NOTES_REF } from "@gitvan/core/index.js";

// ...

const config = defineCommand({
  meta: { name: "config" },
  subCommands: {
    show: defineCommand({
      run: async () => { console.log(JSON.stringify(await loadConfig(), null, 2)); }
    }),
    apply: defineCommand({
      run: async () => {
        const cfg = await loadConfig();
        // install cookbook recipes
        for (const name of (cfg.cookbook?.install || [])) {
          const p = new URL(`../../cookbook/recipes/${name}.json`, import.meta.url);
          const json = fs.readFileSync(p, "utf8");
          await core.git.note(json, cfg.repo.notesRef || NOTES_REF);
        }
        // materialize events as workflow notes on an empty commit
        await core.git.exec(`commit --allow-empty -m "gitvan:config ${new Date().toISOString()}"`);
        for (const ev of (cfg.events || [])) {
          await core.git.note(JSON.stringify(ev), cfg.repo.notesRef || NOTES_REF);
        }
        console.log("config applied");
      }
    })
  }
});

// include in main
const main = defineCommand({
  meta: { name: "gitvan" },
  subCommands: { repo, recipe, cookbook, conversation, daemon: daemonCmd, llm: llmCmd, config }
});

4) Daemon: read LLM baseURL from config (optional)

In /packages/llm/index.js:

import { loadConfig } from "@gitvan/core/config.js";

export async function generate({ model, prompt, options = {} }) {
  const cfg = await loadConfig();
  const base = cfg.llm?.baseURL || "http://localhost:11434";
  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: model || cfg.llm?.model, prompt, options, stream: false })
  });
  const j = await res.json();
  return j.response || "";
}

5) Use
pnpm i
gitvan repo init
gitvan config show
gitvan config apply
gitvan daemon start


This keeps everything Git-only: config → notes via config apply, daemon consumes notes, cookbook recipes preloaded.

You said:
Is there a better practice than index.js
ChatGPT said:
Thought for 8s

Yes. Prefer explicit modules + export maps over index.js barrels.

Structure
packages/core/
  package.json
  src/
    git.js
    workflow.js
    notes.js
    config.js

package.json (ESM, subpath exports)
{
  "name": "@gitvan/core",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/workflow.js",
    "./git": "./src/git.js",
    "./notes": "./src/notes.js",
    "./config": "./src/config.js"
  },
  "files": ["src"],
  "sideEffects": false
}

Imports
import { sequence, milestone } from "@gitvan/core";       // from workflow.js
import { exec, note } from "@gitvan/core/git";
import { loadConfig } from "@gitvan/core/config";

Guidelines

One module per concern. No catch-all index.js.

Named exports only. Easier tree-shaking and DX.

Export maps define the public API. No deep relative imports.

sideEffects: false for better bundling.

Whitelist files to keep publishes small.

Keep CLI binaries in bin/, not exported.

CLI example (@gitvan/cli)
packages/cli/
  package.json
  bin/gitvan.js

{
  "name": "@gitvan/cli",
  "type": "module",
  "bin": { "gitvan": "bin/gitvan.js" },
  "dependencies": {
    "@gitvan/core": "workspace:*"
  }
}


This keeps APIs explicit, stable, and importable without index.js.

You said:
Focus now on the full project structure 
ChatGPT said:
Thought for 13s

Here’s the full pnpm monorepo structure for gitvan. Pure JS (ESM). No index.js. Explicit modules + export maps. Happy path.

gitvan/
├─ package.json
├─ pnpm-workspace.yaml
├─ .gitignore
├─ README.md
├─ gitvan.config.js
├─ scripts/
│  ├─ seed-roadmap.mjs
│  └─ demo.mjs
└─ packages/
   ├─ core/
   │  ├─ package.json
   │  └─ src/
   │     ├─ git.js
   │     ├─ workflow.js
   │     ├─ notes.js
   │     └─ config.js
   ├─ cli/
   │  ├─ package.json
   │  └─ bin/
   │     └─ gitvan.js
   ├─ daemon/
   │  ├─ package.json
   │  └─ src/
   │     ├─ predicates.js
   │     ├─ actions.js
   │     └─ loop.js
   ├─ llm/
   │  ├─ package.json
   │  └─ src/
   │     ├─ provider.js
   │     └─ embed.js
   ├─ schemas/
   │  ├─ package.json
   │  └─ src/
   │     ├─ recipe.js
   │     ├─ note.js
   │     └─ receipt.js
   └─ cookbook/
      ├─ package.json
      └─ recipes/
         ├─ dev-diary.json
         └─ changelog.json

root /package.json
{
  "name": "gitvan-monorepo",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "pnpm -r start",
    "cli": "node packages/cli/bin/gitvan.js"
  }
}

/pnpm-workspace.yaml
packages:
  - "packages/*"

/gitvan.config.js
export default {
  repo: { dir: process.cwd(), defaultBranch: "main", notesRef: "refs/notes/gitvan", resultsRef: "refs/notes/gitvan/results", signing: { require: true } },
  llm:  { baseURL: process.env.OLLAMA_BASE || "http://localhost:11434", model: "llama3.2", temperature: 0.2 },
  cookbook: { install: ["dev-diary", "changelog"] },
  events: [
    { id: "daily-dev-diary", wf: "cron", cron: "0 18 * * *", run: { type: "llm-call", model: "llama3.2", prompt: "Summarize today’s commits into a diary entry." } },
    { id: "tag-changelog", wf: "event", on: { semverTag: true }, run: { type: "cli-call", cmd: "bash", args: ["-lc","git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:'* %s' > CHANGELOG.md && git add CHANGELOG.md && git commit -m 'chore: update changelog'"] } }
  ]
};

@gitvan/core
packages/core/package.json
{
  "name": "@gitvan/core",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/workflow.js",
    "./git": "./src/git.js",
    "./notes": "./src/notes.js",
    "./config": "./src/config.js"
  },
  "files": ["src"],
  "sideEffects": false
}

src/git.js
import { execSync } from "node:child_process";
import fs from "node:fs";
const sh = (cmd) => execSync(`git -C "${process.cwd()}" ${cmd}`, { stdio: ["ignore","pipe","inherit"] }).toString().trim();

export const git = {
  init: async ({ dir }) => { if (!fs.existsSync(`${dir}/.git`)) sh("init"); },
  exec: async (cmd) => sh(cmd),
  checkout: async (ref) => sh(`checkout ${ref}`),
  branch: async (name) => sh(`checkout -b ${name}`),
  merge: async (ref, msg) => sh(`merge --no-ff -m "${msg||`merge ${ref}`}" ${ref}`),
  tag: async (name, msg) => sh(`tag -a ${name} -m "${msg||name}"`),
  note: async (message, ref) => sh(`notes --ref=${ref} add -m '${String(message).replace(/'/g,"'\\''")}'`),
  configUser: async (name,email) => { sh(`config user.name "${name}"`); sh(`config user.email "${email}"`); }
};

src/notes.js
export const NOTES_REF = "refs/notes/gitvan";
export const RESULTS_REF = "refs/notes/gitvan/results";

src/config.js
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const defaults = (cwd) => ({
  repo: { dir: cwd, defaultBranch: "main", notesRef: "refs/notes/gitvan", resultsRef: "refs/notes/gitvan/results", signing: { require: false } },
  llm:  { baseURL: process.env.OLLAMA_BASE || "http://localhost:11434", model: "llama3.2", temperature: 0.2 },
  cookbook: { install: [] },
  events: []
});

export async function loadConfig(cwd = process.cwd()) {
  let cfg = defaults(cwd);
  const f = path.join(cwd, "gitvan.config.js");
  if (fs.existsSync(f)) cfg = { ...cfg, ...(await import(pathToFileURL(f).href)).default };
  return cfg;
}

src/workflow.js
import { git } from "./git.js";
import { NOTES_REF } from "./notes.js";

export async function sequence(msg){ await git.exec(`commit --allow-empty -m "${msg}"`); }
export async function milestone(tag){ await git.exec(`tag -a ${tag} -m "${tag}"`); }
export async function taskData(key,value){ await git.note(JSON.stringify({ kind:"task-data",[key]:value }), NOTES_REF); }

@gitvan/cli
packages/cli/package.json
{
  "name": "@gitvan/cli",
  "version": "0.0.0",
  "type": "module",
  "bin": { "gitvan": "bin/gitvan.js" },
  "dependencies": {
    "citty": "^0.1.6",
    "@gitvan/core": "workspace:*",
    "@gitvan/daemon": "workspace:*",
    "@gitvan/llm": "workspace:*",
    "@gitvan/schemas": "workspace:*"
  }
}

bin/gitvan.js
#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { git } from "@gitvan/core/git";
import { NOTES_REF, RESULTS_REF } from "@gitvan/core/notes";
import { loadConfig } from "@gitvan/core/config";
import * as wf from "@gitvan/core";
import * as daemon from "@gitvan/daemon/loop";
import { RecipeSchema } from "@gitvan/schemas/recipe";
import fs from "node:fs";

// noun–verb
const repo = defineCommand({
  meta: { name: "repo" },
  subCommands: {
    init: defineCommand({ run: async () => { await git.init({ dir: process.cwd() }); await git.configUser("Workflow Bot","bot@example.com"); console.log("repo ready"); } }),
    verify: defineCommand({ run: async () => console.log("verify ok") })
  }
});

const recipe = defineCommand({
  meta: { name: "recipe" },
  subCommands: {
    add: defineCommand({ args:{ file:{ type:"positional", required:true } }, run: async ({args}) => {
      const obj = JSON.parse(fs.readFileSync(args.file,"utf8")); const j = RecipeSchema.parse(obj);
      await git.note(JSON.stringify(j), NOTES_REF); console.log("added:", j.name);
    }}),
    run: defineCommand({ args:{ id:{ type:"positional", required:true } }, run: async ({args}) => {
      // scan notes for recipe with name/id, then apply minimal steps inline
      const list = await git.exec(`notes --ref=${NOTES_REF} list`);
      for (const l of list.split("\n").filter(Boolean)) {
        const sha = l.split(" ")[0]; const raw = await git.exec(`notes --ref=${NOTES_REF} show ${sha}`);
        try { const r = JSON.parse(raw); if (r.kind==="gitvan-recipe" && (r.name===args.id||r.id===args.id)) {
          for (const s of r.steps) {
            if (s.kind==="sequence") await wf.sequence(s.args?.msg || s.id);
            if (s.kind==="milestone") await wf.milestone(s.args?.tag || s.id);
            if (s.kind==="taskData") await wf.taskData(s.args.key, s.args.value);
            if (s.kind==="cli-call") await git.exec(`${s.args.cmd} ${(s.args.args||[]).join(" ")}`);
          }
          await git.note(JSON.stringify({ kind:"recipe-run", name:r.name, ts:new Date().toISOString() }), RESULTS_REF);
          console.log("ran:", r.name); break;
        }} catch {}
      }
    }})
  }
});

const cookbook = defineCommand({
  meta: { name: "cookbook" },
  subCommands: {
    install: defineCommand({ args:{ name:{ type:"positional", required:true } }, run: async ({args}) => {
      const p = new URL(`../../cookbook/recipes/${args.name}.json`, import.meta.url);
      const json = fs.readFileSync(p, "utf8"); await git.note(json, NOTES_REF); console.log("installed:", args.name);
    }})
  }
});

const config = defineCommand({
  meta: { name: "config" },
  subCommands: {
    show: defineCommand({ run: async () => console.log(JSON.stringify(await loadConfig(),null,2)) }),
    apply: defineCommand({ run: async () => {
      const cfg = await loadConfig();
      for (const name of (cfg.cookbook?.install||[])) {
        const p = new URL(`../../cookbook/recipes/${name}.json`, import.meta.url);
        await git.note(fs.readFileSync(p,"utf8"), cfg.repo.notesRef || NOTES_REF);
      }
      await git.exec(`commit --allow-empty -m "gitvan:config ${new Date().toISOString()}"`);
      for (const ev of (cfg.events||[])) await git.note(JSON.stringify(ev), cfg.repo.notesRef || NOTES_REF);
      console.log("config applied");
    }})
  }
});

const daemonCmd = defineCommand({
  meta: { name: "daemon" },
  subCommands: {
    start: defineCommand({ args:{ interval:{ type:"string", default:"1500" } }, run: async ({args}) => daemon.loop({ intervalMs:Number(args.interval) }) }),
    once: defineCommand({ run: async () => daemon.tick() })
  }
});

const main = defineCommand({
  meta: { name: "gitvan" },
  subCommands: { repo, recipe, cookbook, config, daemon: daemonCmd }
});
runMain(main);

@gitvan/daemon
packages/daemon/package.json
{
  "name": "@gitvan/daemon",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/loop.js",
    "./loop": "./src/loop.js",
    "./predicates": "./src/predicates.js",
    "./actions": "./src/actions.js"
  },
  "dependencies": {
    "@gitvan/core": "workspace:*",
    "@gitvan/llm": "workspace:*"
  }
}

src/predicates.js
import { git } from "@gitvan/core/git";

export async function commitMeta(sha){
  const parents = (await git.exec(`rev-list --parents -n 1 ${sha}`)).split(" ").slice(1);
  const msg = await git.exec(`log -1 --pretty=%B ${sha}`);
  const branches = (await git.exec(`branch --contains ${sha} --format="%(refname:short)"`)).split("\n").filter(Boolean);
  const tags = (await git.exec(`tag --contains ${sha}`)).split("\n").filter(Boolean);
  return { isMerge: parents.length>=2, msg, branches, tags };
}

export function isTimerDue(note, now = new Date()){
  if (note.wf==="cron") return false; // cron omitted here
  if (note.wf==="timer" && note.at) return new Date(note.at) <= now;
  return false;
}

export async function eventFires(note, sha, meta){
  if (!note.on) return false;
  const m = meta || await commitMeta(sha);
  if (note.on.semverTag) return m.tags.some(t=>/^v?\d+\.\d+\.\d+/.test(t));
  return false;
}

src/actions.js
import { git } from "@gitvan/core/git";
import { RESULTS_REF } from "@gitvan/core/notes";
import { generate } from "@gitvan/llm/provider";

export async function runAction(note, sha){
  if (note.run?.type==="llm-call") {
    const text = await generate({ model: note.run.model, prompt: note.run.prompt });
    await git.note(JSON.stringify({ kind:"workflow-receipt", id:note.id, status:"OK", ts:new Date().toISOString(), commit:sha, action:"llm-call", output:text }), RESULTS_REF);
  }
  if (note.run?.type==="cli-call") {
    await git.exec(`${note.run.cmd} ${(note.run.args||[]).join(" ")}`);
    await git.note(JSON.stringify({ kind:"workflow-receipt", id:note.id, status:"OK", ts:new Date().toISOString(), commit:sha, action:"cli-call" }), RESULTS_REF);
  }
}

src/loop.js
import { git } from "@gitvan/core/git";
import { NOTES_REF } from "@gitvan/core/notes";
import { isTimerDue, eventFires, commitMeta } from "./predicates.js";
import { runAction } from "./actions.js";

async function recentShas(){
  const out = await git.exec(`log --pretty=%H -n 300 --no-show-signature`);
  return out ? out.split("\n").filter(Boolean) : [];
}
async function readNote(sha){
  try { const raw = await git.exec(`notes --ref=${NOTES_REF} show ${sha}`); return JSON.parse(raw); }
  catch { return null; }
}

export async function tick(){
  for (const sha of await recentShas()) {
    const note = await readNote(sha); if (!note) continue;
    const meta = await commitMeta(sha);
    if (Array.isArray(note)) for (const n of note) if (isTimerDue(n) || await eventFires(n, sha, meta)) await runAction(n, sha);
    else if (isTimerDue(note) || await eventFires(note, sha, meta)) await runAction(note, sha);
  }
}
export async function loop({ intervalMs=1500 }={}){ for(;;){ await tick(); await new Promise(r=>setTimeout(r, intervalMs)); } }

@gitvan/llm
packages/llm/package.json
{
  "name": "@gitvan/llm",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/provider.js",
    "./provider": "./src/provider.js",
    "./embed": "./src/embed.js"
  }
}

src/provider.js
import { loadConfig } from "@gitvan/core/config";

export async function generate({ model, prompt, options = {} }){
  const cfg = await loadConfig();
  const base = cfg.llm?.baseURL || "http://localhost:11434";
  const res = await fetch(`${base}/api/generate`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: model || cfg.llm?.model, prompt, options, stream: false })
  });
  const j = await res.json();
  return j.response || "";
}

src/embed.js
import { loadConfig } from "@gitvan/core/config";
export async function embed({ model, text }){
  const cfg = await loadConfig(); const base = cfg.llm?.baseURL || "http://localhost:11434";
  const res = await fetch(`${base}/api/embeddings`, {
    method:"POST", headers:{ "content-type":"application/json" },
    body: JSON.stringify({ model, prompt: text })
  });
  return (await res.json()).embedding || [];
}

@gitvan/schemas
packages/schemas/package.json
{
  "name": "@gitvan/schemas",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/recipe.js",
    "./recipe": "./src/recipe.js",
    "./note": "./src/note.js",
    "./receipt": "./src/receipt.js"
  },
  "dependencies": { "zod": "^3.23.8" }
}

src/recipe.js
import { z } from "zod";
const Step = z.object({ id: z.string(), kind: z.enum(["sequence","milestone","taskData","cli-call","llm-call"]), args: z.record(z.any()).optional() });
export const RecipeSchema = z.object({ kind: z.literal("gitvan-recipe"), name: z.string(), desc: z.string(), version: z.string(), tags: z.array(z.string()).default([]), steps: z.array(Step) });

src/note.js
import { z } from "zod";
export const WorkflowNote = z.object({
  id: z.string(),
  wf: z.enum(["timer","cron","event"]),
  at: z.string().optional(),
  cron: z.string().optional(),
  on: z.record(z.any()).optional(),
  run: z.object({ type: z.enum(["cli-call","js-call","llm-call"]), cmd: z.string().optional(), args: z.array(z.string()).optional(), module: z.string().optional(), export: z.string().optional(), input: z.record(z.any()).optional(), model: z.string().optional(), prompt: z.string().optional() }).optional()
});

src/receipt.js
import { z } from "zod";
export const Receipt = z.object({
  kind: z.literal("workflow-receipt"),
  id: z.string(),
  status: z.enum(["OK","ERROR","SKIP"]),
  ts: z.string(),
  commit: z.string(),
  action: z.enum(["cli-call","js-call","llm-call"]),
  output: z.string().optional()
});

@gitvan/cookbook
packages/cookbook/package.json
{
  "name": "@gitvan/cookbook",
  "version": "0.0.0",
  "type": "module",
  "files": ["recipes"]
}

recipes/dev-diary.json
{
  "kind": "gitvan-recipe",
  "name": "dev-diary",
  "desc": "Summarize commits into a daily diary",
  "version": "v0.1.0",
  "tags": ["diary","llm"],
  "steps": [
    { "id":"collect", "kind":"cli-call", "args":{ "cmd":"git", "args":["log","--since=1.day","--oneline"] } },
    { "id":"summarize", "kind":"llm-call", "args":{ "model":"llama3.2", "prompt":"Summarize today:\\n{{collect.output}}" } },
    { "id":"store", "kind":"taskData", "args":{ "key":"dev-diary", "value":"{{summarize.output}}" } }
  ]
}

recipes/changelog.json
{
  "kind": "gitvan-recipe",
  "name": "changelog",
  "desc": "Generate CHANGELOG from last tag",
  "version": "v0.1.0",
  "tags": ["release"],
  "steps": [
    { "id":"since", "kind":"cli-call", "args":{ "cmd":"bash", "args":["-lc","git describe --tags --abbrev=0"] } },
    { "id":"collect", "kind":"cli-call", "args":{ "cmd":"bash", "args":["-lc","git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:'* %s'"] } },
    { "id":"write", "kind":"cli-call", "args":{ "cmd":"bash", "args":["-lc","echo \"## Unreleased\n\n{{collect.output}}\" > CHANGELOG.md && git add CHANGELOG.md && git commit -m 'chore: update changelog'"] } }
  ]
}

Bootstrap
pnpm i
pnpm run cli repo init
pnpm run cli cookbook install dev-diary
pnpm run cli recipe run dev-diary
pnpm run cli daemon start


This is the complete, clean structure. No index.js. Explicit modules, export maps, JS-only.

You said:
I like the idea that all you need for gitvan is package.json and gitvan.config.js 
ChatGPT said:
Thought for 13s

Yes. Make gitvan a “two-file app”: only package.json + gitvan.config.js.

1) package.json (npx, zero deps)
{
  "name": "gitvan-twofile",
  "private": true,
  "type": "module",
  "scripts": {
    "van": "npx -y @gitvan/cli",
    "van:init": "npx -y @gitvan/cli repo init",
    "van:apply": "npx -y @gitvan/cli config apply",
    "van:daemon": "npx -y @gitvan/cli daemon start"
  }
}

2) gitvan.config.js
export default {
  repo: {
    dir: process.cwd(),
    defaultBranch: "main",
    notesRef: "refs/notes/gitvan",
    resultsRef: "refs/notes/gitvan/results",
    signing: { require: true }
  },

  // Optional: preinstall cookbook recipes by id
  cookbook: {
    install: ["dev-diary", "changelog"]
  },

  // Triggers → actions (materialized as git notes)
  events: [
    {
      id: "daily-dev-diary",
      wf: "cron",
      cron: "0 18 * * *",
      run: {
        type: "llm-call",
        model: "llama3.2",
        prompt: "Summarize today's commits into a diary entry."
      }
    },
    {
      id: "on-semver-tag-changelog",
      wf: "event",
      on: { semverTag: true },
      run: {
        type: "cli-call",
        cmd: "bash",
        args: [
          "-lc",
          "git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:'* %s' > CHANGELOG.md && git add CHANGELOG.md && git commit -m 'chore: update changelog'"
        ]
      }
    }
  ],

  // Optional: inline recipe (no cookbook needed)
  recipes: [
    {
      kind: "gitvan-recipe",
      name: "dev-diary-inline",
      desc: "Summarize commits into a daily diary",
      version: "v0.1.0",
      tags: ["diary","llm"],
      steps: [
        { id: "collect",  kind: "cli-call", args: { cmd: "git",  args: ["log","--since=1.day","--oneline"] } },
        { id: "summarize",kind: "llm-call", args: { model: "llama3.2", prompt: "Summarize today:\\n{{collect.output}}" } },
        { id: "store",    kind: "taskData", args: { key: "dev-diary", value: "{{summarize.output}}" } }
      ]
    }
  ],

  // LLM defaults (used by @gitvan/llm)
  llm: { baseURL: process.env.OLLAMA_BASE || "http://localhost:11434", model: "llama3.2", temperature: 0.2 }
};

Quickstart
git init && git add -A && git commit -m "init"
npm run van:init
npm run van:apply         # installs cookbook items + writes events + inline recipes as notes
npm run van:daemon        # start autonomic loop

What this gives you

Zero project scaffolding: no src/, no TypeScript, no build.

All state in Git: config → notes; runs → signed receipts under refs/notes/gitvan/results.

Cookbook or inline: pull recipes by id, or ship them inline in gitvan.config.js.

Noun–verb ops via npx @gitvan/cli: repo init, config apply, daemon start, recipe run dev-diary-inline.

You said:
I want you to think about variations on the config file are there defaults? For instance we can infer what kind of event it is based on the js we dont need wf?
ChatGPT said:
Thought for 12s

Short answer: yes. Make wf optional. Infer it. Ship sane defaults and sugar → normalize to a canonical note.

Defaults

repo.dir = process.cwd()

repo.defaultBranch = main

repo.notesRef = refs/notes/gitvan

repo.resultsRef = refs/notes/gitvan/results

repo.signing.require = true

llm.baseURL = http://localhost:11434

llm.model = llama3.2

llm.temperature = 0.2

Inference rules

Event kind:

cron → wf = 'cron'

at → wf = 'timer'

on → wf = 'event'

Action:

run string with scheme → normalize

cli:echo "hi" → {type:'cli-call', cmd:'bash', args:['-lc','echo "hi"']}

js:./task.mjs#exportName → {type:'js-call', module:'./task.mjs', export:'exportName'}

llm:MODEL|PROMPT → {type:'llm-call', model:'MODEL', prompt:'PROMPT'}

run object with {prompt} but no model → use default llm.model

Predicates sugar (on can be string or array):

'semverTag' → {semverTag:true}

'mergeTo:main' → {mergeTo:'main'}

'pushTo:release/*' → {pushTo:'release/*'}

'pathChanged:src/**' → {pathChanged:'src/**'}

'signed' → {signed:true}

Minimal → Canonical examples
Minimal
export default {
  events: [
    { id: 'daily-diary', cron: '0 18 * * *', run: 'llm:llama3.2|Summarize today’s commits.' },
    { id: 'changelog-on-tag', on: 'semverTag', run: 'cli:git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:\'* %s\' > CHANGELOG.md && git add CHANGELOG.md && git commit -m "chore: update changelog"' }
  ]
}

Canonical (what daemon sees)
[
  {
    id: 'daily-diary',
    wf: 'cron',
    cron: '0 18 * * *',
    run: { type: 'llm-call', model: 'llama3.2', prompt: 'Summarize today’s commits.' }
  },
  {
    id: 'changelog-on-tag',
    wf: 'event',
    on: { semverTag: true },
    run: { type: 'cli-call', cmd: 'bash', args: ['-lc','git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:\'* %s\' > CHANGELOG.md && git add CHANGELOG.md && git commit -m "chore: update changelog"'] }
  }
]

Normalizer (JS, ESM, no TS)
// gitvan-normalize.mjs
const defaults = {
  repo: { dir: process.cwd(), defaultBranch: 'main', notesRef: 'refs/notes/gitvan', resultsRef: 'refs/notes/gitvan/results', signing: { require: true } },
  llm:  { baseURL: 'http://localhost:11434', model: 'llama3.2', temperature: 0.2 }
};

export function normalizeConfig(cfg = {}) {
  const base = { ...defaults, ...cfg, repo: { ...defaults.repo, ...(cfg.repo||{}) }, llm: { ...defaults.llm, ...(cfg.llm||{}) } };
  const events = toArray(cfg.events).map(e => normalizeEvent(e, base));
  const recipes = toArray(cfg.recipes || []);
  return { ...base, events, recipes };
}

function normalizeEvent(e, base) {
  const id = e.id || hash(JSON.stringify(e)).slice(0,12);
  const wf = e.wf || inferWf(e);
  const on = normalizeOn(e.on);
  const run = normalizeRun(e.run, base);
  const out = { id, wf, run };
  if (e.cron) out.cron = e.cron;
  if (e.at) out.at = e.at;
  if (on) out.on = on;
  return out;
}

function inferWf(e) { if (e.cron) return 'cron'; if (e.at) return 'timer'; if (e.on) return 'event'; return 'event'; }

function normalizeOn(on) {
  if (!on) return null;
  if (typeof on === 'string') return parseOnToken(on);
  if (Array.isArray(on)) return { any: on.map(parseOnToken) };
  if (typeof on === 'object') return on;
  return null;
}

function parseOnToken(tok) {
  if (tok === 'semverTag') return { semverTag: true };
  if (tok === 'signed') return { signed: true };
  const [k,v] = String(tok).split(':');
  if (k === 'mergeTo') return { mergeTo: v };
  if (k === 'pushTo') return { pushTo: v };
  if (k === 'pathChanged') return { pathChanged: v };
  return { message: tok };
}

function normalizeRun(run, base) {
  if (typeof run === 'string') return parseRunString(run, base);
  if (!run?.type && run?.prompt) return { type: 'llm-call', model: base.llm.model, prompt: run.prompt };
  return run;
}

function parseRunString(s, base) {
  if (s.startsWith('cli:')) return { type: 'cli-call', cmd: 'bash', args: ['-lc', s.slice(4)] };
  if (s.startsWith('js:')) {
    const body = s.slice(3); const [mod, exp='default'] = body.split('#');
    return { type: 'js-call', module: mod, export: exp };
  }
  if (s.startsWith('llm:')) {
    const body = s.slice(4); const [model, ...rest] = body.split('|');
    return { type: 'llm-call', model: model || base.llm.model, prompt: rest.join('|') };
  }
  return { type: 'cli-call', cmd: 'bash', args: ['-lc', s] };
}

function toArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }
function hash(x){ return Bun?.hash ? String(Bun.hash(x)) : String(x.split('').reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0)|0,0)>>>0); }

Suggested config variants
Variant A — Ultra-minimal
export default {
  events: [
    { id: 'diary', cron: '0 18 * * *', run: 'llm:|Summarize today’s commits.' },
    { id: 'relnotes', on: 'semverTag', run: 'cli:./scripts/release-notes.sh' }
  ]
}

Variant B — Object map, IDs as keys
export default {
  events: {
    diary: { cron: '0 18 * * *', run: 'llm:llama3.2|Summarize today' },
    changelog: { on: ['semverTag','signed'], run: 'cli:gitvan recipe run changelog' }
  }
}


Normalize by turning the map into an array with id = key.

Variant C — Full canonical (explicit wf allowed but optional)
export default {
  events: [
    { id:'X', wf:'event', on:{ mergeTo:'main', signed:true }, run:{ type:'cli-call', cmd:'node', args:['scripts/verify.js'] } }
  ]
}


Use this: infer where possible, let power users be explicit if they want.

You said:
Ok are there any other best practices we could leverage 
ChatGPT said:
Thought for 6s

Yes. Use these.

Config

Single source: gitvan.config.js only. Normalize sugar → canonical.

Layering: load .gitvan.local.js last for machine overrides.

IDs: stable, kebab-case. Prefix by domain, e.g. docs-changelog.

Versions: configVersion: 1 and recipe.version semver.

Namespacing

Notes: refs/notes/gitvan and refs/notes/gitvan/results.

Locks: refs/workflow/executions/<id>.

Policies: refs/gitvan/policy/* (deny/allow lists, JSON).

Determinism

Env: TZ=UTC, LANG=C, fixed PATH subset.

Inputs by hash or SHA. No ambient clock in recipes.

LLM: set seed when model supports it; always record model+params+prompt.

Security

Require signed merges/tags; signing.require = true.

SoD: different signer for merge vs author (enforced by hook).

CLI allowlist: only run from scripts/ and pnpm dlx tools you pin.

Path scopes: predicates restricted to src/**, packages/**.

Schema & receipts

Zod on load and before note write.

Receipts minimal and uniform:

id, ts, commit, action, status, outputHash?, error?

One event → one receipt. No multi-write per step.

Performance

Shallow queries: --no-show-signature, capped lookback.

Batch note ops when applying config.

Avoid git describe in hot paths; cache last tag in a note.

DX

Noun–verb CLI only. No flags unless needed.

gitvan config apply idempotent.

gitvan diagnose prints: notes ref, last 5 receipts, signer, default model.

Conventions

Commit trailers for routing:

Type: feature|fix|docs

Decision: adr-0123

Risk: low|med|high

Tags: semver only for releases. Milestones as ms/<name>.

Testing (happy path)

Golden fixtures: run recipe → compare results notes.

“Once” mode: daemon once for CI smoke.

Cookbook hygiene

Recipes self-contained. No external env unless explicit.

Provide README.md + inputs/outputs table per recipe.

Keep scripts tiny; prefer git commands over bespoke code.

LLM usage

Short prompts with explicit structure. Avoid freeform.

Always store raw output and outputHash.

Use embeddings only with capped dims and recorded model.

Failure stance

Fail fast on invalid config or missing tools.

Never auto-retry without explicit retry block.

Keep errors human; attach one-line cause in receipt.

Example guards (concise)
// allowlist for CLI actions
allow: { cmd: [/^bash$/, /^node$/, /^pnpm$/], paths: [/^scripts\//] }

// policy ref sketch (JSON under refs/gitvan/policy/allow-cli.json)
{ "cmd": ["bash","node","pnpm"], "paths": ["scripts/"] }


Apply these and keep everything in Git: config → notes, policy → refs, runs → receipts.

You said:
Ok. I also like nitro and nuxt. So can we have an events directory you can drop

define
ChatGPT said:
Thought for 18s

Yes. Add a file-based events API like Nuxt/Nitro.

Layout
repo/
  gitvan.config.js         # optional
  events/
    daily-dev-diary.mjs
    changelog-on-tag.mjs
    build-on-merge.mjs

Authoring API
// events/daily-dev-diary.mjs
import { defineEvent } from "@gitvan/core/events";

export default defineEvent({
  id: "daily-dev-diary",          // default = file path kebab
  cron: "0 18 * * *",             // wf inferred: cron
  run: "llm:llama3.2|Summarize today’s commits."
});

// events/changelog-on-tag.mjs
import { defineEvent } from "@gitvan/core/events";

export default defineEvent({
  on: "semverTag",                // wf inferred: event
  run: "cli:git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:'* %s' > CHANGELOG.md && git add CHANGELOG.md && git commit -m 'chore: update changelog'"
});

// events/build-on-merge.mjs
import { defineEvent } from "@gitvan/core/events";

export default defineEvent({
  on: ["mergeTo:main","signed"],
  run: "cli:pnpm -C scripts build"
});

Loader (happy path, ESM, JS)

@gitvan/core/src/events.js

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function defineEvent(spec){ return spec; } // sugar

export async function loadEventsDir(cwd = process.cwd()) {
  const dir = path.join(cwd, "events");
  if (!fs.existsSync(dir)) return [];
  const files = walk(dir).filter(f => /\.(mjs|js)$/.test(f));
  const out = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(f).href);
    const raw = (mod.default && typeof mod.default === "object") ? mod.default : mod;
    const id = raw.id || toId(path.relative(dir, f));
    out.push(normalizeEvent({ id, ...raw }));
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}

function toId(rel){ return rel.replace(/\.(mjs|js)$/, "").replace(/[\\/]/g, "-"); }

function normalizeEvent(e){
  const wf = e.wf || (e.cron ? "cron" : e.at ? "timer" : "event");
  const on = normOn(e.on);
  const run = normRun(e.run);
  const out = { id: e.id, wf, run };
  if (e.cron) out.cron = e.cron;
  if (e.at) out.at = e.at;
  if (on) out.on = on;
  return out;
}

function normOn(on){
  if (!on) return null;
  if (typeof on === "string") return tok(on);
  if (Array.isArray(on)) return { any: on.map(tok) };
  return on; // already object
}
function tok(t){
  if (t === "semverTag") return { semverTag: true };
  if (t === "signed") return { signed: true };
  const [k,v] = String(t).split(":");
  if (k==="mergeTo") return { mergeTo:v };
  if (k==="pushTo") return { pushTo:v };
  if (k==="pathChanged") return { pathChanged:v };
  return { message: t };
}

function normRun(run){
  if (!run) return null;
  if (typeof run !== "string") return run;
  if (run.startsWith("cli:")) return { type:"cli-call", cmd:"bash", args:["-lc", run.slice(4)] };
  if (run.startsWith("js:"))  { const body = run.slice(3); const [m,e="default"]=body.split("#"); return { type:"js-call", module:m, export:e }; }
  if (run.startsWith("llm:")) { const body = run.slice(4); const [model, ...rest]=body.split("|"); return { type:"llm-call", model:model||"llama3.2", prompt:rest.join("|") }; }
  return { type:"cli-call", cmd:"bash", args:["-lc", run] };
}

Wire into CLI

Extend gitvan config apply to include events directory:

// inside packages/cli/bin/gitvan.js
import { loadEventsDir } from "@gitvan/core/events";

// in config.apply run()
const fromDir = await loadEventsDir();
for (const ev of fromDir) await git.note(JSON.stringify(ev), cfg.repo.notesRef || NOTES_REF);

Behavior

Drop a file in events/ → gitvan config apply writes canonical notes.

wf optional; inferred from cron|at|on.

on can be string, array, or object.

run supports cli:, js:, llm: shorthands.

Nuxt/Nitro friendly

Same file-based convention as server/routes or server/api.

Pure ESM modules; no TS required.

Works in any Node workspace; no build step needed.

That’s it.

You said:
# 📍 unrouting

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![Codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]
[![JSDocs][jsdocs-src]][jsdocs-href]

> Making filesystem routing universal

## 🚧 In development

This library is a work in progress and in active development.

- [ ] generic route parsing function with options to cover major filesystem routing patterns
  - [x] [Nuxt](https://github.com/nuxt/nuxt)
  - [x] [unplugin-vue-router](https://github.com/posva/unplugin-vue-router) (does not include dot-syntax nesting support)
- [ ] export capability for framework routers
  - [x] RegExp patterns
  - [x] [vue-router](https://router.vuejs.org/) routes
  - [x] [rou3](http://github.com/h3js/rou3)/[Nitro](https://nitro.unjs.io/) routes
  - [ ] [SolidStart](https://start.solidjs.com/core-concepts/routing)
  - [ ] [SvelteKit](https://kit.svelte.dev/docs/routing) routes
- [ ] support scanning FS (with optional watch mode)
- [ ] and more

## Usage

Install package:


sh
# npm
npm install unrouting

# pnpm
pnpm install unrouting


### Basic Parsing


js
import { parsePath } from 'unrouting'

// Parse file paths into segments with mode detection
const [result] = parsePath(['users/[id]/profile.vue'])
console.log(result.segments)
// [
//   [{ type: 'static', value: 'users' }],
//   [{ type: 'dynamic', value: 'id' }],
//   [{ type: 'static', value: 'profile' }]
// ]
console.log(result.meta) // undefined (no metadata detected)


### Mode Detection


js
import { parsePath } from 'unrouting'

// Configure mode detection for .server, .client suffixes
const [result] = parsePath(['app.server.vue'], {
  modes: ['server', 'client']
})

console.log(result.meta?.modes) // ['server']
console.log(result.segments) // [[{ type: 'static', value: 'app' }]]

// Multiple modes
const [result2] = parsePath(['api.server.edge.js'], {
  modes: ['server', 'client', 'edge']
})
console.log(result2.meta?.modes) // ['server', 'edge']
console.log(result2.segments) // [[{ type: 'static', value: 'api' }]]


### Named Views


js
import { parsePath } from 'unrouting'

// Named views with @ suffix (for Vue Router named views)
const [result] = parsePath(['dashboard@sidebar.vue'])
console.log(result.meta?.name) // 'sidebar'
console.log(result.segments) // [[{ type: 'static', value: 'dashboard' }]]

// Named views with modes
const [result2] = parsePath(['admin@main.client.vue'], {
  modes: ['client', 'server']
})
console.log(result2.meta) // { name: 'main', modes: ['client'] }

// Nested named views
const [result3] = parsePath(['users/[id]@profile.vue'])
console.log(result3.meta?.name) // 'profile'
console.log(result3.segments)
// [
//   [{ type: 'static', value: 'users' }],
//   [{ type: 'dynamic', value: 'id' }]
// ]


### Convert to Router Formats


js
import { parsePath, toRegExp, toRou3, toVueRouter4 } from 'unrouting'

const [result] = parsePath(['users/[id]/posts/[slug].vue'])

// Vue Router 4 format
const [vueRoute] = toVueRouter4([result])
console.log(vueRoute.path) // '/users/:id()/posts/:slug()'

// Rou3/Nitro format
const [nitroRoute] = toRou3([result])
console.log(nitroRoute) // '/users/:id/posts/:slug'

// RegExp pattern
const [regexpRoute] = toRegExp([result])
console.log(regexpRoute.pattern) // /^\/users\/([^\/]+)\/posts\/([^\/]+)\/?$/
console.log(regexpRoute.keys) // ['id', 'slug']

// Or pass file paths directly to converters
const [vueRoute2] = toVueRouter4(['users/[id]/posts/[slug].vue'])
const [nitroRoute2] = toRou3(['users/[id]/posts/[slug].vue'])
const [regexpRoute2] = toRegExp(['users/[id]/posts/[slug].vue'])


### Advanced Examples


js
import { parsePath, toRegExp, toVueRouter4 } from 'unrouting'

// Repeatable parameters ([slug]+.vue -> one or more segments)
const [repeatable] = parsePath(['posts/[slug]+.vue'])
const [vueRoute1] = toVueRouter4([repeatable])
console.log(vueRoute1.path) // '/posts/:slug+'

// Optional repeatable parameters ([[slug]]+.vue -> zero or more segments)
const [optionalRepeatable] = parsePath(['articles/[[slug]]+.vue'])
const [vueRoute2] = toVueRouter4([optionalRepeatable])
console.log(vueRoute2.path) // '/articles/:slug*'

// Group segments (ignored in final path, useful for organization)
const [grouped] = parsePath(['(admin)/(dashboard)/users/[id].vue'])
const [vueRoute3] = toVueRouter4([grouped])
console.log(vueRoute3.path) // '/users/:id()'
// Groups are parsed but excluded from path generation

// Catchall routes ([...slug].vue -> captures remaining path)
const [catchall] = parsePath(['docs/[...slug].vue'])
const [vueRoute4] = toVueRouter4([catchall])
console.log(vueRoute4.path) // '/docs/:slug(.*)*'

// Optional parameters ([[param]].vue -> parameter is optional)
const [optional] = parsePath(['products/[[category]]/[[id]].vue'])
const [vueRoute5] = toVueRouter4([optional])
console.log(vueRoute5.path) // '/products/:category?/:id?'

// Complex mixed patterns
const [complex] = parsePath(['shop/[category]/product-[id]-[[variant]].vue'])
const [vueRoute6] = toVueRouter4([complex])
console.log(vueRoute6.path)
// '/shop/:category()/product-:id()-:variant?'

// Proper regex matching with anchoring (fixes partial match issues)
const [pattern] = toRegExp(['[slug].vue'])
console.log(pattern.pattern) // /^\/(?<slug>[^/]+)\/?$/
console.log('/file'.match(pattern.pattern)) // ✅ matches
console.log('/test/thing'.match(pattern.pattern)) // ❌ null (properly rejected)


## API

### parsePath(filePaths, options?)

Parse file paths into route segments with mode detection.

**Parameters:**
- filePaths (string[]): Array of file paths to parse
- options (object, optional):
  - extensions (string[]): File extensions to strip (default: all extensions)
  - modes (string[]): Mode suffixes to detect (e.g., ['server', 'client'])
  - warn (function): Warning callback for invalid characters

**Returns:** ParsedPath[]

ts
interface ParsedPath {
  segments: ParsedPathSegment[]
  meta?: {
    modes?: string[] // Detected mode suffixes (e.g., ['client', 'server'])
    name?: string // Named view from @name suffix
  }
}


### toVueRouter4(filePaths)

Convert parsed segments or file paths to Vue Router 4 format.

**Parameters:**
- filePaths (string[] | ParsedPath[]): Array of file paths or parsed path objects

**Returns:** Array<{ path: string }>

### toRou3(filePaths)

Convert parsed segments or file paths to Rou3/Nitro format.

**Parameters:**
- filePaths (string[] | ParsedPath[]): Array of file paths or parsed path objects

**Returns:** string[]

### toRegExp(filePaths)

Convert parsed segments or file paths to RegExp patterns.

**Parameters:**
- filePaths (string[] | ParsedPath[]): Array of file paths or parsed path objects

**Returns:** Array<{ pattern: RegExp, keys: string[] }>

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using corepack enable (use npm i -g corepack for Node.js < 16.10)
- Install dependencies using pnpm install
- Run interactive tests using pnpm dev

## License

Made with ❤️

Published under [MIT License](./LICENCE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unrouting?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/unrouting
[npm-downloads-src]: https://img.shields.io/npm/dm/unrouting?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/unrouting
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/unrouting/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/unjs/unrouting
[bundle-src]: https://img.shields.io/bundlephobia/minzip/unrouting?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=unrouting
[license-src]: https://img.shields.io/github/license/unjs/unrouting.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/unjs/unrouting/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsDocs.io-reference-18181B?style=flat&colorA=18181B&colorB=F0DB4F
[jsdocs-href]: https://www.jsdocs.io/package/unrouting


We are going to fully utilize the Unjs ecosystem 

ChatGPT said:
Thought for 30s

Plan: make gitvan “UnJS-first” while staying Git-only at core.

Adopt these libs

c12: config loader (gitvan.config.*, .local, env merge).

defu: deep defaults merge.

pathe: path utils.

consola: logging.

ofetch (+ ufo): HTTP to LLMs.

hookable: lifecycle hooks.

unrouting: file-based events/ → canonical events.

unbuild: bundle packages (optional).

Nitro + h3: optional local API/dashboard, no server required to run core.

Minimal replacements
1) Config loader (c12 + defu)
// packages/core/src/config.js
import { loadConfig as c12 } from 'c12'
import { defu } from 'defu'

const defaults = {
  repo: { defaultBranch: 'main', notesRef: 'refs/notes/gitvan', resultsRef: 'refs/notes/gitvan/results', signing: { require: true } },
  llm: { baseURL: 'http://localhost:11434', model: 'llama3.2', temperature: 0.2 },
  events: [],
  recipes: []
}

export async function loadConfig(cwd = process.cwd()) {
  const { config } = await c12({
    name: 'gitvan',
    cwd,
    dotenv: true, // .env support
    defaults
  })
  return defu(config || {}, defaults)
}

2) Events directory (unrouting)
// packages/core/src/events.js
import { parsePath } from 'unrouting'
import { join } from 'pathe'
import fs from 'node:fs'

export async function loadEventsDir(cwd = process.cwd()) {
  const dir = join(cwd, 'events')
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mjs') || f.endsWith('.js'))
  // infer ids from filenames; map sugar → canonical
  return files.map(f => {
    const id = f.replace(/\.(mjs|js)$/, '')
    const mod = await import(join(dir, f).toString())
    const raw = mod.default || mod
    return normalizeEvent({ id, ...raw })
  })
}

function normalizeEvent(e) {
  const wf = e.cron ? 'cron' : e.at ? 'timer' : 'event'
  const run = typeof e.run === 'string' ? normRun(e.run) : e.run
  return { id: e.id, wf, cron: e.cron, at: e.at, on: normOn(e.on), run }
}

function normRun(s) {
  if (s.startsWith('cli:')) return { type:'cli-call', cmd:'bash', args:['-lc', s.slice(4)] }
  if (s.startsWith('js:'))  { const [m,e='default']=s.slice(3).split('#'); return { type:'js-call', module:m, export:e } }
  if (s.startsWith('llm:')) { const [model,...p]=s.slice(4).split('|'); return { type:'llm-call', model, prompt:p.join('|') } }
  return { type:'cli-call', cmd:'bash', args:['-lc', s] }
}

function normOn(on) {
  if (!on) return null
  const tok = t => t==='semverTag' ? { semverTag:true }
    : t==='signed' ? { signed:true }
    : t.startsWith('mergeTo:') ? { mergeTo:t.split(':')[1] }
    : t.startsWith('pushTo:') ? { pushTo:t.split(':')[1] }
    : t.startsWith('pathChanged:') ? { pathChanged:t.split(':')[1] }
    : { message:t }
  if (typeof on === 'string') return tok(on)
  if (Array.isArray(on)) return { any: on.map(tok) }
  return on
}

3) LLM client (ofetch + ufo)
// packages/llm/src/provider.js
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { loadConfig } from '@gitvan/core/config'

export async function generate({ model, prompt, options = {} }) {
  const cfg = await loadConfig()
  const base = cfg.llm.baseURL
  const post = ofetch.create({ baseURL: base })
  const res = await post('/api/generate', { method:'POST', body: { model: model || cfg.llm.model, prompt, options, stream:false } })
  return res.response || ''
}

4) Hooks (hookable)
// packages/daemon/src/hooks.js
import { createHooks } from 'hookable'
export const hooks = createHooks()
// use: await hooks.callHook('before:action', note), etc.


Wire in loop:

// packages/daemon/src/loop.js
import { hooks } from './hooks.js'
...
if (due) { await hooks.callHook('before:action', note); await runAction(note, sha); await hooks.callHook('after:action', note); }

5) Logging (consola)
// anywhere
import { createConsola } from 'consola'
export const log = createConsola({ level: 3 })
log.start('daemon start'); log.success('ran %s', note.id)

6) Optional Nitro UI/API (purely optional)
apps/dashboard/
  nitro.config.ts
  server/api/receipts.get.ts
  server/api/events.get.ts


server/api/receipts.get.ts

import { defineEventHandler } from 'h3'
import { git } from '@gitvan/core/git'
export default defineEventHandler(async () => {
  const list = await git.exec('notes --ref=refs/notes/gitvan/results list')
  return list.split('\n').filter(Boolean).map(l => {
    const sha = l.split(' ')[0]
    const raw = await git.exec(`notes --ref=refs/notes/gitvan/results show ${sha}`)
    return JSON.parse(raw)
  })
})


Run locally: npx nitro dev to browse receipts; core still Git-only.

Two-file app stays intact

Keep package.json + gitvan.config.js flow.

gitvan config apply should:

Load config via c12.

Merge events from events/ via unrouting loader.

Materialize canonical notes.

Suggested deps (root)
{
  "dependencies": {
    "c12": "^1.5.0",
    "defu": "^6.1.4",
    "pathe": "^1.1.2",
    "consola": "^3.2.3",
    "ofetch": "^1.3.4",
    "ufo": "^1.5.3",
    "hookable": "^5.5.3",
    "unrouting": "^0.3.0"
  },
  "devDependencies": { "unbuild": "^2.0.0", "nitro": "^2.9.0", "h3": "^1.12.0" }
}

File-based events examples
// events/dev-diary.mjs
export default { cron: '0 18 * * *', run: 'llm:llama3.2|Summarize today’s commits.' }

// events/changelog-on-tag.mjs
export default { on: 'semverTag', run: 'cli:pnpm -C scripts changelog' }


This leverages UnJS everywhere it adds value while preserving the core contract: Git is the runtime.

You said:
Lets maximize usage of hookable
ChatGPT said:
Thought for 22s

Yes. Make hooks the spine. Define a small, stable hook map and run everything through it. Pure JS, ESM, happy path.

1) Hook map (names + payloads)

All hooks receive a mutable context object. Plugins mutate in place.

config:load:before      { cwd, sources }
config:load:after       { config }

config:apply:before     { config, notesRef }
config:apply:after      { config, wrote: number }

daemon:start            { intervalMs }
daemon:tick:before      { shas: string[] }
daemon:tick:after       { ran: number }

event:match:before      { note, sha, meta, matched: boolean }
event:match:after       { note, sha, matched: boolean }

action:before           { note, sha, action }            // action = 'cli'|'js'|'llm'
action:after            { note, sha, action, output }    // output may be string

receipt:before          { note, sha, receipt }           // mutate/add fields
receipt:after           { note, sha, receiptRef }

note:write:before       { ref, message }                 // mutate message
note:write:after        { ref, sha }

llm:before              { model, prompt, options }
llm:after               { model, prompt, options, output }

cli:before              { cmd, args, env }
cli:after               { cmd, args, code: 0 }

policy:check            { kind, payload }                // throw or set payload.blocked=true

2) Singleton hooks

packages/daemon/src/hooks.js

import { createHooks } from 'hookable'
export const hooks = createHooks()
export const on  = hooks.hook.bind(hooks)         // register
export const run = hooks.callHook.bind(hooks)     // serial
export const runP= hooks.callHookParallel?.bind?.(hooks) || run

3) Wire hooks into core paths
config load/apply

packages/core/src/config.js

import { loadConfig as c12 } from 'c12'
import { defu } from 'defu'
import { run } from '@gitvan/daemon/hooks'

const defaults = { repo:{ defaultBranch:'main', notesRef:'refs/notes/gitvan', resultsRef:'refs/notes/gitvan/results', signing:{require:true}}, llm:{ baseURL:'http://localhost:11434', model:'llama3.2', temperature:0.2 }, events:[], recipes:[], plugins:[] }

export async function loadConfig(cwd=process.cwd()){
  const ctx = { cwd, sources:['gitvan.config.*'] }
  await run('config:load:before', ctx)
  const { config } = await c12({ name:'gitvan', cwd, dotenv:true, defaults })
  const merged = defu(config||{}, defaults)
  const out = { config: merged }
  await run('config:load:after', out)
  return out.config
}


packages/cli/bin/gitvan.js (inside config apply)

import { run } from '@gitvan/daemon/hooks'
// ...
await run('config:apply:before', { config: cfg, notesRef: cfg.repo.notesRef })
/* write notes, events, recipes … increment wrote */
await run('config:apply:after', { config: cfg, wrote })

daemon loop

packages/daemon/src/loop.js

import { run } from './hooks.js'
import { git } from '@gitvan/core/git'
import { NOTES_REF, RESULTS_REF } from '@gitvan/core/notes'
import { commitMeta } from './predicates.js'
import { runAction } from './actions.js'

export async function tick(){
  const shas = await recentShas()
  await run('daemon:tick:before', { shas })
  let ran = 0
  for (const sha of shas) {
    const note = await readNote(sha); if (!note) continue
    const meta = await commitMeta(sha)
    const list = Array.isArray(note) ? note : [note]
    for (const n of list) {
      const matchCtx = { note:n, sha, meta, matched:false }
      await run('event:match:before', matchCtx)
      const matched = matchCtx.matched || await isDueOrFires(n, sha, meta)
      await run('event:match:after', { note:n, sha, matched })
      if (!matched) continue

      const out = await runActionWithHooks(n, sha)
      const receipt = { kind:'workflow-receipt', id:n.id, status:'OK', ts:new Date().toISOString(), commit:sha, action:out.kind, output:out.output }
      const rctx = { note:n, sha, receipt }
      await run('receipt:before', rctx)
      const refSha = await git.note(JSON.stringify(rctx.receipt), RESULTS_REF)
      await run('receipt:after', { note:n, sha, receiptRef: refSha })
      ran++
    }
  }
  await run('daemon:tick:after', { ran })
}

async function runActionWithHooks(note, sha){
  if (note.run?.type === 'llm-call') {
    const ctx = { model: note.run.model, prompt: note.run.prompt, options: note.run.options||{} }
    await run('llm:before', ctx)
    const output = await llmGenerate(ctx) // uses ctx.model/prompt/options
    await run('llm:after', { ...ctx, output })
    return { kind:'llm', output }
  }
  if (note.run?.type === 'cli-call') {
    const ctx = { cmd: note.run.cmd, args: note.run.args||[], env: {} }
    await run('cli:before', ctx)
    await execCLI(ctx) // use ctx.cmd/args/env
    await run('cli:after', { ...ctx, code: 0 })
    return { kind:'cli' }
  }
  return { kind:'noop' }
}

note writes (centralize)

packages/core/src/git.js

import { run } from '@gitvan/daemon/hooks'
const sh = (cmd) => execSync(`git -C "${process.cwd()}" ${cmd}`, { stdio:["ignore","pipe","inherit"] }).toString().trim()

export const git = {
  // ...
  note: async (message, ref) => {
    const ctx = { ref, message }
    await run('note:write:before', ctx)
    const sha = sh(`notes --ref=${ctx.ref} add -m '${String(ctx.message).replace(/'/g,"'\\''")}'`)
    await run('note:write:after', { ref: ctx.ref, sha })
    return sha
  }
}

4) Plugin loader

packages/core/src/plugins.js

import { pathToFileURL } from 'node:url'
import { join } from 'pathe'
import { on } from '@gitvan/daemon/hooks'
import { loadConfig } from './config.js'

export async function loadPlugins(cwd=process.cwd()){
  const cfg = await loadConfig(cwd)
  for (const p of (cfg.plugins||[])) {
    const url = p.startsWith('.') || p.startsWith('/') ? pathToFileURL(join(cwd, p)).href : p
    const mod = await import(url)
    const reg = mod.default || mod.register || mod.plugin
    if (typeof reg === 'function') await reg({ on })
  }
}


Call once early (CLI entry and daemon start):

import { loadPlugins } from '@gitvan/core/plugins'
await loadPlugins()

5) Example plugins
A) CLI allowlist (policy)

plugins/allow-cli.mjs

export default ({ on }) => {
  const allowCmd = /^(bash|node|pnpm)$/
  const allowPath = /^scripts\//
  on('cli:before', (ctx) => {
    if (!allowCmd.test(ctx.cmd)) throw new Error('cli blocked: cmd')
    if (ctx.args?.[0] === '-lc' && typeof ctx.args[1] === 'string' && !ctx.args[1].startsWith('git ') && !ctx.args[1].startsWith('echo ') ) {
      // allow simple safe commands; real policy up to you
    }
  })
}

B) LLM prompt decorator

plugins/prompt-prefix.mjs

export default ({ on }) => {
  on('llm:before', (ctx) => {
    ctx.prompt = `[repo:${process.cwd()}]\n${ctx.prompt}`
    ctx.options = { ...ctx.options, seed: 7 }
  })
}

C) Secret redactor for receipts/notes

plugins/redact.mjs

const re = /(AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36})/g
export default ({ on }) => {
  on('receipt:before', (ctx) => {
    if (typeof ctx.receipt.output === 'string') ctx.receipt.output = ctx.receipt.output.replace(re, '***')
  })
  on('note:write:before', (ctx) => {
    if (typeof ctx.message === 'string') ctx.message = ctx.message.replace(re, '***')
  })
}

D) Metrics to notes

plugins/metrics.mjs

import { git } from '@gitvan/core/git'
import { RESULTS_REF } from '@gitvan/core/notes'
export default ({ on }) => {
  let count = 0
  on('daemon:tick:after', async ({ ran }) => {
    count += ran
    if (count >= 50) {
      await git.note(JSON.stringify({ kind:'metric', executions: count, ts: new Date().toISOString() }), RESULTS_REF)
      count = 0
    }
  })
}

E) Reviewer router on event match

plugins/reviewer-route.mjs

export default ({ on }) => {
  on('event:match:after', (ctx) => {
    if (!ctx.matched) return
    // attach reviewer suggestion to note object so receipt includes it
    ctx.note.suggestedReviewer = 'alice'
  })
}

6) Use in config

gitvan.config.js

export default {
  plugins: [
    './plugins/allow-cli.mjs',
    './plugins/prompt-prefix.mjs',
    './plugins/redact.mjs',
    './plugins/metrics.mjs',
    './plugins/reviewer-route.mjs'
  ],
  events: [
    { id:'daily-diary', cron:'0 18 * * *', run:'llm:llama3.2|Summarize today’s commits.' },
    { id:'tag-changelog', on:'semverTag', run:'cli:pnpm -C scripts changelog' }
  ]
}

7) Event files can register too

events/build-on-merge.mjs

export const register = ({ on }) => {
  on('action:before', (ctx) => {
    if (ctx.action === 'cli') ctx.env = { ...ctx.env, CI:'1' }
  })
}

export default { on:['mergeTo:main','signed'], run:'cli:pnpm -C scripts build' }


Loader: if an event module exports register, call it during loadEventsDir().

8) Conventions

Hook names: namespace:verb.

Payloads are mutable. No returns. Short, synchronous by default; await when needed.

Avoid try/catch here. Fail fast. Let a plugin add on('policy:check', …) if desired.

This turns gitvan into a hook-first runtime: every path is observable and rewritable, without changing core.

You said:
# 🍦 unctx

> Composition-API in Vanilla js

[![npm version][npm-v-src]][npm-v-href]
[![npm downloads][npm-dm-src]][npm-dm-href]
[![package phobia][packagephobia-src]][packagephobia-href]
[![bundle phobia][bundlephobia-src]][bundlephobia-href]
[![codecov][codecov-src]][codecov-href]

## What is unctx?

[Vue.js](https://vuejs.org) introduced an amazing pattern called [Composition API](https://v3.vuejs.org/guide/composition-api-introduction.html) that allows organizing complex logic by splitting it into reusable functions and grouping in logical order. unctx allows easily implementing composition API pattern in your javascript libraries without hassle.

## Usage

In your **awesome** library:


bash
yarn add unctx
# or
npm install unctx



js
import { createContext } from "unctx";

const ctx = createContext();

export const useAwesome = ctx.use;

// ...
ctx.call({ test: 1 }, () => {
  // This is similar to the vue setup function
  // Any function called here can use `useAwesome` to get { test: 1 }
});


User code:


js
import { useAwesome } from "awesome-lib";

// ...
function setup() {
  const ctx = useAwesome();
}


**Note:** When no context is presented ctx.use will throw an error. Use ctx.tryUse for tolerant usages (return nullable context).

### Using Namespaces

To avoid issues with multiple version of the library, unctx provides a safe global namespace to access context by key (kept in [globalThis](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis)). **Important:** Please use a verbose name for the key to avoid conflict with other js libraries. Using the npm package name is recommended. Using symbols has no effect since it still causes multiple context issues.


js
import { useContext, getContext } from "unctx";

const useAwesome = useContext("awesome-lib");

// or
// const awesomeContext = getContext('awesome-lib')


You can also create your internal namespace with createNamespace utility for more advanced use cases.

## Async Context

Using context is only possible in non-async usages and only before the first await statement. This is to make sure context is not shared between concurrent calls.


js
async function setup() {
  console.log(useAwesome()); // Returns context
  setTimeout(() => {
    console.log(useAwesome());
  }, 1); // Returns null
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(useAwesome()); // Returns null
}


A simple workaround is caching context into a local variable:


js
async function setup() {
  const ctx = useAwesome(); // We can directly access cached version of ctx
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(ctx);
}


This is not always an elegant and easy way by making a variable and passing it around. After all, this is the purpose of unctx to make sure context is magically available everywhere in composables!

### Native Async Context

Unctx supports Node.js [AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) as a native way to preserve and track async contexts. To enable this mode, you need to set asyncContext: true option and also provides an implementation for AsyncLocalStorage (or provide globalThis.AsyncLocalStorage polyfill).

See [tc39 proposal for async context](https://github.com/tc39/proposal-async-context) and [cloudflare docs](https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/) for relevant platform specific docs.


ts
import { createContext } from "unctx";
import { AsyncLocalStorage } from "node:async_hooks";

const ctx = createContext({
  asyncContext: true,
  AsyncLocalStorage,
});

ctx.call("123", () => {
  setTimeout(() => {
    // Prints 123
    console.log(ctx.use());
  }, 100);
});


### Async Transform

Since native async context is not supported in all platforms yet, unctx provides a build-time solution that transforms async syntax to automatically restore context after each async/await statement. This requires using a bundler such as Rollup, Vite, or Webpack.

Import and register transform plugin:


js
import { unctxPlugin } from "unctx/plugin";

// Rollup
// TODO: Add to rollup configuration
unctxPlugin.rollup();

// Vite
// TODO: Add to vite configuration
unctxPlugin.vite();

// Webpack
// TODO: Add to webpack configuration
unctxPlugin.webpack();


Use ctx.callAsync instead of ctx.call:


js
await ctx.callAsync("test", setup);


**_NOTE:_** callAsync is not transformed by default. You need to add it to the plugin's asyncFunctions: [] option to transform it.

Any async function that requires context, should be wrapped with withAsyncContext:


js
import { withAsyncContext } from "unctx";

const setup = withAsyncContext(async () => {
  console.log(useAwesome()); // Returns context
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(useAwesome()); // Still returns context with dark magic!
});


## Singleton Pattern

If you are sure it is safe to use a shared instance (not depending to request), you can also use ctx.set and ctx.unset for a [singleton pattern](https://en.wikipedia.org/wiki/Singleton_pattern).

**Note:** You cannot combine set with call. Always use unset before replacing the instance otherwise you will get Context conflict error.


js
import { createContext } from "unctx";

const ctx = createContext();
ctx.set(new Awesome());

// Replacing instance without unset
// ctx.set(new Awesome(), true)

export const useAwesome = ctx.use;


## Typed Context

A generic type exists on all utilities to be set for instance/context type for typescript support.


ts
// Return type of useAwesome is Awesome | null
const { use: useAwesome } = createContext<Awesome>();


## Under the hood

The composition of functions is possible using temporary context injection. When calling ctx.call(instance, cb), instance argument will be stored in a temporary variable then cb is called. Any function inside cb, can then implicitly access the instance by using ctx.use (or useAwesome)

## Pitfalls

**context can be only used before first await**:

Please check [Async Context](#async-context) section.

**Context conflict error**:

In your library, you should only keep one call() running at a time (unless calling with the same reference for the first argument)

For instance, this makes an error:


js
ctx.call({ test: 1 }, () => {
  ctx.call({ test: 2 }, () => {
    // Throws error!
  });
});


## License

MIT. Made with 💖

<!-- Refs -->

[npm-v-src]: https://flat.badgen.net/npm/v/unctx/latest
[npm-v-href]: https://npmjs.com/package/unctx
[npm-dm-src]: https://flat.badgen.net/npm/dm/unctx
[npm-dm-href]: https://npmjs.com/package/unctx
[packagephobia-src]: https://flat.badgen.net/packagephobia/install/unctx
[packagephobia-href]: https://packagephobia.now.sh/result?p=unctx
[bundlephobia-src]: https://flat.badgen.net/bundlephobia/min/unctx
[bundlephobia-href]: https://bundlephobia.com/result?p=unctx
[codecov-src]: https://flat.badgen.net/codecov/c/github/unjs/unctx/master
[codecov-href]: https://codecov.io/gh/unjs/unctx
ChatGPT said:
Thought for 11s

Yes. Wire unctx in as the runtime context for gitvan. Minimal surface, async-safe, hook-first.

1) Context singleton

packages/core/src/ctx.js

import { createContext } from "unctx";
import { AsyncLocalStorage } from "node:async_hooks";

const gv = createContext({
  asyncContext: true,
  AsyncLocalStorage
});

export const useVan = gv.use;          // throw if missing
export const tryUseVan = gv.tryUse;    // null if missing
export const callVan = gv.call.bind(gv);
export const callVanAsync = gv.callAsync?.bind(gv) || ((val, fn) => Promise.resolve(gv.call(val, fn)));
export { default as withAsyncContext } from "unctx/with-async-context"; // optional if you use the transform


Export map:

// @gitvan/core/package.json
{
  "exports": {
    "./ctx": "./src/ctx.js",
    "...": "./src/..."
  }
}

2) Put context around daemon execution

packages/daemon/src/loop.js

import { callVanAsync } from "@gitvan/core/ctx";
import { loadConfig } from "@gitvan/core/config";
import { git } from "@gitvan/core/git";
import { NOTES_REF, RESULTS_REF } from "@gitvan/core/notes";
import { isTimerDue, eventFires, commitMeta } from "./predicates.js";
import { runAction } from "./actions.js";
import { run } from "./hooks.js";

export async function tick(){
  const cfg = await loadConfig();
  const shas = await git.exec(`log --pretty=%H -n 300 --no-show-signature`).then(s => s.split("\n").filter(Boolean));
  await run("daemon:tick:before", { shas });

  let ran = 0;
  for (const sha of shas) {
    const raw = await git.exec(`notes --ref=${cfg.repo.notesRef||NOTES_REF} show ${sha}`).catch(()=>null);
    if (!raw) continue;
    const meta = await commitMeta(sha);
    const list = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [JSON.parse(raw)];

    for (const note of list) {
      const matched = (isTimerDue(note) || await eventFires(note, sha, meta));
      await run("event:match:after", { note, sha, matched });
      if (!matched) continue;

      // Context per execution
      await callVanAsync({ cfg, sha, note, meta, refs:{ NOTES_REF, RESULTS_REF }, git }, async () => {
        await run("action:before", { note, sha, action: note.run?.type || "noop" });
        const out = await runAction(note, sha); // everything inside can use useVan()
        const receipt = { kind:"workflow-receipt", id:note.id, status:"OK", ts:new Date().toISOString(), commit:sha, action:out.kind, output: out.output };
        await run("receipt:before", { note, sha, receipt });
        await git.note(JSON.stringify(receipt), cfg.repo.resultsRef || RESULTS_REF);
        await run("receipt:after", { note, sha, receiptRef: sha });
        ran++;
        await run("action:after", { note, sha, action: out.kind, output: out.output });
      });
    }
  }
  await run("daemon:tick:after", { ran });
}

3) Make LLM/provider context-aware

packages/llm/src/provider.js

import { tryUseVan } from "@gitvan/core/ctx";
import { loadConfig } from "@gitvan/core/config";

export async function generate({ model, prompt, options = {} }) {
  const ctx = tryUseVan();
  const cfg = ctx?.cfg || await loadConfig();
  const base = cfg.llm?.baseURL || "http://localhost:11434";
  const res = await fetch(`${base}/api/generate`, {
    method:"POST", headers:{ "content-type":"application/json" },
    body: JSON.stringify({ model: model || cfg.llm?.model, prompt, options, stream:false })
  });
  const j = await res.json();
  return j.response || "";
}

4) CLI runs inside context

packages/cli/bin/gitvan.js

import { callVan } from "@gitvan/core/ctx";
import { loadConfig } from "@gitvan/core/config";
import { git } from "@gitvan/core/git";
// ...
const runRecipe = defineCommand({
  // ...
  run: async ({ args }) => {
    const cfg = await loadConfig();
    await callVan({ cfg, git }, async () => {
      // apply steps; inside, useVan() is available to plugins/actions
      // ...
    });
  }
});

5) Actions use useVan() instead of re-loading

packages/daemon/src/actions.js

import { useVan } from "@gitvan/core/ctx";
import { generate } from "@gitvan/llm/provider";

export async function runAction(note){
  const { git, cfg } = useVan();
  if (note.run?.type === "llm-call") {
    const output = await generate({ model: note.run.model, prompt: note.run.prompt, options: note.run.options||{} });
    return { kind:"llm", output };
  }
  if (note.run?.type === "cli-call") {
    await git.exec(`${note.run.cmd} ${(note.run.args||[]).join(" ")}`);
    return { kind:"cli" };
  }
  return { kind:"noop" };
}

6) Hooks and plugins can read/modify context

Example plugin that pins env and prefixes prompts:

plugins/ctx-hardening.mjs

import { useVan } from "@gitvan/core/ctx";

export default ({ on }) => {
  on("cli:before", (ctx) => {
    const { cfg } = useVan();
    ctx.env = { TZ:"UTC", LANG:"C", ...ctx.env };
    if (cfg.repo?.signing?.require) ctx.env.GIT_TRACE = "1";
  });

  on("llm:before", (ctx) => {
    const { sha } = useVan();
    ctx.prompt = `[commit:${sha}]\n` + ctx.prompt;
    ctx.options = { seed: 7, ...ctx.options };
  });
};

7) Events files can use context helpers

events/build-on-merge.mjs

export const register = ({ on }) => {
  on("action:before", (ctx) => {
    const { note } = require("@gitvan/core/ctx").useVan(); // ESM: import at top
    if (ctx.action === "cli" && note?.on?.mergeTo === "main") ctx.env = { ...ctx.env, CI:"1" };
  });
};
export default { on:["mergeTo:main","signed"], run:"cli:pnpm -C scripts build" };

8) Optional: transform for broad async usage

If you need context inside deep await chains everywhere, enable unctx plugin at build time and wrap long asyncs with withAsyncContext. Not required for happy path.

Result: single source of truth passed through the system. Hooks, actions, LLM, CLI, and plugins all share state via useVan(). Deterministic, minimal, no boilerplate.

You said:
Lets go back to the 43 patterns. What do they look like now?
ChatGPT said:
Thought for 12s

They’re now canonical notes + recipe steps. Each pattern compiles to a tiny JSON “step” (for one-shot runs) or an event note (for daemon-driven runs). Hooks enforce policy; context (useVan()) carries repo/config.

Control-flow (20)

Sequence → empty commit

{"kind":"sequence","args":{"msg":"step"}}


Parallel Split → spawn branch

{"kind":"cli-call","args":{"cmd":"git","args":["checkout","-b","feat-A"]}}


Synchronization → merge no-ff

{"kind":"cli-call","args":{"cmd":"git","args":["merge","--no-ff","feat-A"]}}


Exclusive Choice → pick one branch

{"kind":"cli-call","args":{"cmd":"git","args":["checkout","fast-track"]}}


Simple Merge → fast merge

{"kind":"cli-call","args":{"cmd":"git","args":["merge","topic"]}}


Multi-Choice → N branches from main

{"kind":"cli-call","args":{"cmd":"bash","args":["-lc","for b in A B; do git checkout -b $b; done"]}}


Synchronizing Merge (structured) → merge planned set

{"kind":"cli-call","args":{"cmd":"bash","args":["-lc","git checkout main && git merge --no-ff A B"]}}


Multi-Merge → repeated merges back

{"kind":"cli-call","args":{"cmd":"bash","args":["-lc","for b in A B C; do git merge --no-ff $b; done"]}}


Discriminator (first finisher wins) → event + hook decides first

// events/discriminator.mjs
export default { on: ["pushTo:feat-*"], run: "js:./scripts/discriminator.mjs#acceptFirst" }


Arbitrary Cycles → tag loop point + repeat

{"kind":"milestone","args":{"tag":"loop-1"}}


Implicit Termination → structure signals done (no step)
(document via receipt note:)

{"kind":"taskData","args":{"key":"implicit-termination","value":"true"}}


MI no Sync → N parallel, no join

{"kind":"cli-call","args":{"cmd":"bash","args":["-lc","for i in 1 2 3; do git checkout -b mi-$i; done"]}}


MI design-time N → as above with fixed N

MI runtime-known N → js computes N

{"kind":"js-call","args":{"module":"./scripts/mi.js","export":"spawn","input":{"countFromEnv":true}}}


MI runtime-unknown → producer appends branches

{"kind":"js-call","args":{"module":"./scripts/mi.js","export":"produce"}}


Deferred Choice → decide at merge time via policy hook

export default { on:["mergeTo:staging","signed"], run:"js:./scripts/deferred.mjs#decide" }


Interleaved Parallel → serialize critical section via hook

export default { on:"pathChanged:src/**", run:"cli:pnpm test" } // hook enforces mutex


Milestone → tag

{"kind":"milestone","args":{"tag":"v1.0.0"}}


Cancel Task → revert HEAD

{"kind":"cli-call","args":{"cmd":"git","args":["revert","--no-edit","HEAD"]}}


Cancel Case → hard reset

{"kind":"cli-call","args":{"cmd":"git","args":["reset","--hard","origin/main"]}}

Data (9)

Task Data → git note on current commit

{"kind":"taskData","args":{"key":"owner","value":"sean"}}


Block Data → note at block tag

{"kind":"taskData","args":{"key":"block:billing","value":"P1"}}


Case Data → note on mainline commit

{"kind":"taskData","args":{"key":"case","value":"ABC-42"}}


Transfer by Value → add blob to tree

{"kind":"cli-call","args":{"cmd":"bash","args":["-lc","cp input.json data/ && git add data/input.json && git commit -m 'data:input'"]}}


Transfer by Reference → submodule

{"kind":"cli-call","args":{"cmd":"git","args":["submodule","add","https://repo/url","deps/x"]}}


Data-based Routing → route by message/notes

export default { on:"message:^TYPE:refund", run:"cli:git checkout refund-lane" }


External Input → structured note JSON

{"kind":"taskData","args":{"key":"external","value":{"wf":"timer","at":"2025-12-01T00:00:00Z"}}}


Data Validation → js predicate throws on fail (hook or step)

{"kind":"js-call","args":{"module":"./scripts/validate.mjs","export":"assertClean"}}


Data Versioning → tag snapshots

{"kind":"milestone","args":{"tag":"snapshot-2025-09-15"}}

Resource (9)

Role-based Allocation → signer/GPG key

{"kind":"taskData","args":{"key":"role","value":"reviewer:KEYID_A"}}


Organizational Allocation → group label in notes

{"kind":"taskData","args":{"key":"org","value":"payments"}}}


Separation of Duties → hook enforces distinct signers on merge

export default { on:"mergeTo:main", run:"cli:git merge --no-ff feature" } // SoD hook checks


Retain Familiar → require same signer as before (hook)
(step not needed; policy plugin enforces)

Capability-based Routing → note + branch

{"kind":"taskData","args":{"key":"capability","value":"android-build"}}


Resource Pool → pool branch strategy

{"kind":"cli-call","args":{"cmd":"git","args":["checkout","-b","pool/runner-1"]}}


Case Ownership → owner note

{"kind":"taskData","args":{"key":"owner","value":"alice"}}


Direct Allocation → explicit signer key (policy consumes)

{"kind":"taskData","args":{"key":"signer","value":"KEYID_B"}}


Work Prioritization → priority note + lane

{"kind":"taskData","args":{"key":"priority","value":"P1"}}

Exception / Time (5)

Timeout / Escalation → deadline encoded; hook enforces on merge

export default { on:"mergeTo:main", run:"js:./scripts/timeout.mjs#enforce" }


Repeat-Until → loop with predicate

{"kind":"js-call","args":{"module":"./scripts/repeat.mjs","export":"untilGreen"}}


Retry with Backoff → action wrapper uses hook to retry

export default { on:"pushTo:retry/*", run:"js:./scripts/retry.mjs#run" }


Compensation / Saga → chained reverts plan

{"kind":"js-call","args":{"module":"./scripts/compensate.mjs","export":"saga"}}


Provenance / Audit → PROV-like note + receipts

{"kind":"taskData","args":{"key":"provenance","value":"prov:build->test->release"}}

Canonical event note (what the daemon consumes)
{
  "id":"daily-dev-diary",
  "wf":"cron",
  "cron":"0 18 * * *",
  "run":{"type":"llm-call","model":"llama3.2","prompt":"Summarize today"}
}

CLI noun–verb examples
gitvan recipe run changelog
gitvan daemon start
gitvan config apply

Hooks you’ll actually use

event:match:* to encode Discriminator, Interleaved Parallel, Deferred Choice.

policy:* to enforce SoD, Retain Familiar, Timeout.

receipt:* to attach proofs for Provenance/Audit.

Everything remains Git-only: commits, merges, tags, notes, receipts.

You said:
Ok lets now rewrite the readme
ChatGPT said:
Thought for 8s
gitvan

Git-only workflow engine. 43 van der Aalst patterns as tiny JSON steps and events. No servers. No runners. No DB. JS only.

Why

Git is state, queue, audit.

Notes and tags are receipts.

Hooks and plugins control policy.

Two files to start.

Install
# zero-scaffold
git init
npm pkg set type=module
npm i -D @gitvan/cli

Two-file app
package.json
{
  "name": "my-repo",
  "private": true,
  "type": "module",
  "scripts": {
    "van": "gitvan",
    "van:init": "gitvan repo init",
    "van:apply": "gitvan config apply",
    "van:daemon": "gitvan daemon start"
  }
}

gitvan.config.js
export default {
  repo: {
    defaultBranch: "main",
    notesRef: "refs/notes/gitvan",
    resultsRef: "refs/notes/gitvan/results",
    signing: { require: true }
  },

  // inline recipes (optional)
  recipes: [{
    kind: "gitvan-recipe",
    name: "dev-diary-inline",
    version: "0.1.0",
    steps: [
      { id:"collect",   kind:"cli-call", args:{ cmd:"git", args:["log","--since=1.day","--oneline"] } },
      { id:"summarize", kind:"llm-call", args:{ model:"llama3.2", prompt:"Summarize today:\\n{{collect.output}}" } },
      { id:"store",     kind:"taskData", args:{ key:"dev-diary", value:"{{summarize.output}}" } }
    ]
  }],

  // triggers → actions; wf inferred
  events: [
    { id:"daily-dev-diary", cron:"0 18 * * *", run:"llm:llama3.2|Summarize today’s commits." },
    { id:"changelog-on-tag", on:"semverTag",
      run:"cli:git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:'* %s' > CHANGELOG.md && git add CHANGELOG.md && git commit -m 'chore: changelog'" }
  ],

  // optional plugins (file or package)
  plugins: ["./plugins/redact.mjs"]
}


Run:

npm run van:init
npm run van:apply
npm run van:daemon


Outputs: signed receipts under refs/notes/gitvan/results.

Events directory (Nuxt-style)

Drop files in events/. gitvan config apply normalizes and writes notes.

events/
  daily-dev-diary.mjs
  changelog-on-tag.mjs

// events/daily-dev-diary.mjs
export default { cron: "0 18 * * *", run: "llm:llama3.2|Summarize today’s commits." }

// events/changelog-on-tag.mjs
export default { on: "semverTag", run: "cli:pnpm -C scripts changelog" }

Defaults and inference

repo.defaultBranch=main

notesRef=refs/notes/gitvan, resultsRef=refs/notes/gitvan/results

wf inferred: cron → cron, at → timer, on → event

run shorthands:

cli:<shell> → {type:"cli-call", cmd:"bash", args:["-lc", "<shell>"]}

js:./task.mjs#fn → {type:"js-call", module:"./task.mjs", export:"fn"}

llm:MODEL|PROMPT → {type:"llm-call", model:"MODEL", prompt:"PROMPT"}

CLI (noun-verb)
gitvan repo init
gitvan config show
gitvan config apply
gitvan cookbook install <name>
gitvan recipe run <id>
gitvan daemon start
gitvan daemon once
gitvan diagnose

Patterns (43) → Git

All patterns compile to steps or events. Examples:

Sequence → empty commit: {"kind":"sequence","args":{"msg":"step"}}

Parallel split → git checkout -b feat-A (cli-call)

Synchronization → git merge --no-ff feat-A

Exclusive choice → git checkout fast-track

Milestone → {"kind":"milestone","args":{"tag":"v1.0.0"}}

Discriminator → event + hook selects first merge

Cancel task → git revert --no-edit HEAD

Case data / task data → {"kind":"taskData","args":{"key":"owner","value":"alice"}}

Timeout / SoD / Interleaved → enforced by hooks on merges

Full list is in /cookbook as recipes.

Hooks (spine)

Powered by hookable. All payloads are mutable.

config:load:before|after

config:apply:before|after

daemon:start · daemon:tick:before|after

event:match:before|after

action:before|after (cli|js|llm)

llm:before|after

cli:before|after

receipt:before|after

note:write:before|after

policy:check

Plugin example
// plugins/redact.mjs
export default ({ on }) => {
  const re = /(AKIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36})/g
  on("receipt:before", (ctx) => {
    if (typeof ctx.receipt.output === "string") ctx.receipt.output = ctx.receipt.output.replace(re, "***")
  })
  on("cli:before", (ctx) => { ctx.env = { TZ:"UTC", LANG:"C", ...ctx.env } })
}


Declare in gitvan.config.js:

export default { plugins: ["./plugins/redact.mjs"], events:[/* … */] }

Context (unctx)

Each execution runs inside a context. Use it in actions/plugins.

import { useVan } from "@gitvan/core/ctx";
// inside action/hook:
const { cfg, git, sha, note } = useVan();

LLM (optional)

Defaults: Ollama at http://localhost:11434. Model from config. Prompts, params, outputs are stored in receipts. Use seeds when supported.

Receipts

Stored at refs/notes/gitvan/results.

Shape:

{"kind":"workflow-receipt","id":"daily-dev-diary","status":"OK","ts":"2025-09-15T00:00:00Z","commit":"<sha>","action":"llm","output":"..."}

Security

Require signed merges/tags.

SoD via hooks. Different signer for merge vs author.

CLI allowlist (cmds and paths).

Read-only humans. Bots sign.

Cookbook (dark-matter 80/20)

Ready recipes: dev-diary, changelog, release notes, SBOM diff, ADR draft, incident note, reviewer routing, backport plan, test prioritization. Install and run.

gitvan cookbook install dev-diary
gitvan recipe run dev-diary

Project structure (optional monorepo)

Pure JS. No TypeScript.

packages/
  core/      # git, workflow helpers, config, ctx
  cli/       # bin/gitvan
  daemon/    # predicates, actions, loop, hooks
  llm/       # provider
  cookbook/  # recipes/*

License

Apache-2.0.

You said:
Is kind needed?
ChatGPT said:
Thought for 10s

No.

Events: kind not needed. Use { id, cron|at|on, run }. wf inferred.

Recipes: kind optional per step. Infer:

args.cmd → cli-call

args.module → js-call

args.model && args.prompt → llm-call

args.tag → milestone

args.msg → sequence

args.key && args.value → taskData

Receipts: keep a type tag for audit. Prefer type: "receipt" (or keep kind:"workflow-receipt"). Everything else can drop kind.

Minimal examples

Recipe step (no kind):

{ "id":"write", "args":{ "cmd":"bash", "args":["-lc","echo ok"] } }


Normalizer → {"kind":"cli-call", ...} internally.

Event (no kind):

{ "id":"daily-diary", "cron":"0 18 * * *", "run":"llm:llama3.2|Summarize today" }


Receipt (typed):

{ "type":"receipt", "id":"daily-diary", "status":"OK", "ts":"...", "commit":"...", "action":"llm" }

Tiny infer helper
function inferKind(step){
  const a = step.args||{};
  if (a.cmd) return "cli-call";
  if (a.module) return "js-call";
  if (a.model && a.prompt) return "llm-call";
  if (a.tag) return "milestone";
  if (a.msg) return "sequence";
  if (a.key && "value" in a) return "taskData";
  throw new Error("unknown step shape");
}


Bottom line: drop kind in authoring for events and steps; retain a typed receipt for grep-ability.

You said:
I think type is a overloaded word and kind doesn’t have any contextual meanings. Create a turtle ontology for the whole project 
ChatGPT said:
Thought for 36s
@prefix gv:    <https://gitvan.dev/ns#> .
@prefix gvcs:  <https://gitvan.dev/ns/cs#> .          # concept schemes
@prefix prov:  <http://www.w3.org/ns/prov#> .
@prefix dct:   <http://purl.org/dc/terms/> .
@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix skos:  <http://www.w3.org/2004/02/skos/core#> .
@prefix sh:    <http://www.w3.org/ns/shacl#> .

############################
# Ontology header
############################

<https://gitvan.dev/ns>
  a owl:Ontology ;
  dct:title "gitvan ontology" ;
  dct:creator "gitvan" ;
  dct:license <https://www.apache.org/licenses/LICENSE-2.0> ;
  dct:issued "2025-09-15"^^xsd:date .

############################
# Core classes
############################

gv:Config        a owl:Class ; rdfs:label "Config" .
gv:Repository    a owl:Class ; rdfs:label "Git repository" .
gv:Event         a owl:Class ; rdfs:label "Workflow event" ; rdfs:subClassOf prov:Entity .
gv:Trigger       a owl:Class ; rdfs:label "Trigger" ; rdfs:subClassOf prov:Entity .
gv:Predicate     a owl:Class ; rdfs:label "Predicate" .
gv:Action        a owl:Class ; rdfs:label "Action" ; rdfs:subClassOf prov:Plan .
gv:Run           a owl:Class ; rdfs:label "Action run" ; rdfs:subClassOf prov:Activity .
gv:Receipt       a owl:Class ; rdfs:label "Execution receipt" ; rdfs:subClassOf prov:Entity .
gv:Recipe        a owl:Class ; rdfs:label "Recipe" ; rdfs:subClassOf prov:Plan .
gv:Step          a owl:Class ; rdfs:label "Recipe step" ; rdfs:subClassOf prov:Entity .
gv:Policy        a owl:Class ; rdfs:label "Policy" ; rdfs:subClassOf prov:Entity .
gv:HookInvocation a owl:Class ; rdfs:label "Hook invocation" ; rdfs:subClassOf prov:Activity .
gv:Context       a owl:Class ; rdfs:label "Execution context" ; rdfs:subClassOf prov:Entity .
gv:GitRef        a owl:Class ; rdfs:label "Git ref" .
gv:GitCommit     a owl:Class ; rdfs:label "Git commit" ; rdfs:subClassOf prov:Entity .
gv:GitTag        a owl:Class ; rdfs:label "Git tag" ; rdfs:subClassOf prov:Entity .
gv:GitNote       a owl:Class ; rdfs:label "Git note" ; rdfs:subClassOf prov:Entity .
gv:Agent         a owl:Class ; rdfs:label "Agent" ; rdfs:subClassOf prov:Agent .

############################
# Action specializations
############################

gv:CLICall  a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "CLI call" .
gv:JSCall   a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "JS module call" .
gv:LLMCall  a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "LLM call" .
gv:Milestone a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "Milestone (tag)" .
gv:Sequence  a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "Sequence (empty commit)" .
gv:TaskData  a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "Task data note" .
gv:GitMerge  a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "Git merge" .
gv:GitBranch a owl:Class ; rdfs:subClassOf gv:Action ; rdfs:label "Git branch" .

############################
# Trigger specializations
############################

gv:CronTrigger  a owl:Class ; rdfs:subClassOf gv:Trigger ; rdfs:label "Cron trigger" .
gv:TimeTrigger  a owl:Class ; rdfs:subClassOf gv:Trigger ; rdfs:label "Absolute time trigger" .
gv:EventTrigger a owl:Class ; rdfs:subClassOf gv:Trigger ; rdfs:label "Repo event trigger" .

############################
# Predicates (as individuals in a scheme)
############################

gvcs:PredicateScheme a skos:ConceptScheme ; skos:prefLabel "Predicate types" .
gv:mergeTo      a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "mergeTo" .
gv:pushTo       a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "pushTo" .
gv:tagCreate    a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "tagCreate" .
gv:semverTag    a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "semverTag" .
gv:pathChanged  a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "pathChanged" .
gv:messageMatch a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "messageMatch" .
gv:authorEmail  a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "authorEmail" .
gv:signed       a skos:Concept ; skos:inScheme gvcs:PredicateScheme ; skos:prefLabel "signed" .

############################
# Status scheme
############################

gvcs:StatusScheme a skos:ConceptScheme ; skos:prefLabel "Run status" .
gv:OK    a skos:Concept ; skos:inScheme gvcs:StatusScheme ; skos:prefLabel "OK" .
gv:ERROR a skos:Concept ; skos:inScheme gvcs:StatusScheme ; skos:prefLabel "ERROR" .
gv:SKIP  a skos:Concept ; skos:inScheme gvcs:StatusScheme ; skos:prefLabel "SKIP" .

############################
# Workflow patterns (van der Aalst 43)
############################

gvcs:PatternScheme a skos:ConceptScheme ; skos:prefLabel "Workflow patterns" .

# Control-flow (1–20)
gv:SequencePattern            a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Sequence" .
gv:ParallelSplitPattern       a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Parallel Split" .
gv:SynchronizationPattern     a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Synchronization" .
gv:ExclusiveChoicePattern     a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Exclusive Choice" .
gv:SimpleMergePattern         a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Simple Merge" .
gv:MultiChoicePattern         a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Multi-Choice" .
gv:SynchronizingMergePattern  a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Synchronizing Merge" .
gv:MultiMergePattern          a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Multi-Merge" .
gv:DiscriminatorPattern       a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Discriminator" .
gv:ArbitraryCyclesPattern     a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Arbitrary Cycles" .
gv:ImplicitTerminationPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Implicit Termination" .
gv:MI_NoSyncPattern           a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "MI without Sync" .
gv:MI_DesignTimePattern       a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "MI design-time" .
gv:MI_RuntimeKnownPattern     a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "MI runtime-known" .
gv:MI_RuntimeUnknownPattern   a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "MI runtime-unknown" .
gv:DeferredChoicePattern      a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Deferred Choice" .
gv:InterleavedParallelPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Interleaved Parallel" .
gv:MilestonePattern           a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Milestone" .
gv:CancelTaskPattern          a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Cancel Task" .
gv:CancelCasePattern          a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Cancel Case" .

# Data (21–29)
gv:TaskDataPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Task Data" .
gv:BlockDataPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Block Data" .
gv:CaseDataPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Case Data" .
gv:TransferByValuePattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Transfer by Value" .
gv:TransferByRefPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Transfer by Reference" .
gv:DataRoutingPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Data-based Routing" .
gv:ExternalInputPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "External Input" .
gv:DataValidationPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Data Validation" .
gv:DataVersioningPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Data Versioning" .

# Resource (30–38)
gv:RoleAllocPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Role-based Allocation" .
gv:OrgAllocPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Organizational Allocation" .
gv:SeparationOfDutiesPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Separation of Duties" .
gv:RetainFamiliarPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Retain Familiar" .
gv:CapabilityRoutingPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Capability Routing" .
gv:ResourcePoolPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Resource Pool" .
gv:CaseOwnershipPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Case Ownership" .
gv:DirectAllocPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Direct Allocation" .
gv:PrioritizePattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Work Prioritization" .

# Exception/Time (39–43)
gv:TimeoutPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Timeout/Escalation" .
gv:RepeatUntilPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Repeat-Until" .
gv:RetryBackoffPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Retry with Backoff" .
gv:CompensationSagaPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Compensation/Saga" .
gv:ProvenanceAuditPattern a skos:Concept ; skos:inScheme gvcs:PatternScheme ; skos:prefLabel "Provenance/Audit" .

############################
# Properties
############################

gv:hasRepository  a owl:ObjectProperty ; rdfs:domain gv:Config ; rdfs:range gv:Repository .
gv:defaultBranch  a owl:DatatypeProperty ; rdfs:domain gv:Repository ; rdfs:range xsd:string .
gv:notesRef       a owl:DatatypeProperty ; rdfs:domain gv:Repository ; rdfs:range xsd:string .
gv:resultsRef     a owl:DatatypeProperty ; rdfs:domain gv:Repository ; rdfs:range xsd:string .
gv:requireSigned  a owl:DatatypeProperty ; rdfs:domain gv:Repository ; rdfs:range xsd:boolean .

gv:hasEvent       a owl:ObjectProperty ; rdfs:domain gv:Config ; rdfs:range gv:Event .
gv:hasTrigger     a owl:ObjectProperty ; rdfs:domain gv:Event ; rdfs:range gv:Trigger .
gv:triggersAction a owl:ObjectProperty ; rdfs:domain gv:Event ; rdfs:range gv:Action .
gv:realizesPattern a owl:ObjectProperty ; rdfs:domain gv:Action ; rdfs:range skos:Concept .

# Trigger data
gv:cronExpr       a owl:DatatypeProperty ; rdfs:domain gv:CronTrigger ; rdfs:range xsd:string .
gv:atTime         a owl:DatatypeProperty ; rdfs:domain gv:TimeTrigger ; rdfs:range xsd:dateTime .
gv:hasPredicate   a owl:ObjectProperty ; rdfs:domain gv:EventTrigger ; rdfs:range gv:Predicate .
gv:predicateType  a owl:ObjectProperty ; rdfs:domain gv:Predicate ; rdfs:range skos:Concept .
gv:mergeToBranch  a owl:DatatypeProperty ; rdfs:domain gv:Predicate ; rdfs:range xsd:string .
gv:pushToGlob     a owl:DatatypeProperty ; rdfs:domain gv:Predicate ; rdfs:range xsd:string .
gv:tagGlob        a owl:DatatypeProperty ; rdfs:domain gv:Predicate ; rdfs:range xsd:string .
gv:pathGlob       a owl:DatatypeProperty ; rdfs:domain gv:Predicate ; rdfs:range xsd:string .
gv:regex          a owl:DatatypeProperty ; rdfs:domain gv:Predicate ; rdfs:range xsd:string .
gv:booleanFlag    a owl:DatatypeProperty ; rdfs:domain gv:Predicate ; rdfs:range xsd:boolean .

# Action payloads
gv:command        a owl:DatatypeProperty ; rdfs:domain gv:CLICall ; rdfs:range xsd:string .
gv:argv           a owl:DatatypeProperty ; rdfs:domain gv:CLICall ; rdfs:range xsd:string .
gv:modulePath     a owl:DatatypeProperty ; rdfs:domain gv:JSCall ; rdfs:range xsd:string .
gv:exportName     a owl:DatatypeProperty ; rdfs:domain gv:JSCall ; rdfs:range xsd:string .
gv:prompt         a owl:DatatypeProperty ; rdfs:domain gv:LLMCall ; rdfs:range xsd:string .
gv:model          a owl:DatatypeProperty ; rdfs:domain gv:LLMCall ; rdfs:range xsd:string .
gv:optionsJSON    a owl:DatatypeProperty ; rdfs:domain gv:Action ; rdfs:range xsd:string .
gv:tagName        a owl:DatatypeProperty ; rdfs:domain gv:Milestone ; rdfs:range xsd:string .
gv:message        a owl:DatatypeProperty ; rdfs:domain gv:Sequence ; rdfs:range xsd:string .
gv:dataKey        a owl:DatatypeProperty ; rdfs:domain gv:TaskData ; rdfs:range xsd:string .
gv:dataValue      a owl:DatatypeProperty ; rdfs:domain gv:TaskData ; rdfs:range xsd:string .

# Git linkage
gv:commit         a owl:ObjectProperty ; rdfs:domain gv:Receipt ; rdfs:range gv:GitCommit .
gv:sha            a owl:DatatypeProperty ; rdfs:domain gv:GitCommit ; rdfs:range xsd:string .
gv:onBranch       a owl:DatatypeProperty ; rdfs:domain gv:GitCommit ; rdfs:range xsd:string .
gv:refName        a owl:DatatypeProperty ; rdfs:domain gv:GitRef ; rdfs:range xsd:string .
gv:noteRef        a owl:DatatypeProperty ; rdfs:domain gv:GitNote ; rdfs:range xsd:string .

# Runs and receipts
gv:forEvent       a owl:ObjectProperty ; rdfs:domain gv:Run ; rdfs:range gv:Event .
gv:forAction      a owl:ObjectProperty ; rdfs:domain gv:Run ; rdfs:range gv:Action .
gv:status         a owl:ObjectProperty ; rdfs:domain gv:Receipt ; rdfs:range skos:Concept .
gv:output         a owl:DatatypeProperty ; rdfs:domain gv:Receipt ; rdfs:range xsd:string .
gv:outputHash     a owl:DatatypeProperty ; rdfs:domain gv:Receipt ; rdfs:range xsd:string .
gv:executionRef   a owl:DatatypeProperty ; rdfs:domain gv:Run ; rdfs:range xsd:string .
gv:resultsNoteRef a owl:DatatypeProperty ; rdfs:domain gv:Receipt ; rdfs:range xsd:string .
gv:ranBy          a owl:ObjectProperty ; rdfs:domain gv:Run ; rdfs:range gv:Agent .

# Hooks & policies
gv:hookName       a owl:DatatypeProperty ; rdfs:domain gv:HookInvocation ; rdfs:range xsd:string .
gv:payloadJSON    a owl:DatatypeProperty ; rdfs:domain gv:HookInvocation ; rdfs:range xsd:string .
gv:appliesToHook  a owl:DatatypeProperty ; rdfs:domain gv:Policy ; rdfs:range xsd:string .
gv:allowCmdRegex  a owl:DatatypeProperty ; rdfs:domain gv:Policy ; rdfs:range xsd:string .
gv:allowPathRegex a owl:DatatypeProperty ; rdfs:domain gv:Policy ; rdfs:range xsd:string .

############################
# SHACL shapes (minimal)
############################

gv:EventShape a sh:NodeShape ;
  sh:targetClass gv:Event ;
  sh:property [ sh:path gv:hasTrigger ; sh:minCount 1 ] ;
  sh:property [ sh:path gv:triggersAction ; sh:minCount 1 ] .

gv:ReceiptShape a sh:NodeShape ;
  sh:targetClass gv:Receipt ;
  sh:property [ sh:path gv:status ; sh:minCount 1 ] ;
  sh:property [ sh:path gv:commit ; sh:minCount 1 ] ;
  sh:property [ sh:path dct:created ; sh:minCount 1 ] .

############################
# Example instances
############################

# Config → Repo
[] a gv:Config ;
  gv:hasRepository [
    a gv:Repository ;
    gv:defaultBranch "main" ;
    gv:notesRef "refs/notes/gitvan" ;
    gv:resultsRef "refs/notes/gitvan/results" ;
    gv:requireSigned true
  ] ;
  gv:hasEvent [
    a gv:Event ;
    dct:identifier "daily-dev-diary" ;
    gv:hasTrigger [ a gv:CronTrigger ; gv:cronExpr "0 18 * * *" ] ;
    gv:triggersAction [
      a gv:LLMCall ;
      gv:model "llama3.2" ;
      gv:prompt "Summarize today's commits."
    ]
  ] .

# Receipt for a run
[] a gv:Receipt ;
  dct:identifier "daily-dev-diary#2025-09-15T18:00:03Z" ;
  gv:status gv:OK ;
  gv:output "Today: refactor parser, add hooks." ;
  gv:outputHash "blake3:8d8c…";
  dct:created "2025-09-15T18:00:03Z"^^xsd:dateTime ;
  gv:commit [ a gv:GitCommit ; gv:sha "abc123…" ; gv:onBranch "main" ] ;
  gv:resultsNoteRef "refs/notes/gitvan/results" .

# Event with repo predicates
[] a gv:Event ;
  dct:identifier "changelog-on-tag" ;
  gv:hasTrigger [
    a gv:EventTrigger ;
    gv:hasPredicate [
      a gv:Predicate ;
      gv:predicateType gv:semverTag ;
      gv:booleanFlag true
    ]
  ] ;
  gv:triggersAction [
    a gv:CLICall ;
    gv:command "bash" ;
    gv:argv "-lc|git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:'* %s' > CHANGELOG.md && git add CHANGELOG.md && git commit -m 'chore: changelog'"
  ] .

# Recipe step: Synchronization pattern via merge
[] a gv:Step ;
  dct:identifier "sync-feat-A" ;
  prov:wasDerivedFrom gv:SynchronizationPattern ;
  gv:triggersAction [ a gv:GitMerge ; gv:command "git" ; gv:argv "merge --no-ff feat-A" ] .

You said:

Skip to content
Navigation Menu
seanchatmangpt
gitvan

Type / to search

Code
Issues
Pull requests
Actions
Projects
Wiki
Security
Insights
Settings
Owner avatar
gitvan
Public
generated from unjs/template
seanchatmangpt/gitvan
Go to file
t
Name		
seanchatmangpt
seanchatmangpt
Initial commit
5169669
 · 
1 minute ago
.github/workflows
Initial commit
1 minute ago
src
Initial commit
1 minute ago
test
Initial commit
1 minute ago
.editorconfig
Initial commit
1 minute ago
.gitignore
Initial commit
1 minute ago
.prettierrc
Initial commit
1 minute ago
LICENSE
Initial commit
1 minute ago
README.md
Initial commit
1 minute ago
build.config.mjs
Initial commit
1 minute ago
eslint.config.mjs
Initial commit
1 minute ago
package.json
Initial commit
1 minute ago
renovate.json
Initial commit
1 minute ago
tsconfig.json
Initial commit
1 minute ago
Repository files navigation
README
MIT license
packageName
npm version npm downloads

This is my package description.

Usage
Install the package:

# ✨ Auto-detect (supports npm, yarn, pnpm, deno and bun)
npx nypm install packageName
Import:

ESM (Node.js, Bun, Deno)

import {} from "pkg";
CDN (Deno, Bun and Browsers)

import {} from "https://esm.sh/pkg";
Development
local development
License
Published under the MIT license. Made by community 💛



🤖 auto updated with automd

About
Git as Runtime

Resources
 Readme
License
 MIT license
 Activity
Stars
 0 stars
Watchers
 0 watching
Forks
 0 forks
Releases
No releases published
Create a new release
Packages
No packages published
Publish your first package
Languages
JavaScript
60.9%
 
TypeScript
39.1%
Footer
© 2025 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
GitHub Community
Docs
Contact
Manage cookies
Do not share my personal information



I cloned the unjs template so what should the gitvan repo look like now? We are not going to be doing the monorepo for now
ChatGPT said:
Thought for 21s

Target: single-package repo, pure ESM JS, UnJS libs, no monorepo. Here’s the shape and the minimum you need.

Folder layout
gitvan/
  bin/
    gitvan.mjs
  src/
    config.mjs
    normalize.mjs
    events.mjs
    hooks.mjs
    ctx.mjs
    git.mjs
    notes.mjs
    predicates.mjs
    actions.mjs
    daemon/
      loop.mjs
  README.md
  package.json
  .editorconfig
  .gitignore
  eslint.config.mjs
  LICENSE

package.json (core CLI package)
{
  "name": "gitvan",
  "version": "0.0.1",
  "type": "module",
  "bin": { "gitvan": "bin/gitvan.mjs" },
  "engines": { "node": ">=18" },
  "scripts": {
    "dev": "node bin/gitvan.mjs diagnose",
    "lint": "eslint .",
    "build": "echo skip",
    "test": "node bin/gitvan.mjs --help"
  },
  "dependencies": {
    "c12": "^1.5.0",
    "consola": "^3.2.3",
    "defu": "^6.1.4",
    "hookable": "^5.5.3",
    "ofetch": "^1.3.4",
    "pathe": "^1.1.2",
    "unctx": "^2.3.0",
    "unrouting": "^0.3.0"
  }
}


Remove TS files and tsconfig.json.

bin/gitvan.mjs (noun–verb)
#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'; // if you prefer citty; else parse args manually
import { loadConfig } from '../src/config.mjs';
import { applyConfig } from '../src/normalize.mjs';
import { startLoop, once } from '../src/daemon/loop.mjs';
import { log } from '../src/git.mjs';

const repo = defineCommand({
  meta: { name: 'repo' },
  subCommands: {
    init: defineCommand({
      meta: { name: 'init' },
      async run() {
        const { exec } = await import('../src/git.mjs');
        await exec('init');
        await exec('commit --allow-empty -m "init"');
        log.success('repo init');
      }
    })
  }
});

const cfg = defineCommand({
  meta: { name: 'config' },
  subCommands: {
    show: defineCommand({ async run(){ console.log(JSON.stringify(await loadConfig(), null, 2)); } }),
    apply: defineCommand({ async run(){ const cfg = await loadConfig(); const wrote = await applyConfig(cfg); log.success(`applied ${wrote} notes`); } })
  }
});

const daemon = defineCommand({
  meta: { name: 'daemon' },
  subCommands: {
    start: defineCommand({ async run(){ await startLoop(); } }),
    once: defineCommand({ async run(){ const ran = await once(); log.success(`ran ${ran}`); } })
  }
});

const diagnose = defineCommand({
  meta: { name: 'diagnose' },
  async run() {
    const cfg = await loadConfig();
    console.log({ notesRef: cfg.repo.notesRef, resultsRef: cfg.repo.resultsRef, model: cfg.llm.model });
  }
});

const main = defineCommand({
  meta: { name: 'gitvan', version: '0.0.1' },
  subCommands: { repo, config: cfg, daemon, diagnose }
});

runMain(main);

src/config.mjs
import { loadConfig as c12 } from 'c12';
import { defu } from 'defu';
import { log } from './git.mjs';

const defaults = {
  repo: { defaultBranch: 'main', notesRef: 'refs/notes/gitvan', resultsRef: 'refs/notes/gitvan/results', signing: { require: true } },
  llm: { baseURL: 'http://localhost:11434', model: 'llama3.2', temperature: 0.2 },
  events: [], recipes: [], plugins: []
};

export async function loadConfig(cwd = process.cwd()) {
  const { config } = await c12({ name: 'gitvan', cwd, dotenv: true, defaults });
  const out = defu(config || {}, defaults);
  log.debug('config loaded');
  return out;
}

src/normalize.mjs
import { loadEventsDir } from './events.mjs';
import { NOTES_REF } from './notes.mjs';
import { note } from './git.mjs';

export async function applyConfig(cfg, cwd = process.cwd()) {
  const fromDir = await loadEventsDir(cwd);
  const all = [...(cfg.events || []), ...fromDir].map(normalizeEvent.bind(null, cfg));
  let wrote = 0;
  for (const ev of all) { await note(JSON.stringify(ev), cfg.repo.notesRef || NOTES_REF); wrote++; }
  return wrote;
}

function normalizeEvent(cfg, e) {
  const wf = e.cron ? 'cron' : e.at ? 'timer' : 'event';
  const on = normOn(e.on);
  const run = normRun(e.run, cfg);
  const out = { id: e.id || `ev-${Math.random().toString(36).slice(2,8)}`, wf, run };
  if (e.cron) out.cron = e.cron;
  if (e.at) out.at = e.at;
  if (on) out.on = on;
  return out;
}

function normOn(on) {
  if (!on) return null;
  const tok = t => t==='semverTag'?{semverTag:true}:t==='signed'?{signed:true}:
    t.startsWith('mergeTo:')?{mergeTo:t.split(':')[1]}:
    t.startsWith('pushTo:')?{pushTo:t.split(':')[1]}:
    t.startsWith('pathChanged:')?{pathChanged:t.split(':')[1]}:{message:t};
  if (typeof on === 'string') return tok(on);
  if (Array.isArray(on)) return { any: on.map(tok) };
  return on;
}

function normRun(run, cfg) {
  if (!run) return null;
  if (typeof run !== 'string') return run;
  if (run.startsWith('cli:')) return { type:'cli-call', cmd:'bash', args:['-lc', run.slice(4)] };
  if (run.startsWith('js:'))  { const [m,e='default']=run.slice(3).split('#'); return { type:'js-call', module:m, export:e }; }
  if (run.startsWith('llm:')) { const body=run.slice(4); const [model,...p]=body.split('|'); return { type:'llm-call', model: model||cfg.llm.model, prompt:p.join('|') }; }
  return { type:'cli-call', cmd:'bash', args:['-lc', run] };
}

src/events.mjs
import fs from 'node:fs';
import { join, relative } from 'pathe';
import { pathToFileURL } from 'node:url';

export async function loadEventsDir(cwd = process.cwd()) {
  const dir = join(cwd, 'events');
  if (!fs.existsSync(dir)) return [];
  const files = walk(dir).filter(f => /\.(mjs|js)$/.test(f));
  const out = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(f).href);
    const raw = mod.default || mod;
    out.push({ id: idFrom(dir, f), ...raw });
  }
  return out;
}

function walk(dir, acc=[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = join(dir, e.name);
    e.isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
}
function idFrom(root, file) { return relative(root, file).replace(/\.(mjs|js)$/,'').replace(/[\\/]/g,'-'); }

src/hooks.mjs
import { createHooks } from 'hookable';
export const hooks = createHooks();
export const on  = hooks.hook.bind(hooks);
export const run = hooks.callHook.bind(hooks);

src/ctx.mjs
import { createContext } from 'unctx';
import { AsyncLocalStorage } from 'node:async_hooks';
const gv = createContext({ asyncContext: true, AsyncLocalStorage });
export const useVan = gv.use;
export const callVan = gv.call.bind(gv);
export const callVanAsync = gv.callAsync?.bind(gv) || ((v,fn)=>Promise.resolve(gv.call(v,fn)));

src/git.mjs
import { execSync } from 'node:child_process';
import { createConsola } from 'consola';
export const log = createConsola({ level: 3 });

export function sh(s){ return execSync(`git -C "${process.cwd()}" ${s}`, { stdio:['ignore','pipe','inherit'] }).toString().trim(); }
export async function exec(args){ return sh(args); }
export async function note(message, ref){ try { sh(`notes --ref=${ref} add -m '${message.replace(/'/g,"'\\''")}'`); } catch { sh(`notes --ref=${ref} append -m '${message.replace(/'/g,"'\\''")}'`); } }

src/notes.mjs
export const NOTES_REF   = 'refs/notes/gitvan';
export const RESULTS_REF = 'refs/notes/gitvan/results';

src/predicates.mjs
export function isTimerDue(n, now = new Date()){ if (n.wf==='cron') return matchCron(n.cron, now); if (n.wf==='timer' && n.at) return new Date(n.at) <= now; return false; }
export async function eventFires(n, sha, meta){ if (n.wf!=='event' || !n.on) return false; const p=n.on;
  if (p.semverTag) return meta.tags.some(t=>/^v?\d+\.\d+\.\d+/.test(t));
  if (p.mergeTo)   return meta.isMerge && meta.branches.includes(p.mergeTo);
  if (p.pushTo)    return meta.branches.some(b=>glob(p.pushTo,b));
  if (p.pathChanged) return meta.changes.some(c=>glob(p.pathChanged,c.path));
  if (p.any) return p.any.some(x=>eventFires({ wf:'event', on:x }, sha, meta));
  return false;
}

export async function commitMeta(sha){
  const { exec } = await import('./git.mjs');
  const parents = (await exec(`rev-list --parents -n 1 ${sha}`)).split(' ').slice(1);
  const isMerge = parents.length >= 2;
  const branches = (await exec(`branch --contains ${sha} --format="%(refname:short)"`)).split('\n').filter(Boolean);
  const tags = (await exec(`tag --contains ${sha}`)).split('\n').filter(Boolean);
  const diff = await exec(`diff-tree --no-commit-id --name-status -r ${sha}`);
  const changes = diff.split('\n').filter(Boolean).map(l => { const [s, ...r] = l.split(/\s+/); return { status:s, path:r.pop()||'' }; });
  return { isMerge, branches, tags, changes };
}

function glob(glob, s){ const r = new RegExp('^'+glob.split('*').map(escape).join('.*')+'$'); return r.test(s); }
function escape(x){ return x.replace(/[.+?^${}()|[\]\\]/g,'\\$&'); }
function matchCron(spec,d){ const [m,h,dom,mon,dow]=spec.trim().split(/\s+/); const M=d.getUTCMinutes(),H=d.getUTCHours(),D=d.getUTCDate(),O=d.getUTCMonth()+1,W=d.getUTCDay();
  const ok=(f,v)=>f==='*'||f.split(',').some(t=>t.startsWith('*/')?(v%Number(t.slice(2))===0):t.includes('-')?(v>=+t.split('-')[0]&&v<=+t.split('-')[1]):(+t===v));
  return ok(m,M)&&ok(h,H)&&ok(dom,D)&&ok(mon,O)&&ok(dow,W);
}

src/actions.mjs
import { exec } from './git.mjs';
import { generate } from './llm.mjs';

export async function runAction(note){
  const r = note.run || {};
  if (r.type === 'cli-call') { await exec(`${r.cmd} ${(r.args||[]).join(' ')}`); return { kind:'cli' }; }
  if (r.type === 'js-call')  { const mod = await import(new URL(r.module, `file://${process.cwd()}/`).href); const fn = r.export==='default'?mod.default:mod[r.export]; await fn(r.input||{}); return { kind:'js' }; }
  if (r.type === 'llm-call') { const out = await generate({ model:r.model, prompt:r.prompt, options:r.options||{} }); return { kind:'llm', output: out }; }
  return { kind:'noop' };
}

src/llm.mjs
import { ofetch } from 'ofetch';
import { loadConfig } from './config.mjs';
export async function generate({ model, prompt, options = {} }) {
  const cfg = await loadConfig();
  const base = cfg.llm.baseURL;
  const res = await ofetch(`${base}/api/generate`, { method:'POST', body:{ model: model||cfg.llm.model, prompt, options, stream:false } });
  return res.response || '';
}

src/daemon/loop.mjs
import { exec, note } from '../git.mjs';
import { RESULTS_REF } from '../notes.mjs';
import { loadConfig } from '../config.mjs';
import { isTimerDue, eventFires, commitMeta } from '../predicates.mjs';
import { runAction } from '../actions.mjs';

export async function once(){
  const cfg = await loadConfig();
  const shas = (await exec('log --pretty=%H -n 300 --no-show-signature')).split('\n').filter(Boolean);
  let ran = 0;
  for (const sha of shas) {
    const raw = await exec(`notes --ref=${cfg.repo.notesRef} show ${sha}`).catch(()=>null);
    if (!raw) continue;
    const meta = await commitMeta(sha);
    const list = Array.isArray(JSON.parse(raw))?JSON.parse(raw):[JSON.parse(raw)];
    for (const n of list) {
      const due = isTimerDue(n) || await eventFires(n, sha, meta);
      if (!due) continue;
      const out = await runAction(n);
      const receipt = { role:"receipt", id:n.id, status:"OK", ts:new Date().toISOString(), commit:sha, action:out.kind, output: out.output||"" };
      await note(JSON.stringify(receipt), cfg.repo.resultsRef || RESULTS_REF);
      ran++;
    }
  }
  return ran;
}

export async function startLoop(intervalMs = 1500){
  for (;;) { await once(); await new Promise(r=>setTimeout(r, intervalMs)); }
}


This gives you a clean single-package gitvan repo that:

Loads gitvan.config.* and an events/ dir from the caller repo.

Writes canonical event notes.

Runs a minimal daemon loop.

Supports cli/js/llm actions.

Stays pure JS, UnJS-first, Git-only.