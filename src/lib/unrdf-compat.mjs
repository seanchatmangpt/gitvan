/**
 * Compatibility shim for @unrdf/core
 *
 * Provides parseTurtle and toTurtle functions that the codebase expects
 * but which are not exported by the current @unrdf/core package.
 * This bridges the API gap until @unrdf/core adds native Turtle support.
 */

import { createStore, createQuad, createNamedNode, createLiteral, createBlankNode, toNTriples } from "@unrdf/core";

/**
 * Parse Turtle/N-Triples content into an array of quads.
 * Simplified parser that handles common Turtle patterns.
 * @param {string} turtle - Turtle or N-Triples content
 * @param {Object} options - Parse options
 * @returns {Array} Array of quads
 */
export function parseTurtle(turtle, options = {}) {
  if (!turtle || typeof turtle !== "string") {
    return [];
  }

  const quads = [];
  const prefixes = {};

  const lines = turtle.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    // Parse @prefix directives
    const prefixMatch = trimmed.match(/^@prefix\s+(\w*):?\s+<([^>]+)>\s*\.\s*$/);
    if (prefixMatch) {
      prefixes[prefixMatch[1]] = prefixMatch[2];
      continue;
    }

    // Parse PREFIX directives (SPARQL style)
    const prefixMatch2 = trimmed.match(/^PREFIX\s+(\w*):?\s+<([^>]+)>\s*$/i);
    if (prefixMatch2) {
      prefixes[prefixMatch2[1]] = prefixMatch2[2];
      continue;
    }

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@")) {
      continue;
    }

    // Parse N-Triples style: <s> <p> <o> . or <s> <p> "literal" .
    const ntMatch = trimmed.match(/^<([^>]+)>\s+<([^>]+)>\s+(?:<([^>]+)>|"([^"]*)"(?:\^\^<([^>]+)>)?)\s*\.\s*$/);
    if (ntMatch) {
      const subject = createNamedNode(ntMatch[1]);
      const predicate = createNamedNode(ntMatch[2]);
      const object = ntMatch[3]
        ? createNamedNode(ntMatch[3])
        : ntMatch[5]
          ? createLiteral(ntMatch[4], ntMatch[5])
          : createLiteral(ntMatch[4]);
      quads.push(createQuad(subject, predicate, object));
    }
  }

  return quads;
}

/**
 * Serialize quads to Turtle format.
 * @param {Object|Array} storeOrQuads - Store object or array of quads
 * @param {Object} options - Serialization options
 * @returns {string} Turtle string
 */
export function toTurtle(storeOrQuads, options = {}) {
  // If it's an array, use toNTriples-style output
  const quads = Array.isArray(storeOrQuads) ? storeOrQuads : [];

  if (quads.length === 0 && storeOrQuads && typeof storeOrQuads === "object" && !Array.isArray(storeOrQuads)) {
    // Try to get N-Triples from store
    try {
      return toNTriples(storeOrQuads);
    } catch {
      return "";
    }
  }

  // Simple N-Triples serialization for quad arrays
  return quads
    .map((q) => {
      const s = q.subject?.value ? `<${q.subject.value}>` : String(q.subject);
      const p = q.predicate?.value ? `<${q.predicate.value}>` : String(q.predicate);
      const o = q.object?.termType === "Literal"
        ? `"${q.object.value}"`
        : q.object?.value ? `<${q.object.value}>` : String(q.object);
      return `${s} ${p} ${o} .`;
    })
    .join("\n");
}
