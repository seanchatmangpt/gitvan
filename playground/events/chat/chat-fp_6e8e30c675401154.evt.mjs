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
    
    const { 
      repository, 
      pusher, 
      commits, 
      ref 
    } = payload
    
    console.log(`Received push event for ${repository.name}`)
    console.log(`Pushed by: ${pusher.name}`)
    console.log(`Branch: ${ref}`)
    console.log(`Commits: ${commits.length}`)
    
    // Get the latest commit
    const latestCommit = commits[0]
    if (latestCommit) {
      console.log(`Latest commit: ${latestCommit.id.substring(0, 7)} - ${latestCommit.message}`)
    }
    
    // Check if this is a branch creation
    const isBranchCreation = ref.startsWith('refs/heads/')
    if (isBranchCreation) {
      const branchName = ref.replace('refs/heads/', '')
      console.log(`New branch created: ${branchName}`)
    }
    
    // Check if this is a tag push
    const isTagPush = ref.startsWith('refs/tags/')
    if (isTagPush) {
      const tagName = ref.replace('refs/tags/', '')
      console.log(`Tag pushed: ${tagName}`)
    }
    
    // Example: Create a simple report template
    const reportTemplate = `
# Push Event Report

## Repository
{{ repository.name }}

## Push Details
- **Branch:** {{ branch }}
- **Author:** {{ pusher.name }}
- **Commit Count:** {{ commits.length }}

## Latest Commit
- **Message:** {{ latestCommit.message }}
- **Author:** {{ latestCommit.author.name }}
- **Timestamp:** {{ latestCommit.timestamp }}

## Files Changed
{{#each files}}
- {{ this }}
{{/each}}

## Artifacts Generated
- Build logs
- Deployment status
`
    
    // Render the template with data
    const report = await tpl.render(reportTemplate, {
      repository,
      pusher,
      commits,
      ref,
      branch: ref.replace('refs/heads/', ''),
      latestCommit: commits[0],
      files: commits.flatMap(commit => commit.added.concat(commit.modified, commit.removed))
    })
    
    console.log("Generated report:", report)
    
    return { 
      ok: true, 
      artifacts: [
        {
          name: "push-report.md",
          content: report
        }
      ] 
    }
  }
})
```