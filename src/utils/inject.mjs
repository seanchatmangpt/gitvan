/**
 * GitVan v2 Idempotent Injection Utilities
 * Pure functions for safely injecting content into existing files
 */

/**
 * Check if content already contains the snippet
 * @param {string} haystack - Content to search in
 * @param {string} needle - Content to search for
 * @returns {boolean} True if already contains
 */
function alreadyContains(haystack, needle) {
  return haystack.includes(needle);
}

/**
 * Injects a snippet into content using various placement strategies
 * @param {string} content - Original content
 * @param {Object} options - Injection options
 * @param {string} options.where - Placement strategy: 'before', 'after', 'at_line', 'between'
 * @param {string} options.find - Anchor text to find for before/after placement
 * @param {string} options.start - Start anchor for between placement
 * @param {string} options.end - End anchor for between placement
 * @param {number} options.line - Line number for at_line placement (1-based)
 * @param {string} options.snippet - Content to inject
 * @param {string} options.eol - End of line character (default: '\n')
 * @param {boolean} options.once - Only inject once, skip if already present (default: true)
 * @returns {{ changed: boolean, content: string }} Result with change status and new content
 */
export function injectString(
  content,
  { where = "after", find, start, end, line, snippet, eol = "\n", once = true }
) {
  const src = String(content).replace(/\r\n|\r|\n/g, "\n");
  const block = String(snippet).replace(/\r\n|\r|\n/g, "\n");

  // Check if already contains the snippet (idempotent)
  if (once && alreadyContains(src, block)) {
    return { changed: false, content: src };
  }

  // Handle at_line placement
  if (where === "at_line") {
    const lines = src.split("\n");
    const idx = Math.max(0, Math.min(lines.length, Number(line || 1) - 1));
    lines.splice(idx, 0, block);
    return { changed: true, content: lines.join("\n") };
  }

  // Handle between placement
  if (where === "between") {
    const sIdx = src.indexOf(start);
    const eIdx = src.indexOf(end, sIdx >= 0 ? sIdx + start.length : 0);
    if (sIdx === -1 || eIdx === -1) {
      // Anchors missing, append at end with new anchors
      return {
        changed: true,
        content: `${src}${
          src.endsWith("\n") ? "" : "\n"
        }${start}\n${block}\n${end}`,
      };
    }
    return {
      changed: true,
      content: `${src.slice(0, sIdx + start.length)}\n${block}\n${src.slice(
        eIdx
      )}`,
    };
  }

  // Handle before/after placement
  const findIdx = src.indexOf(find);
  if (findIdx === -1) {
    // Anchor missing, append to end
    return {
      changed: true,
      content: `${src}${src.endsWith("\n") ? "" : "\n"}${block}`,
    };
  }

  if (where === "before") {
    return {
      changed: true,
      content: `${src.slice(0, findIdx)}${block}${eol}${src.slice(findIdx)}`,
    };
  }

  // after (default)
  const afterIdx = findIdx + String(find).length;
  return {
    changed: true,
    content: `${src.slice(0, afterIdx)}${eol}${block}${src.slice(afterIdx)}`,
  };
}
