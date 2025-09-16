import { useGit } from '../composables/git.mjs'

/**
 * Write execution receipt to git notes
 */
export function writeReceipt(data) {
  const {
    resultsRef = 'refs/notes/gitvan/results',
    id,
    status,
    commit,
    action = 'job',
    result,
    artifact,
    meta = {}
  } = data

  const receipt = {
    role: 'receipt',
    id,
    status,
    ts: new Date().toISOString(),
    commit,
    action,
    artifact,
    meta: {
      ...meta,
      duration: result?.duration,
      exitCode: result?.exitCode
    }
  }

  // Include result details if available
  if (result) {
    if (result.stdout) receipt.stdout = result.stdout
    if (result.stderr) receipt.stderr = result.stderr
    if (result.error) receipt.error = result.error
  }

  const git = useGit()
  const receiptJson = JSON.stringify(receipt, null, 2)

  try {
    // Try to append to existing notes first
    git.noteAppend(resultsRef, receiptJson, commit)
  } catch {
    // If no existing note, create new one
    try {
      git.noteAdd(resultsRef, receiptJson, commit)
    } catch (err) {
      console.warn(`Failed to write receipt for ${id}:`, err.message)
    }
  }
}

/**
 * Read receipts for a commit
 */
export function readReceipts(commit = 'HEAD', resultsRef = 'refs/notes/gitvan/results') {
  const git = useGit()

  try {
    const notesContent = git.noteShow(resultsRef, commit)
    const receipts = []

    // Split on receipt boundaries and parse each
    const receiptTexts = notesContent.split(/(?=\{[^}]*"role":\s*"receipt")/g)

    for (const receiptText of receiptTexts) {
      const trimmed = receiptText.trim()
      if (!trimmed) continue

      try {
        const receipt = JSON.parse(trimmed)
        if (receipt.role === 'receipt') {
          receipts.push(receipt)
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    return receipts
  } catch {
    // No notes found
    return []
  }
}

/**
 * Get all receipts for a range of commits
 */
export function readReceiptsRange(range = '-n 10', resultsRef = 'refs/notes/gitvan/results') {
  const git = useGit()
  const commits = git.log('%H', range).split('\n').filter(Boolean)
  const allReceipts = []

  for (const commit of commits) {
    const receipts = readReceipts(commit, resultsRef)
    allReceipts.push(...receipts.map(r => ({ ...r, commit })))
  }

  return allReceipts.sort((a, b) => new Date(b.ts) - new Date(a.ts))
}

/**
 * Check if event has already been processed for commit
 */
export function hasReceipt(eventId, commit = 'HEAD', resultsRef = 'refs/notes/gitvan/results') {
  const receipts = readReceipts(commit, resultsRef)
  return receipts.some(r => r.id === eventId)
}

/**
 * Get receipt status for event and commit
 */
export function getReceiptStatus(eventId, commit = 'HEAD', resultsRef = 'refs/notes/gitvan/results') {
  const receipts = readReceipts(commit, resultsRef)
  const receipt = receipts.find(r => r.id === eventId)
  return receipt?.status || null
}