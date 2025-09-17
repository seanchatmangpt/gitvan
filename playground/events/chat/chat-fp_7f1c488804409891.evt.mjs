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
    
    console.log(`Received push event for repository: ${repository.name}`)
    console.log(`Pushed by: ${pusher.name}`)
    console.log(`Number of commits: ${commits.length}`)
    
    // Get the latest commit
    const latestCommit = commits[0]
    if (latestCommit) {
      console.log(`Latest commit: ${latestCommit.id.substring(0, 7)} - ${latestCommit.message}`)
    }
    
    // Example: Create a deployment artifact
    const artifact = {
      name: `push-${Date.now()}`,
      type: 'deployment',
      data: {
        repository: repository.name,
        branch: payload.ref.replace('refs/heads/', ''),
        commit: latestCommit?.id,
        author: pusher.name,
        timestamp: new Date().toISOString()
      }
    }
    
    return { 
      ok: true, 
      artifacts: [artifact] 
    }
  }
})