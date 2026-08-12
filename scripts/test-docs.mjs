#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const verbose = process.argv.includes("--verbose");
const dryRun = process.argv.includes("--dry-run");

const plannedReferences = new Set([
  "docs/api/config.md",
  "docs/api/commands.md",
  "docs/composables/git.md",
  "docs/composables/job.md",
  "docs/composables/pack.md",
  "docs/composables/run.md",
  "docs/composables/template.md",
  "docs/composables/event.md",
  "docs/composables/lock.md",
  "docs/composables/log.md",
  "docs/composables/receipt.md",
  "docs/composables/schedule.md",
  "docs/composables/worktree.md",
  "docs/packs.md",
  "docs/events.md",
  "docs/advanced.md",
]);

const report = {
  subject: process.env.GITHUB_SHA || null,
  markdownFiles: 0,
  codeFences: 0,
  jsonBlocks: 0,
  internalLinks: 0,
  externalLinks: 0,
  plannedReferences: [],
  failures: [],
};

function log(...args) {
  if (verbose) console.log(...args);
}

function projectPath(path) {
  return normalize(relative(root, path)).replaceAll("\\", "/");
}

function walkMarkdown(start) {
  if (!existsSync(start)) return [];
  const stat = statSync(start);
  if (stat.isFile()) return extname(start).toLowerCase() === ".md" ? [start] : [];
  if (!stat.isDirectory()) return [];

  const found = [];
  for (const entry of readdirSync(start, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = join(start, entry.name);
    if (entry.isDirectory()) found.push(...walkMarkdown(path));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) found.push(path);
  }
  return found;
}

function normalizeLinkTarget(raw) {
  let target = raw.trim();
  if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
  const titleMatch = target.match(/^(.*?)(?:\s+["'][^"']*["'])$/);
  if (titleMatch) target = titleMatch[1].trim();
  try {
    target = decodeURIComponent(target);
  } catch {
    // Existence validation below will refuse malformed local paths.
  }
  return target;
}

function validateMarkdown(file) {
  const rel = projectPath(file);
  const text = readFileSync(file, "utf8");
  report.markdownFiles += 1;

  const fences = [...text.matchAll(/^```([^\n]*)$/gm)];
  if (fences.length % 2 !== 0) report.failures.push({ file: rel, type: "UNCLOSED_CODE_FENCE" });

  for (const match of text.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)) {
    const language = match[1].trim().split(/\s+/)[0].toLowerCase();
    const body = match[2];
    report.codeFences += 1;
    if (language !== "json" && language !== "jsonc") continue;
    if (/\.\.\.|<[^>]+>|\{\{[^}]+\}\}/.test(body)) continue;
    if (language === "jsonc" && /(^|\s)\/\//m.test(body)) continue;
    try {
      JSON.parse(body);
      report.jsonBlocks += 1;
    } catch (error) {
      report.failures.push({ file: rel, type: "INVALID_JSON_EXAMPLE", error: error.message });
    }
  }

  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = normalizeLinkTarget(match[1]);
    if (!target || target.startsWith("#")) continue;
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(target)) {
      report.externalLinks += 1;
      continue;
    }

    const withoutFragment = target.split("#", 1)[0].split("?", 1)[0];
    if (!withoutFragment) continue;
    const resolved = withoutFragment.startsWith("/")
      ? resolve(root, withoutFragment.slice(1))
      : resolve(dirname(file), withoutFragment);
    const relTarget = projectPath(resolved);
    report.internalLinks += 1;

    if (existsSync(resolved)) continue;
    if (plannedReferences.has(relTarget)) {
      report.plannedReferences.push({ file: rel, target: relTarget });
      continue;
    }
    report.failures.push({ file: rel, type: "BROKEN_INTERNAL_LINK", target: relTarget });
  }
}

// Active customer-facing contract only. Historical analyses remain archival content,
// not release documentation authority.
const roots = [
  join(root, "README.md"),
  join(root, "GETTING_STARTED.md"),
  join(root, "API_REFERENCE.md"),
  join(root, "MIGRATION_GUIDE.md"),
  join(root, "SECURITY.md"),
  join(root, "docs", "enterprise"),
];

const files = [...new Set(roots.flatMap(walkMarkdown))].sort();
if (files.length === 0) {
  console.error("REFUSED: no active documentation contract was discovered");
  process.exit(1);
}

for (const file of files) validateMarkdown(file);

const unique = new Map();
for (const item of report.plannedReferences) unique.set(`${item.file}\0${item.target}`, item);
report.plannedReferences = [...unique.values()];

if (!dryRun) writeFileSync("docs-test-report.json", `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  markdownFiles: report.markdownFiles,
  codeFences: report.codeFences,
  jsonBlocks: report.jsonBlocks,
  internalLinks: report.internalLinks,
  externalLinks: report.externalLinks,
  plannedReferences: report.plannedReferences.length,
  failures: report.failures.length,
}, null, 2));

for (const item of report.plannedReferences) log(`UNSUPPORTED planned reference: ${item.file} -> ${item.target}`);
for (const failure of report.failures) console.error(`REFUSED ${failure.type}: ${JSON.stringify(failure)}`);

process.exit(report.failures.length === 0 ? 0 : 1);
