```javascript
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Handle push events from Git repositories", 
    tags: ["git", "push", "webhook"]
  },
  on: {
    push: true
  },
  async run({ ctx, payload, meta }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    const { repository, commits, pusher } = payload
    
    console.log(`Received push event for ${repository.name}`)
    console.log(`Pushed by: ${pusher.name}`)
    console.log(`Number of commits: ${commits.length}`)
    
    // Get the latest commit
    const latestCommit = commits[0]
    if (latestCommit) {
      console.log(`Latest commit: ${latestCommit.id.slice(0, 7)} - ${latestCommit.message}`)
    }
    
    // Perform git operations
    try {
      // Fetch latest changes
      await git.fetch()
      
      // Get current branch
      const currentBranch = await git.branch()
      console.log(`Current branch: ${currentBranch}`)
      
      // Create a deployment template if needed
      const deploymentTemplate = `
        Deployment triggered by push
        Repository: {{ repository.name }}
        Branch: {{ currentBranch }}
        Commit: {{ latestCommit.id }}
        Author: {{ latestCommit.author.name }}
        Message: {{ latestCommit.message }}
        Timestamp: {{ new Date().toISOString() }}
      `
      
      const renderedTemplate = await tpl.render(deploymentTemplate, {
        repository,
        currentBranch,
        latestCommit
      })
      
      console.log("Deployment template rendered:", renderedTemplate)
      
    } catch (error) {
      console.error("Error processing push event:", error)
      throw error
    }
    
    return { 
      ok: true, 
      artifacts: [
        {
          name: "push-event-info",
          content: JSON.stringify({
            repository: repository.name,
            branch: payload.ref.split('/').pop(),
            commits: commits.length,
            pusher: pusher.name,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ] 
    }
  }
})
```