#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function splitTurtleStatements(source) {
  const statements = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  let angleDepth = 0;
  for (const char of source) {
    current += char;
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "<") angleDepth += 1;
    else if (char === ">") angleDepth = Math.max(0, angleDepth - 1);
    else if (char === "." && angleDepth === 0) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function decodeLiteral(value) {
  return JSON.parse(`"${value}"`);
}

function idFromIri(iri) {
  return `gitvan.${iri.replace("https://gitvan.dev/capability/", "").replaceAll("-", ".")}`;
}

export function parseCapabilityOntology(source) {
  const capabilities = [];
  for (const statement of splitTurtleStatements(source)) {
    if (!statement.includes("a gv:Capability")) continue;
    const iri = statement.match(/^<([^>]+)>/)?.[1];
    const title = statement.match(/dcterms:title\s+"((?:[^"\\]|\\.)*)"/)?.[1];
    const state = statement.match(/gv:state\s+"((?:[^"\\]|\\.)*)"/)?.[1];
    const verifier = statement.match(/gv:verifier\s+"((?:[^"\\]|\\.)*)"/)?.[1];
    if (!iri || title === undefined || state === undefined || verifier === undefined) {
      throw new Error(`Incomplete capability statement: ${statement}`);
    }
    const dependencySegment = statement.match(/gv:dependsOn\s+([\s\S]*?)(?:;|\.$)/)?.[1] || "";
    const dependsOn = [...dependencySegment.matchAll(/<([^>]+)>/g)].map(match => idFromIri(match[1])).sort();
    capabilities.push({
      id: idFromIri(iri),
      title: decodeLiteral(title),
      state: decodeLiteral(state),
      dependsOn,
      verifier: decodeLiteral(verifier),
      generatedBy: "ggen",
    });
  }
  return capabilities.sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeCapability(capability) {
  return {
    id: String(capability.id),
    title: String(capability.title),
    state: String(capability.state),
    dependsOn: [...(capability.dependsOn || [])].map(String).sort(),
    verifier: String(capability.verifier),
    generatedBy: String(capability.generatedBy || ""),
  };
}

export function compareCapabilityProjection(expected, actual) {
  const expectedById = new Map(expected.map(item => [item.id, normalizeCapability(item)]));
  const actualById = new Map(actual.map(item => [item.id, normalizeCapability(item)]));
  const missing = [...expectedById.keys()].filter(id => !actualById.has(id)).sort();
  const extra = [...actualById.keys()].filter(id => !expectedById.has(id)).sort();
  const mismatched = [];
  for (const [id, expectedCapability] of expectedById) {
    const actualCapability = actualById.get(id);
    if (!actualCapability) continue;
    if (JSON.stringify(expectedCapability) !== JSON.stringify(actualCapability)) {
      mismatched.push({ id, expected: expectedCapability, actual: actualCapability });
    }
  }
  return Object.freeze({ ok: missing.length === 0 && extra.length === 0 && mismatched.length === 0, missing, extra, mismatched });
}

export async function verifyCapabilityProjection(options = {}) {
  const cwd = resolve(options.cwd || process.cwd());
  const ontologyPath = resolve(cwd, options.ontology || "ontology/gitvan-capabilities.ttl");
  const manifestPath = resolve(cwd, options.manifest || "src/capabilities/generated/manifest.mjs");
  const ontologySource = await readFile(ontologyPath, "utf8");
  const manifestSource = await readFile(manifestPath, "utf8");
  const moduleUrl = `${pathToFileURL(manifestPath).href}?projection=${sha256(manifestSource)}`;
  const module = await import(moduleUrl);
  const comparison = compareCapabilityProjection(parseCapabilityOntology(ontologySource), module.gitvanCapabilities || []);
  return Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-projection-report/v1",
    ontology: { path: ontologyPath, sha256: sha256(ontologySource) },
    manifest: { path: manifestPath, sha256: sha256(manifestSource) },
    ...comparison,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await verifyCapabilityProjection();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
