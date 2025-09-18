import { readdirSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'pathe'

/**
 * Discovers hooks by scanning the hooks/ directory
 * Maps filesystem paths to hook patterns and triggers
 */
export function discoverHooks(hooksDir) {
  const hooks = []

  if (!hooksDir) return hooks

  // Check if hooks directory exists and is accessible
  try {
    const stat = statSync(hooksDir)
    if (!stat.isDirectory()) return hooks
  } catch {
    return hooks
  }

  try {
    scanDirectory(hooksDir, '', hooks)
  } catch (err) {
    // Hooks directory doesn't exist or isn't readable
    return hooks
  }

  return hooks
}

// Backward compatibility
export const discoverEvents = discoverHooks

function scanDirectory(baseDir, relativePath, hooks) {
  const fullPath = join(baseDir, relativePath)

  try {
    const entries = readdirSync(fullPath)

    for (const entry of entries) {
      const entryPath = join(fullPath, entry)
      const relativeEntryPath = relativePath ? join(relativePath, entry) : entry

      if (statSync(entryPath).isDirectory()) {
        scanDirectory(baseDir, relativeEntryPath, hooks)
      } else if (extname(entry) === '.mjs') {
        const hookPattern = parseHookPath(relativeEntryPath)
        if (hookPattern) {
          hooks.push({
            id: relativeEntryPath.replace(/\.mjs$/, ''),
            file: entryPath,
            ...hookPattern
          })
        }
      }
    }
  } catch (err) {
    // Directory not readable, skip
  }
}

/**
 * Parse hook file path into trigger pattern
 */
function parseHookPath(relativePath) {
  const parts = relativePath.replace(/\.mjs$/, '').split('/')

  if (parts.length < 2) return null

  const [category, ...pathParts] = parts
  const pattern = pathParts.join('/')

  switch (category) {
    case 'cron':
      // cron/0_3_*_*_*.mjs -> "0 3 * * *"
      return {
        type: 'cron',
        pattern: pattern.replace(/_/g, ' ')
      }

    case 'merge-to':
      // merge-to/main.mjs -> branch "main"
      return {
        type: 'merge',
        pattern: pattern,
        branch: pattern
      }

    case 'push-to':
      // push-to/release/*.mjs -> branch pattern "release/*"
      return {
        type: 'push',
        pattern: pattern,
        branch: pattern
      }

    case 'path-changed':
      // path-changed/src/[...slug].mjs -> path pattern "src/**"
      const pathPattern = pattern
        .replace(/\[\.\.\.(\w+)\]/g, '**') // [...slug] -> **
        .replace(/\[(\w+)\]/g, '*')       // [name] -> *
      return {
        type: 'path',
        pattern: pathPattern
      }

    case 'tag':
      // tag/semver.mjs -> tag pattern
      return {
        type: 'tag',
        pattern: pattern
      }

    case 'message':
      // message/^release:/.mjs -> commit message regex
      return {
        type: 'message',
        pattern: pattern,
        regex: new RegExp(pattern.replace(/^\/|\/$/g, ''))
      }

    case 'author':
      // author/@company\.com/.mjs -> author email regex
      return {
        type: 'author',
        pattern: pattern,
        regex: new RegExp(pattern.replace(/^\/|\/$/g, ''))
      }

    default:
      return {
        type: 'custom',
        category,
        pattern
      }
  }
}

// Backward compatibility
export const parseEventPath = parseHookPath

/**
 * Load hook definition from file
 */
export async function loadHookDefinition(hookFile) {
  try {
    const module = await import(hookFile)
    return module.default || module
  } catch (err) {
    console.warn(`Failed to load hook file ${hookFile}:`, err.message)
    return null
  }
}

// Backward compatibility
export const loadEventDefinition = loadHookDefinition

/**
 * Check if hook fires for given commit context
 */
export function hookMatches(hook, context) {
  const { type, pattern, regex, branch } = hook

  switch (type) {
    case 'cron':
      // Cron hooks are handled by scheduler, not commit-based
      return false

    case 'merge':
      return context.isMerge && context.targetBranch === branch

    case 'push':
      return context.isPush && matchesPattern(context.branch, branch)

    case 'path':
      return context.changedPaths?.some(path => matchesPattern(path, pattern))

    case 'tag':
      return context.isTag && matchesTagPattern(context.tag, pattern)

    case 'message':
      return regex && regex.test(context.message || '')

    case 'author':
      return regex && regex.test(context.author || '')

    default:
      return false
  }
}

// Backward compatibility
export const eventMatches = hookMatches

function matchesPattern(value, pattern) {
  if (!pattern || !value) return false

  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')        // ** matches everything
    .replace(/\*/g, '[^/]*')       // * matches anything except /
    .replace(/\?/g, '[^/]')        // ? matches single char except /

  return new RegExp(`^${regexPattern}$`).test(value)
}

function matchesTagPattern(tag, pattern) {
  if (pattern === 'semver') {
    // Semantic versioning pattern
    return /^v?\d+\.\d+\.\d+/.test(tag)
  }

  return matchesPattern(tag, pattern)
}