/**
 * GitVan Unrouting - Simple File-Based Job Router
 * 80/20 implementation: Route file changes to jobs using unrouting patterns
 */

import { parsePath, toRegExp } from "unrouting";
import { useGitVan } from "../core/context.mjs";

export function useUnrouting() {
  const ctx = useGitVan();
  const cwd = ctx?.cwd || process.cwd();

  return {
    /**
     * Parse file path and extract segments
     */
    parsePath(filePath) {
      return parsePath(filePath);
    },

    /**
     * Match file against pattern and extract parameters
     */
    matchPattern(pattern, filePath) {
      const regex = toRegExp(pattern);
      // Add leading slash if not present (unrouting expects paths to start with /)
      const normalizedPath = filePath.startsWith("/")
        ? filePath
        : `/${filePath}`;
      const match = normalizedPath.match(regex);

      if (!match) return null;

      return {
        params: match.groups || {},
        filePath,
        pattern,
      };
    },

    /**
     * Route file changes to jobs
     */
    routeFiles(changedFiles, routes) {
      const jobQueue = [];

      for (const filePath of changedFiles) {
        // First-match-wins: stop at first matching route
        for (const route of routes) {
          const match = this.matchPattern(route.pattern, filePath);
          if (match) {
            // Extract parameters and bind to job payload
            const payload = this.bindPayload(
              route.job.with || {},
              match.params,
              filePath
            );

            jobQueue.push({
              name: route.job.name,
              payload,
              filePath,
              routeId: route.id,
            });

            // First-match-wins: break after first match
            break;
          }
        }
      }

      return jobQueue;
    },

    /**
     * Bind parameters to job payload
     */
    bindPayload(template, params, filePath) {
      const payload = {};

      for (const [key, value] of Object.entries(template)) {
        if (typeof value === "string") {
          // Replace parameter placeholders
          let boundValue = value
            .replace(/:__file/g, filePath)
            .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
              return params[paramName] || match;
            });

          payload[key] = boundValue;
        } else {
          payload[key] = value;
        }
      }

      return payload;
    },
  };
}
