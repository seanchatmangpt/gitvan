```javascript
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
    
    const { 
      ref, 
      commits, 
      repository, 
      pusher 
    } = payload
    
    console.log(`Received push event on branch: ${ref}`)
    console.log(`Repository: ${repository.name}`)
    console.log(`Pushed by: ${pusher.name}`)
    
    // Get latest commit info
    const latestCommit = commits[0]
    if (latestCommit) {
      console.log(`Latest commit: ${latestCommit.id.substring(0, 7)} - ${latestCommit.message}`)
    }
    
    // Create a simple commit summary template
    const commitSummary = await tpl.render(`
      Push Event Summary:
      ==================
      Repository: {{ repository.name }}
      Branch: {{ ref }}
      Pushed by: {{ pusher.name }} ({{ pusher.email }})
      Commits: {{ commits.length }}
      Latest commit: {{ latestCommit.id.substring(0, 7) }}
      Commit message: {{ latestCommit.message }}
    `, {
      repository,
      ref,
      pusher,
      commits,
      latestCommit
    })
    
    console.log(commitSummary)
    
    // Example: Update a status file with push information
    const statusFile = '.gitvan/push-event.json'
    await git.writeFile(statusFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      repository: repository.name,
      branch: ref,
      pusher: pusher.name,
      commitCount: commits.length,
      latestCommit: latestCommit?.id
    }, null, 2))
    
    return { 
      ok: true, 
      artifacts: [
        {
          name: 'push-event-summary',
          content: commitSummary
        },
        {
          name: 'push-event-status',
          path: statusFile
        }
      ] 
    }
  }
})
```