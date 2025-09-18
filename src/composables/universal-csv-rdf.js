/**
 * Universal CSV to RDF Converter
 * Converts CSV data to Turtle RDF format
 */

export function csvToRDF(csvText, baseIRI, entityType = "Record") {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return "";

  // Parse CSV headers
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  // Generate RDF
  let rdf = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@base <${baseIRI}> .

`;

  // Generate RDF for each row
  rows.forEach((row, index) => {
    const subject = `<${entityType.toLowerCase()}_${index + 1}>`;
    rdf += `${subject} rdf:type <${entityType}> ;\n`;

    headers.forEach((header, colIndex) => {
      const value = row[colIndex];
      if (value && value.trim() !== "") {
        const predicate = `<${sanitizeHeader(header)}>`;
        const object = formatRDFValue(value);
        rdf += `    ${predicate} ${object} ;\n`;
      }
    });

    // Remove trailing semicolon and add period
    rdf = rdf.replace(/ ;\n$/, " .\n\n");
  });

  return rdf;
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());

  return result;
}

/**
 * Sanitize header for RDF predicate
 */
function sanitizeHeader(header) {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

/**
 * Format value for RDF
 */
function formatRDFValue(value) {
  const trimmed = value.trim();

  // Check if it's a number
  if (/^-?\d+$/.test(trimmed)) {
    return `"${trimmed}"^^xsd:integer`;
  }

  if (/^-?\d*\.\d+$/.test(trimmed)) {
    return `"${trimmed}"^^xsd:decimal`;
  }

  // Check if it's a boolean
  if (trimmed.toLowerCase() === "true" || trimmed.toLowerCase() === "false") {
    return `"${trimmed}"^^xsd:boolean`;
  }

  // Check if it's a date
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return `"${trimmed}"^^xsd:date`;
  }

  // Default to string literal
  return `"${trimmed.replace(/"/g, '\\"')}"`;
}



