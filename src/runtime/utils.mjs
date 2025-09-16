import { useGit } from '../composables/git.mjs'

/**
 * Get recent commit SHAs from current worktree HEAD
 */
export function recentShas(n = 10) {
  const git = useGit()
  try {
    const output = git.log('%H', `-n ${n}`)
    return output.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if event should fire for given commit
 */
export async function eventFires(eventDef, sha) {
  const git = useGit()

  try {
    // Get commit details
    const commitInfo = git.show(sha)
    const message = git.run(`log --format=%s -n 1 ${sha}`)
    const author = git.run(`log --format=%ae -n 1 ${sha}`)

    // Check if it's a merge commit
    const parents = git.run(`log --format=%P -n 1 ${sha}`).split(' ').filter(Boolean)
    const isMerge = parents.length > 1

    // Get changed files
    let changedPaths = []
    try {
      changedPaths = git.run(`diff-tree --no-commit-id --name-only -r ${sha}`).split('\n').filter(Boolean)
    } catch {
      // New root commit or other edge case
      changedPaths = []
    }

    // Get branch info
    let branch = ''
    try {
      branch = git.run(`name-rev --name-only ${sha}`).replace(/^remotes\/origin\//, '')
    } catch {
      branch = git.branch()
    }

    // Check for tag
    let isTag = false
    let tag = ''
    try {
      tag = git.run(`describe --tags --exact-match ${sha}`)
      isTag = true
    } catch {
      // Not a tagged commit
    }

    const context = {
      sha,
      message,
      author,
      isMerge,
      isPush: false, // Will be set by push hook
      isTag,
      tag,
      branch,
      changedPaths,
      targetBranch: isMerge ? extractTargetBranch(message) : null
    }

    // Import event matching logic
    const { eventMatches } = await import('./events.mjs')
    return eventMatches(eventDef, context)

  } catch (err) {
    console.warn(`Error checking if event fires for ${sha}:`, err.message)
    return false
  }
}

/**
 * Extract target branch from merge commit message
 */
function extractTargetBranch(message) {
  // Try to parse "Merge branch 'feature' into main"
  const mergeMatch = message.match(/Merge .*?into (\w+)/)
  if (mergeMatch) {
    return mergeMatch[1]
  }

  // Try to parse "Merge pull request #123 from feature into main"
  const prMatch = message.match(/into (\w+)/)
  if (prMatch) {
    return prMatch[1]
  }

  return null
}

/**
 * Get worktree information
 */
export function getWorktreeInfo() {
  const git = useGit()

  return {
    id: git.worktreeId(),
    path: git.worktreeRoot,
    branch: git.branch(),
    head: git.head()
  }
}

/**
 * Check if commit exists in repository
 */
export function commitExists(sha) {
  const git = useGit()
  try {
    git.run(`cat-file -e ${sha}`)
    return true
  } catch {
    return false
  }
}

/**
 * Parse cron expression (basic validation)
 */
export function isValidCron(expression) {
  if (!expression || typeof expression !== 'string') return false

  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return false

  // Basic validation - each part should be valid cron field
  const patterns = [
    /^(\*|([0-5]?\d)(,([0-5]?\d))*)$/, // minute
    /^(\*|([01]?\d|2[0-3])(,([01]?\d|2[0-3]))*)$/, // hour
    /^(\*|([12]?\d|3[01])(,([12]?\d|3[01]))*)$/, // day
    /^(\*|([0-9]|1[0-2])(,([0-9]|1[0-2]))*)$/, // month
    /^(\*|[0-6](,[0-6])*)$/ // day of week
  ]

  return parts.every((part, i) => patterns[i].test(part))
}

/**
 * Format duration in human readable form
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Truncate text to specified length
 */
export function truncate(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}