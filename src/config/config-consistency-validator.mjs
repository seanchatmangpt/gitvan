// src/config/config-consistency-validator.mjs
// Validates consistency between c12 and RDF configurations
// Detects discrepancies and reports conflicts with suggestions

/**
 * Compare c12 config with RDF config and report inconsistencies
 *
 * @param {Object} c12Config - C12 configuration object
 * @param {Object} rdfConfig - RDF configuration (as POJO)
 * @returns {Object} Consistency report with discrepancies and recommendations
 */
export function validateConfigConsistency(c12Config, rdfConfig) {
  const report = {
    isConsistent: true,
    discrepancies: [],
    onlyInC12: [],
    onlyInRDF: [],
    typeConflicts: [],
    valueConflicts: [],
    warnings: [],
  };

  // Normalize both configs for comparison
  const c12Normalized = _normalizeConfig(c12Config);
  const rdfNormalized = _normalizeConfig(rdfConfig);

  // Compare keys and values
  _compareConfigs(c12Normalized, rdfNormalized, report);

  // Mark as inconsistent if any discrepancies found
  if (
    report.discrepancies.length > 0 ||
    report.onlyInC12.length > 0 ||
    report.onlyInRDF.length > 0 ||
    report.typeConflicts.length > 0
  ) {
    report.isConsistent = false;
  }

  // Generate suggestions
  if (!report.isConsistent) {
    _generateSuggestions(report);
  }

  return report;
}

/**
 * Normalize config for consistent comparison
 * @private
 */
function _normalizeConfig(config, prefix = "", depth = 0) {
  if (depth > 10) return {}; // Prevent infinite recursion

  const normalized = {};

  if (!config || typeof config !== "object") {
    return normalized;
  }

  for (const [key, value] of Object.entries(config)) {
    const path = prefix ? `${prefix}.${key}` : key;

    // Skip special properties
    if (_shouldSkipProperty(key, value)) {
      continue;
    }

    if (value === null || value === undefined) {
      normalized[path] = null;
    } else if (Array.isArray(value)) {
      // Normalize arrays by converting to string representation
      normalized[path] = _normalizeArray(value);
    } else if (typeof value === "object" && value.constructor === Object) {
      // Recurse into nested objects
      const nested = _normalizeConfig(value, path, depth + 1);
      Object.assign(normalized, nested);
    } else {
      // Primitive values
      normalized[path] = _normalizePrimitive(value);
    }
  }

  return normalized;
}

/**
 * Check if property should be skipped during comparison
 * @private
 */
function _shouldSkipProperty(key, value) {
  // Skip special/internal properties
  if (
    key === "runtimeConfig" ||
    key === "output" ||
    key === "_resolved" ||
    key === "_config"
  ) {
    return true;
  }

  // Skip functions
  if (typeof value === "function") {
    return true;
  }

  return false;
}

/**
 * Normalize primitive value for comparison
 * @private
 */
