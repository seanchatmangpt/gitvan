#!/usr/bin/env node

/**
 * GITVAN-26922-04: test gate that can fail.
 *
 * `pnpm test` must exit NON-ZERO when:
 *  - any test fails in any chunk,
 *  - a chunk process dies without a parseable JSON summary (crash, SIGSEGV),
 *  - a chunk output shows a V8 heap OOM ("heap out of memory" / "FATAL ERROR"),
 *  - a chunk file does not exist / cannot run.
 *
 * The suite is split into chunks so each chunk gets a fresh worker pool:
 * one chunk's memory pressure cannot OOM the rest (the "split" option of
 * the work order). stdout from tests is silenced (--silent) so a noisy
 * suite cannot fill the disk (a 5.2 GB log was observed on 2026-09-23).
 *
 * Escape hatch: `pnpm test:direct` runs vitest directly (watch off).
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const CHUNK_SIZE = 12;
const OOM_SIGNATURES = [/heap out of memory/i, /FATAL ERROR/];

function walk(dir, out) {
  for (const entry of readdirSync(join(projectRoot, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.test\.mjs$|\.spec\.mjs$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function listTestFiles() {
  const files = [];
  if (existsSync(join(projectRoot, "tests"))) walk("tests", files);
  const only = process.env.TEST_GATE_ONLY;
  const filtered = only ? files.filter((f) => f.includes(only)) : files;
  return [...new Set(filtered)].sort();
}

function runChunk(files, dir, index) {
  const jsonOut = join(dir, `chunk-${index}.json`);
  const vitestEntry = join(projectRoot, "node_modules", "vitest", "vitest.mjs");
  const args = [
    vitestEntry,
    "run",
    "--silent",
    "--reporter=dot",
    "--reporter=json",
    `--outputFile.json=${jsonOut}`,
    ...files,
  ];
  const res = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    timeout: 30 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  const oom = OOM_SIGNATURES.some((re) => re.test(out));
  let summary = null;
  if (existsSync(jsonOut)) {
    try {
      summary = JSON.parse(readFileSync(jsonOut, "utf8"));
    } catch {
      // unparseable summary counts as a broken run below
    }
  }
  const failedTests = [];
  if (summary?.testResults) {
    for (const tr of summary.testResults) {
      if (tr.status !== "passed") {
        for (const a of tr.assertionResults ?? []) {
          if (a.status === "failed") {
            failedTests.push(`${tr.name.replace(projectRoot + "/", "")} :: ${a.fullName}`);
          }
        }
      }
    }
  }
  const reasons = [];
  if (res.error && res.error.code === "ABORT_ERR") reasons.push("aborted");
  else if (res.error) reasons.push(`spawn:${res.error.code}`);
  if (res.signal) reasons.push(`signal:${res.signal}`);
  if (oom) reasons.push("heap-OOM");
  if (!summary) reasons.push(`no-summary(exit=${res.status})`);
  else if (summary.success !== true) reasons.push("tests-failed");
  return {
    index,
    files: files.length,
    ok: reasons.length === 0,
    reasons,
    failedTests,
  };
}

async function main() {
  const all = listTestFiles();
  if (all.length === 0) {
    console.error("test-gate: no test files found under tests/");
    process.exit(1);
  }
  const chunks = [];
  for (let i = 0; i < all.length; i += CHUNK_SIZE) {
    chunks.push(all.slice(i, i + CHUNK_SIZE));
  }
  console.log(
    `test-gate: ${all.length} test files in ${chunks.length} chunks of <=${CHUNK_SIZE}`,
  );
  const dir = mkdtempSync(join(tmpdir(), "gitvan-test-gate-"));
  const results = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      const r = runChunk(chunks[i], dir, i);
      results.push(r);
      console.log(
        `chunk ${i + 1}/${chunks.length}: ${r.ok ? "PASS" : "FAIL"} (${r.files} files${r.reasons.length ? ` — ${r.reasons.join(", ")}` : ""})`,
      );
      for (const f of r.failedTests.slice(0, 20)) {
        console.log(`  FAILED ${f}`);
      }
      if (r.failedTests.length > 20) {
        console.log(`  ... and ${r.failedTests.length - 20} more failed tests`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok);
  const totalFailedTests = results.reduce((n, r) => n + r.failedTests.length, 0);
  console.log(
    `test-gate: ${results.length - failed.length}/${results.length} chunks passed, ${totalFailedTests} failed tests`,
  );
  if (failed.length > 0) {
    console.error(`test-gate: FAILING CHUNKS: ${failed.map((f) => f.index + 1).join(", ")}`);
    process.exit(1);
  }
  process.exit(0);
}

main();
