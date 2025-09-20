import { defineJob } from 'gitvan';

export default defineJob({
  meta: {
    name: "push-event-handler",
    description: "Handles push events to perform automated actions",
    version: "1.0.0"
  },
  
  on: {
    push: "refs/heads/*"
  },

  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const receipt = useReceipt();
      const notes = useNotes();
      const lock = useLock();
      
      // Destructure methods
      const { 
        writeFile, 
        add, 
        commit,
        getBranchName,
        getCommitMessage,
        getAuthorName,
        getAuthorEmail
      } = git;
      
      const { write: writeReceipt } = receipt;
      const { write: writeNote } = notes;
      const { acquire: acquireLock, release: releaseLock } = lock;
      
      // Acquire lock to prevent concurrent execution
      if (await checkLocked("push-handler")) {
        return { 
          ok: false, 
          error: "Push handler already running", 
          artifacts: [] 
        };
      }
      
      await acquireLock("push-handler");
      
      try {
        // Get information about the push event
        const branchName = await getBranchName();
        const commitMessage = await getCommitMessage();
        const authorName = await getAuthorName();
        const authorEmail = await getAuthorEmail();
        
        // Log the event
        await writeNote(`Push to branch: ${branchName}`);
        await writeNote(`Commit message: ${commitMessage}`);
        await writeNote(`Author: ${authorName} <${authorEmail}>`);
        
        // Create a summary file with push details
        const summaryContent = `
Push Event Summary
==================
Branch: ${branchName}
Commit Message: ${commitMessage}
Author: ${authorName} <${authorEmail}>
Timestamp: ${new Date().toISOString()}
        `.trim();
        
        await writeFile("push-summary.txt", summaryContent);
        await add(["push-summary.txt"]);
        
        // Commit the summary file
        await commit(`Document push to ${branchName}`);
        
        // Track the successful execution
        const result = {
          status: "success",
          artifacts: ["push-summary.txt"],
          duration: 1000, // Simulated duration
          branch: branchName,
          commitMessage: commitMessage
        };
        
        await writeReceipt(result);
        
        return { 
          ok: true, 
          artifacts: ["push-summary.txt"], 
          summary: "Push event handled successfully",
          metadata: {
            branch: branchName,
            commitMessage: commitMessage
          }
        };
      } finally {
        await releaseLock("push-handler");
      }
    } catch (error) {
      console.error('Push handler failed:', error.message);
      
      // Track the failure
      const receipt = useReceipt();
      const { write: writeReceipt } = receipt;
      
      await writeReceipt({
        status: "error",
        error: error.message,
        duration: 1000
      });
      
      return { 
        ok: false, 
        error: error.message, 
        artifacts: [],
        summary: "Push event handler failed"
      };
    }
  }
});