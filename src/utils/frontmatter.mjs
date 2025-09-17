// Front-matter parser utility
// - Supports YAML (default), TOML, JSON via gray-matter engines
// - Pure function: accepts string, returns { data, body }
// - Preserves body exactly (no excerpt) for deterministic hashing

import matter from "gray-matter";
import toml from "toml";

const fmEngines = {
  toml: (s) => toml.parse(s),
  json: matter.engines.json,
  yaml: matter.engines.yaml,
};

/**
 * Parses front-matter from a string input.
 * Accepts YAML (---), TOML (+++), or JSON ({ ... }) blocks understood by gray-matter.
 *
 * @param {string|Buffer} input
 * @returns {{ data: Record<string, any>, body: string }}
 */
export function parseFrontmatter(input) {
  const raw = String(input);
  const hasShebang = raw.startsWith("#!");
  let shebangLine = "";
  let source = raw;
  if (hasShebang) {
    const nl = raw.indexOf("\n");
    if (nl === -1) {
      // Single-line file with only shebang
      return { data: {}, body: raw };
    }
    shebangLine = raw.slice(0, nl);
    source = raw.slice(nl + 1);
  }

  // Try different front-matter formats
  let fm = matter(source, { excerpt: false });

  // If no front-matter found (isEmpty=true or no data), try TOML format
  if (
    (fm.isEmpty || Object.keys(fm.data).length === 0) &&
    source.startsWith("+++")
  ) {
    const tomlEnd = source.indexOf("+++", 3);
    if (tomlEnd !== -1) {
      const tomlContent = source.slice(3, tomlEnd);
      const body = source.slice(tomlEnd + 3).replace(/^\n/, "");
      try {
        const data = toml.parse(tomlContent);
        fm = { data, content: body };
      } catch (e) {
        // Fall back to treating as regular content
      }
    }
  }

  // If still no front-matter, try JSON format
  if (
    (fm.isEmpty || Object.keys(fm.data).length === 0) &&
    source.startsWith(";")
  ) {
    const jsonEnd = source.indexOf("\n");
    if (jsonEnd !== -1) {
      const jsonContent = source.slice(1, jsonEnd);
      const body = source.slice(jsonEnd + 1);
      try {
        const data = JSON.parse(jsonContent);
        fm = { data, content: body };
      } catch (e) {
        // Fall back to treating as regular content
      }
    }
  }

  const body = fm.content || "";
  return {
    data: fm.data || {},
    body: hasShebang ? `${shebangLine}\n${body}` : body,
  };
}
