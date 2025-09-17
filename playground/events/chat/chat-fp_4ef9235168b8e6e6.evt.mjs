import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Handle push events from Git repositories", 
    tags: ["git", "push", "event"]
  },
  on: {
    push: true
  },
  async run({ ctx, payload, meta }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const git = useGit()
    const tpl = await useTemplate()
    
    const { repository, commits, ref, pusher } = payload
    
    console.log(`Received push event for ${repository.name}`)
    console.log(`Branch: ${ref.replace('refs/heads/', '')}`)
    console.log(`Commits: ${commits.length}`)
    console.log(`Pushed by: ${pusher.name}`)
    
    // Get the latest commit
    const latestCommit = commits[0]
    if (latestCommit) {
      console.log(`Latest commit: ${latestCommit.id.substring(0, 7)} - ${latestCommit.message}`)
    }
    
    // Example: Create a deployment template
    const deploymentTemplate = `
      Deployment triggered for {{ repository.name }}
      Branch: {{ ref | replace('refs/heads/', '') }}
      Commit: {{ commits[0].id | truncate(7) }}
      Author: {{ pusher.name }}
      Message: {{ commits[0].message | truncate(50) }}
    `
    
    const renderedTemplate = await tpl.render(deploymentTemplate, {
      repository,
      ref,
      commits,
      pusher
    })
    
    console.log("Deployment template rendered:", renderedTemplate)
    
    // Example: Update deployment status
    try {
      await git.updateStatus({
        sha: latestCommit.id,
        state: "pending",
        description: "Deployment started"
      })
      
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      await git.updateStatus({
        sha: latestCommit.id,
        state: "success",
        description: "Deployment completed successfully"
      })
      
    } catch (error) {
      console.error("Deployment failed:", error)
      await git.updateStatus({
        sha: latestCommit.id,
        state: "failure",
        description: `Deployment failed: ${error.message}`
      })
    }
    
    return { 
      ok: true, 
      artifacts: [
        {
          name: "push-event-info",
          content: JSON.stringify({ repository, ref, commits, pusher }, null, 2)
        }
      ] 
    }
  }
})