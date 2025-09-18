/**
 * GitVan Unrouting - Path Parser
 * Converts unrouting patterns to regex and extracts parameters
 */

/**
 * Convert unrouting pattern to regex
 * Supports:
 * - Named parameters: [slug] -> (?<slug>[^/]+)
 * - Catchall parameters: [...artifact] -> (?<artifact>.*)
 * - Named views: @view -> @(?<view>[^.]+)
 * - File extensions: .mdx -> \.mdx
 */
export function toRegExp(pattern) {
  // Escape special regex characters except our pattern syntax
  let regex = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\[\\\.\\\.\\\.([^\]]+)\\\]/g, "(?<$1>.*)") // [...param] -> catchall
    .replace(/\\\[([^\]]+)\\\]/g, "(?<$1>[^/]+)") // [param] -> named param
    .replace(/\\@([^.]+)/g, "@(?<$1>[^.]+)") // @view -> named view
    .replace(/\\\./g, "\\."); // escape dots for extensions

  return new RegExp(`^${regex}$`);
}

/**
 * Parse file path against pattern and extract parameters
 * @param {string} pattern - Unrouting pattern (e.g., "pitch/[slug]/script.mdx")
 * @param {string} filePath - File path to match (e.g., "pitch/acme/script.mdx")
 * @returns {object|null} - Parameters object or null if no match
 */
export function parsePath(pattern, filePath) {
  const regex = toRegExp(pattern);
  const match = filePath.match(regex);

  if (!match) return null;

  const params = { ...match.groups };

  // Handle catchall parameters (convert to array)
  for (const [key, value] of Object.entries(params)) {
    if (value && value.includes("/")) {
      params[key] = value.split("/").filter(Boolean);
    }
  }

  return params;
}

/**
 * Bind parameters to job payload template
 * @param {object} template - Job payload template with :param placeholders
 * @param {object} params - Extracted parameters
 * @param {string} filePath - Original file path
 * @returns {object} - Bound payload
 */
export function bindPayload(template, params, filePath) {
  const payload = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === "string") {
      // Replace parameter placeholders
      let boundValue = value
        .replace(/:__file/g, filePath)
        .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
          const paramValue = params[paramName];
          // Handle array parameters (from catchall)
          if (Array.isArray(paramValue)) {
            return paramValue.join("/");
          }
          return paramValue || match;
        });

      payload[key] = boundValue;
    } else {
      payload[key] = value;
    }
  }

  return payload;
}

/**
 * Compile routes registry for efficient matching
 * @param {Array} routes - Routes registry array
 * @returns {Array} - Compiled routes with regex patterns
 */
export function compileRoutes(routes) {
  return routes.map((route) => ({
    ...route,
    regex: toRegExp(route.pattern),
  }));
}

/**
 * Match file against compiled routes
 * @param {string} filePath - File path to match
 * @param {Array} compiledRoutes - Compiled routes registry
 * @returns {object|null} - First matching route with parameters
 */
export function matchRoute(filePath, compiledRoutes) {
  for (const route of compiledRoutes) {
    const match = filePath.match(route.regex);
    if (match) {
      const params = { ...match.groups };

      // Handle catchall parameters (convert to array)
      for (const [key, value] of Object.entries(params)) {
        if (value && typeof value === "string" && value.includes("/")) {
          params[key] = value.split("/").filter(Boolean);
        }
      }

      return {
        route,
        params,
        filePath,
      };
    }
  }

  return null;
}

/**
 * Process changed files and generate job queue
 * @param {Array} changedFiles - List of changed file paths
 * @param {Array} compiledRoutes - Compiled routes registry
 * @returns {Array} - Deduplicated job queue
 */
export function processFiles(changedFiles, compiledRoutes) {
  const jobQueue = [];
  const seen = new Set();

  for (const filePath of changedFiles) {
    const match = matchRoute(filePath, compiledRoutes);
    if (!match) continue;

    const { route, params } = match;

    for (const jobSpec of route.jobs) {
      const payload = bindPayload(jobSpec.with || {}, params, filePath);

      // Create batch key for deduplication
      const batchKey = route.batchKey
        ? route.batchKey.replace(
            /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
            (match, paramName) => {
              return params[paramName] || match;
            }
          )
        : filePath;

      const jobKey = `${jobSpec.name}:${batchKey}`;

      if (!seen.has(jobKey)) {
        seen.add(jobKey);
        jobQueue.push({
          name: jobSpec.name,
          payload,
          batchKey,
          routeId: route.id,
          filePath,
        });
      }
    }
  }

  return jobQueue;
}
