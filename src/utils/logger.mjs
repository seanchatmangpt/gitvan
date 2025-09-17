/**
 * GitVan v2 Logger - Simple, tagged console logger with configurable levels
 * Supports environment-based log level configuration
 */

const LVL = (process.env.GITVAN_LOG_LEVEL || "info").toLowerCase();
const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

/**
 * Create a tagged logger instance
 * @param {string} tag - Logger tag/namespace
 * @returns {object} Logger instance with level-aware methods
 */
export function createLogger(tag = "gitvan") {
  const cur = LEVELS[LVL] ?? 3;
  const fmt = (lvl, ...a) => console[lvl](`[${tag}]`, ...a);
  
  return {
    level: LVL,
    error: (...a) => cur >= 1 && fmt("error", ...a),
    warn: (...a) => cur >= 2 && fmt("warn", ...a),
    info: (...a) => cur >= 3 && fmt("log", ...a),
    debug: (...a) => cur >= 4 && fmt("log", ...a),
    child(sub) { 
      return createLogger(`${tag}:${sub}`); 
    }
  };
}

// Default logger instance
export const logger = createLogger();

