import { existsSync } from 'node:fs'
import { join } from 'pathe'

/**
 * Default GitVan configuration
 */
const DEFAULT_CONFIG = {
  debug: false,
  notesRef: 'refs/notes/gitvan',
  resultsRef: 'refs/notes/gitvan/results',
  locksRoot: 'refs/gitvan/locks',
  runsRoot: 'refs/gitvan/runs',
  scheduleRoot: 'refs/gitvan/schedule',
  daemon: {
    pollMs: 1500,
    lookback: 600,
    maxPerTick: 50
  },
  llm: {
    provider: 'ollama',
    baseURL: 'http://127.0.0.1:11434'
  },
  events: {
    directory: 'events'
  },
  jobs: {
    directory: 'jobs'
  },
  templates: {
    directory: 'templates'
  }
}

/**
 * Load configuration from gitvan.config.js if it exists
 * Merges with defaults
 */
export async function loadConfig(rootDir = process.cwd()) {
  const configPath = join(rootDir, 'gitvan.config.js')
  let userConfig = {}

  if (existsSync(configPath)) {
    try {
      const configModule = await import(configPath)
      userConfig = configModule.default || configModule

      if (typeof userConfig === 'function') {
        // Support defineConfig pattern
        userConfig = userConfig()
      }
    } catch (err) {
      console.warn(`Error loading config from ${configPath}:`, err.message)
      userConfig = {}
    }
  }

  return mergeConfig(DEFAULT_CONFIG, userConfig)
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(defaults, user) {
  const result = { ...defaults }

  for (const [key, value] of Object.entries(user)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeConfig(defaults[key] || {}, value)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Helper function for defineConfig pattern
 */
export function defineConfig(config) {
  return config
}

/**
 * Get config value with dot notation path
 */
export function getConfigValue(config, path, defaultValue = undefined) {
  const keys = path.split('.')
  let current = config

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return defaultValue
    }
  }

  return current
}

/**
 * Validate configuration structure
 */
export function validateConfig(config) {
  const errors = []

  // Check required refs
  if (!config.notesRef || typeof config.notesRef !== 'string') {
    errors.push('notesRef must be a non-empty string')
  }

  if (!config.resultsRef || typeof config.resultsRef !== 'string') {
    errors.push('resultsRef must be a non-empty string')
  }

  if (!config.locksRoot || typeof config.locksRoot !== 'string') {
    errors.push('locksRoot must be a non-empty string')
  }

  // Check daemon config
  if (config.daemon) {
    if (typeof config.daemon.pollMs !== 'number' || config.daemon.pollMs < 100) {
      errors.push('daemon.pollMs must be a number >= 100')
    }

    if (typeof config.daemon.lookback !== 'number' || config.daemon.lookback < 1) {
      errors.push('daemon.lookback must be a number >= 1')
    }

    if (typeof config.daemon.maxPerTick !== 'number' || config.daemon.maxPerTick < 1) {
      errors.push('daemon.maxPerTick must be a number >= 1')
    }
  }

  return errors
}