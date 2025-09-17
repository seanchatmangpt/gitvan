// Front-matter parser utility
// - Supports YAML (default), TOML, JSON via gray-matter engines
// - Pure function: accepts string, returns { data, body }
// - Preserves body exactly (no excerpt) for deterministic hashing

import matter from "gray-matter";
import toml from "toml";
import yaml from "js-yaml";

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
 * @param {Object} options - Parsing options
 * @param {boolean} options.strict - Whether to use strict YAML parsing (default: false)
 * @returns {{ data: Record<string, any>, body: string }}
 */
export function parseFrontmatter(input, options = {}) {
  const { strict = false } = options;
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
  let fm;
  try {
    fm = matter(source, {
      excerpt: false,
      engines: strict
        ? {
            yaml: {
              parse: (str) => {
                try {
                  // Use js-yaml for strict validation
                  return yaml.load(str);
                } catch (error) {
                  throw new Error(`Invalid YAML frontmatter: ${error.message}`);
                }
              },
            },
          }
        : undefined,
    });
  } catch (error) {
    if (strict && error.message.includes("Invalid YAML frontmatter")) {
      throw error;
    }
    // Fall back to treating as regular content
    return { data: {}, body: source };
  }

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

/**
 * Validates frontmatter syntax without parsing the data.
 *
 * @param {string|Buffer} input
 * @returns {boolean} - True if frontmatter syntax is valid
 */
export function validateFrontmatter(input) {
  try {
    parseFrontmatter(input, { strict: true });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates and parses frontmatter with detailed error information.
 *
 * @param {string|Buffer} input
 * @returns {{ valid: boolean, data?: Record<string, any>, body?: string, error?: string }}
 */
export function validateAndParseFrontmatter(input) {
  try {
    const result = parseFrontmatter(input, { strict: true });
    return {
      valid: true,
      data: result.data,
      body: result.body,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}
