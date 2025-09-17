// Simple gray-matter implementation for front-matter parsing
export default {
  default(content) {
    const lines = content.split('\n');
    let inFrontMatter = false;
    let frontMatterLines = [];
    let contentLines = [];
    let foundEnd = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line === '---') {
        inFrontMatter = true;
        continue;
      }

      if (inFrontMatter && line === '---') {
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
      for (const line of frontMatterLines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          // Basic type inference
          if (value === 'true') data[key] = true;
          else if (value === 'false') data[key] = false;
          else if (/^\d+$/.test(value)) data[key] = parseInt(value, 10);
          else if (value.startsWith('"') && value.endsWith('"')) {
            data[key] = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            data[key] = value.slice(1, -1);
          } else {
            data[key] = value;
          }
        }
      }
    }

    return {
      content: contentLines.join('\n'),
      data,
      matter: frontMatterLines.join('\n')
    };
  }
};

// Export as named function too
export function matter(content) {
  return exports.default(content);
}