function _normalizePrimitive(value) {
  if (typeof value === "boolean") {
    return value ? "true" : "false"; // Normalize to string for comparison
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(value);
}

/**
 * Normalize array for comparison
 * @private
 */
function _normalizeArray(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.map((item) => _normalizePrimitive(item)).sort().join("|");
}

/**
 * Recursively compare two config objects
 * @private
 */
function _compareConfigs(c12Config, rdfConfig, report) {
  const allKeys = new Set([
    ...Object.keys(c12Config),
    ...Object.keys(rdfConfig),
  ]);

  for (const key of allKeys) {
    const c12Value = c12Config[key];
    const rdfValue = rdfConfig[key];

    if (c12Value === undefined && rdfValue !== undefined) {
      report.onlyInRDF.push({
        path: key,
        value: rdfValue,
      });
    } else if (c12Value !== undefined && rdfValue === undefined) {
      report.onlyInC12.push({
        path: key,
        value: c12Value,
      });
    } else if (c12Value !== rdfValue) {
      // Values differ
      const c12Type = typeof c12Value;
      const rdfType = typeof rdfValue;

      if (c12Type !== rdfType) {
        report.typeConflicts.push({
          path: key,
          c12Value,
          c12Type,
          rdfValue,
          rdfType,
        });
      } else {
        report.valueConflicts.push({
          path: key,
          c12Value,
          rdfValue,
        });
      }

      report.discrepancies.push({
        path: key,
        c12Value,
        rdfValue,
        reason: c12Type !== rdfType ? "type-mismatch" : "value-mismatch",
      });
    }
  }
}

/**
 * Generate recommendations based on discrepancies
 * @private
 */
function _generateSuggestions(report) {
  for (const conflict of report.typeConflicts) {
    report.warnings.push({
      type: "type-mismatch",
      path: conflict.path,
      message: `Type mismatch for '${conflict.path}': c12 is ${conflict.c12Type}, RDF is ${conflict.rdfType}`,
      suggestion: `Verify that '${conflict.path}' has the correct type in both config sources`,
    });
  }

  for (const conflict of report.valueConflicts) {
    report.warnings.push({
      type: "value-mismatch",
      path: conflict.path,
      message: `Value mismatch for '${conflict.path}': c12='${conflict.c12Value}', RDF='${conflict.rdfValue}'`,
      suggestion: `Decide which value is authoritative and update the other source or use preferRDF option`,
    });
  }

  for (const item of report.onlyInC12) {
    report.warnings.push({
      type: "only-in-c12",
      path: item.path,
      message: `Path '${item.path}' exists in c12 but not in RDF`,
      suggestion: `Add '${item.path}' to RDF config or remove from c12 if deprecated`,
    });
  }

  for (const item of report.onlyInRDF) {
    report.warnings.push({
      type: "only-in-rdf",
      path: item.path,
      message: `Path '${item.path}' exists in RDF but not in c12`,
      suggestion: `Add '${item.path}' to c12 config or remove from RDF if it's test data`,
    });
  }
}

/**
 * Format consistency report as human-readable string
 *
 * @param {Object} report - Consistency report from validateConfigConsistency
 * @returns {string} Formatted report
 */
export function formatConsistencyReport(report) {
  if (!report) {
    return "No consistency report available";
  }

  const lines = [];

  lines.push("=".repeat(60));
  lines.push("Configuration Consistency Report");
  lines.push("=".repeat(60));

  lines.push(`Status: ${report.isConsistent ? "CONSISTENT" : "INCONSISTENT"}`);
  lines.push("");

  if (report.discrepancies.length > 0) {
    lines.push("DISCREPANCIES:");
    for (const disc of report.discrepancies) {
      lines.push(`  ${disc.path}`);
      lines.push(`    c12: ${_formatValue(disc.c12Value)}`);
      lines.push(`    RDF: ${_formatValue(disc.rdfValue)}`);
      lines.push(`    Reason: ${disc.reason}`);
    }
    lines.push("");
  }

  if (report.onlyInC12.length > 0) {
    lines.push("ONLY IN C12 CONFIG:");
    for (const item of report.onlyInC12) {
      lines.push(`  ${item.path}: ${_formatValue(item.value)}`);
    }
    lines.push("");
  }

  if (report.onlyInRDF.length > 0) {
    lines.push("ONLY IN RDF CONFIG:");
    for (const item of report.onlyInRDF) {
      lines.push(`  ${item.path}: ${_formatValue(item.value)}`);
    }
    lines.push("");
  }

  if (report.typeConflicts.length > 0) {
    lines.push("TYPE CONFLICTS:");
    for (const conflict of report.typeConflicts) {
      lines.push(`  ${conflict.path}`);
      lines.push(
        `    c12: ${conflict.c12Type} = ${_formatValue(conflict.c12Value)}`
      );
      lines.push(
        `    RDF: ${conflict.rdfType} = ${_formatValue(conflict.rdfValue)}`
      );
    }
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("WARNINGS & SUGGESTIONS:");
    for (const warning of report.warnings) {
      lines.push(`  [${warning.type}] ${warning.path}`);
      lines.push(`    ${warning.message}`);
      lines.push(`    Suggestion: ${warning.suggestion}`);
    }
    lines.push("");
  }

  if (report.isConsistent) {
    lines.push("✓ No inconsistencies detected");
  } else {
    lines.push(
      `✗ Found ${report.discrepancies.length} discrepancies, ${report.onlyInC12.length} c12-only, ${report.onlyInRDF.length} RDF-only items`
    );
  }

  lines.push("=".repeat(60));

  return lines.join("\n");
}

/**
 * Format value for display
 * @private
 */
function _formatValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
