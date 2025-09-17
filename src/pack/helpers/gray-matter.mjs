// Simple gray-matter implementation for front-matter parsing
export default {
  default(content) {
    const lines = content.split("\n");
    let inFrontMatter = false;
    let frontMatterLines = [];
    let contentLines = [];
    let foundEnd = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line === "---") {
        inFrontMatter = true;
        continue;
      }

      if (inFrontMatter && line === "---") {
        inFrontMatter = false;
        foundEnd = true;
        continue;
      }

      if (inFrontMatter) {
        frontMatterLines.push(line);
      } else {
        contentLines.push(line);
      }
    }

    // Parse YAML-like front matter (simplified)
    const data = {};
    if (foundEnd && frontMatterLines.length > 0) {
      let currentKey = null;
      let currentValue = {};

      for (const line of frontMatterLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Check for nested structure (key:)
        if (trimmedLine.endsWith(":") && !trimmedLine.includes(" ")) {
          currentKey = trimmedLine.slice(0, -1);
          currentValue = {};
          data[currentKey] = currentValue;
          continue;
        }

        // Check for key: value pairs
        const match = trimmedLine.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          // Basic type inference
          if (value === "true") {
            if (currentKey) {
              currentValue[key] = true;
            } else {
              data[key] = true;
            }
          } else if (value === "false") {
            if (currentKey) {
              currentValue[key] = false;
            } else {
              data[key] = false;
            }
          } else if (/^\d+$/.test(value)) {
            const numValue = parseInt(value, 10);
            if (currentKey) {
              currentValue[key] = numValue;
            } else {
              data[key] = numValue;
            }
          } else if (value.startsWith('"') && value.endsWith('"')) {
            const strValue = value.slice(1, -1);
            if (currentKey) {
              currentValue[key] = strValue;
            } else {
              data[key] = strValue;
            }
          } else if (value.startsWith("'") && value.endsWith("'")) {
            const strValue = value.slice(1, -1);
            if (currentKey) {
              currentValue[key] = strValue;
            } else {
              data[key] = strValue;
            }
          } else {
            if (currentKey) {
              currentValue[key] = value;
            } else {
              data[key] = value;
            }
          }
        }
      }
    }

    return {
      content: contentLines.join("\n"),
      data,
      matter: frontMatterLines.join("\n"),
    };
  },
};

// Export as named function too
export function matter(content) {
  return exports.default(content);
}
