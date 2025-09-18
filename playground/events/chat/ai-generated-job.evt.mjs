import { defineJob } from 'gitvan/index.js'

export default defineJob({
  meta: {
    name: 'push-event-handler',
    description: 'Handles push events to branch and performs automated actions',
    version: '1.0.0',
    author: 'GitVan Automation'
  },
  
  on: {
    push: 'refs/heads/*'
  },

  async run({ ctx, payload, meta }) {
    const git = useGit()
    const notes = useNotes()
    const receipt = useReceipt()
    const lock = useLock()
    
    // Destructure methods
    const { 
      writeFile, 
      add, 
      commit,
      getBranchName,
      getCommitMessage,
      getAuthorName,
      getAuthorEmail,
      getCurrentCommitHash
    } = git
    
    const { write: writeNote } = notes
    const { write: writeReceipt } = receipt
    const { acquire: acquireLock, release: releaseLock } = lock
    
    const startTime = Date.now()
    const branchName = getBranchName()
    
    // Prevent concurrent execution
    if (await checkLocked("push-event-handler")) {
      return { 
        ok: false, 
        error: "Push event handler already running", 
        artifacts: [] 
      }
    }
    
    await acquireLock("push-event-handler")
    
    try {
      // Write audit note
      await writeNote(`Push event received for branch: ${branchName}`)
      
      // Get commit details
      const commitHash = getCurrentCommitHash()
      const commitMessage = getCommitMessage()
      const authorName = getAuthorName()
      const authorEmail = getAuthorEmail()
      
      // Generate report file
      const reportContent = `
Push Event Report
=================
Branch: ${branchName}
Commit Hash: ${commitHash}
Commit Message: ${commitMessage}
Author: ${authorName} <${authorEmail}>
Timestamp: ${new Date().toISOString()}
`
      
      // Write the report to a file
      await writeFile('push-report.txt', reportContent)
      
      // Add and commit the report file
      await add(['push-report.txt'])
      await commit(`Automated report for push to ${branchName}`)
      
      // Track job result
      await writeReceipt({
        status: 'success',
        artifacts: ['push-report.txt'],
        duration: Date.now() - startTime,
        metadata: {
          branch: branchName,
          commitHash: commitHash,
          author: authorName
        }
      })
      
      return {
        ok: true,
        artifacts: ['push-report.txt'],
        summary: `Push event handled successfully for branch ${branchName}`,
        metadata: {
          branch: branchName,
          commitHash: commitHash,
          author: authorName
        }
      }
      
    } catch (error) {
      console.error('Push event handler failed:', error)
      
      // Track failure
      await writeReceipt({
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      })
      
      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: 'Push event handler failed'
      }
    } finally {
      await releaseLock("push-event-handler")
    }
  }
})